export type PredictionResult = {
  label: "Occupied" | "Empty";
  confidence: number;
  occupiedScore: number;
  engine: "cnn" | "unavailable";
};

type TfModule = typeof import("@tensorflow/tfjs");

let tfModule: TfModule | null = null;
let model: import("@tensorflow/tfjs").LayersModel | null = null;
let loadPromise: Promise<boolean> | null = null;

const MODEL_URL = "/models/parking/model.json";

async function getTf(): Promise<TfModule> {
  if (!tfModule) {
    tfModule = await import("@tensorflow/tfjs");
  }
  return tfModule;
}

export async function isCnnModelAvailable(): Promise<boolean> {
  try {
    const res = await fetch(MODEL_URL, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadCnnModel(): Promise<boolean> {
  if (model) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const available = await isCnnModelAvailable();
      if (!available) return false;

      const tf = await getTf();
      model = await tf.loadLayersModel(MODEL_URL);
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
