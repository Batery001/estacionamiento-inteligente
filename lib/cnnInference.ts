import type * as tf from "@tensorflow/tfjs";
import { createParkingCnn } from "@/lib/cnnArchitecture";

export type PredictionResult = {
  label: "Occupied" | "Empty";
  confidence: number;
  occupiedScore: number;
  engine: "cnn" | "unavailable";
};

type TfModule = typeof import("@tensorflow/tfjs");

let tfModule: TfModule | null = null;
let model: tf.LayersModel | null = null;
let loadPromise: Promise<boolean> | null = null;

const MANIFEST_URL = "/models/parking/weights_manifest.json";
const WEIGHTS_URL = "/models/parking/weights.bin";

async function getTf(): Promise<TfModule> {
  if (!tfModule) {
    tfModule = await import("@tensorflow/tfjs");
  }
  return tfModule;
}

export async function isCnnModelAvailable(): Promise<boolean> {
  try {
    const res = await fetch(MANIFEST_URL, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function loadWeightsIntoModel(
  tf: TfModule,
  parkingModel: tf.LayersModel,
): Promise<void> {
  const manifest = await fetch(MANIFEST_URL).then((r) => r.json());
  const buffer = await fetch(WEIGHTS_URL).then((r) => r.arrayBuffer());

  const tensors: tf.Tensor[] = [];
  let offset = 0;

  for (const spec of manifest.weights as { shape: number[] }[]) {
    const count = spec.shape.reduce((a, b) => a * b, 1);
    const byteLength = count * 4;
    const slice = buffer.slice(offset, offset + byteLength);
    tensors.push(tf.tensor(new Float32Array(slice), spec.shape));
    offset += byteLength;
  }

  parkingModel.setWeights(tensors);
  tensors.forEach((t) => t.dispose());
}

export async function loadCnnModel(): Promise<boolean> {
  if (model) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const available = await isCnnModelAvailable();
      if (!available) return false;

      const tf = await getTf();
      const parkingModel = createParkingCnn(tf);
      await loadWeightsIntoModel(tf, parkingModel);
      model = parkingModel;
      return true;
    } catch {
      model = null;
      return false;
    }
  })();

  return loadPromise;
}

export function isCnnLoaded(): boolean {
  return model !== null;
}

function preprocessImage(
  tf: TfModule,
  imageData: ImageData,
): import("@tensorflow/tfjs").Tensor4D {
  return tf.tidy(() => {
    const pixels = tf.browser.fromPixels(imageData);
    const resized = tf.image.resizeBilinear(pixels, [64, 64]);
    const normalized = resized.div(255.0);
    return normalized.expandDims(0) as import("@tensorflow/tfjs").Tensor4D;
  });
}

export async function predictWithCnn(file: File): Promise<PredictionResult> {
  const ready = await loadCnnModel();
  if (!ready || !model) {
    throw new Error("MODEL_NOT_LOADED");
  }

  const tf = await getTf();
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");

  ctx.drawImage(bitmap, 0, 0, 64, 64);
  const imageData = ctx.getImageData(0, 0, 64, 64);
  const input = preprocessImage(tf, imageData);

  const output = model.predict(input) as import("@tensorflow/tfjs").Tensor;
  const occupiedScore = (await output.data())[0];

  input.dispose();
  output.dispose();

  const label: PredictionResult["label"] =
    occupiedScore >= 0.5 ? "Occupied" : "Empty";
  const confidence =
    label === "Occupied" ? occupiedScore : 1 - occupiedScore;

  return {
    label,
    confidence,
    occupiedScore,
    engine: "cnn",
  };
}
