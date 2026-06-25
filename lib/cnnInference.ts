import type * as tf from "@tensorflow/tfjs";
import { createParkingCnn } from "@/lib/cnnArchitecture";
import {
  computeParkingGrid,
  type GridLayout,
} from "@/lib/detectAerial";
import {
  analyzeCellForVehicle,
  fuseAerialScores,
  AERIAL_OCCUPIED_THRESHOLD,
} from "@/lib/cellAnalysis";

export type PredictionResult = {
  label: "Occupied" | "Empty";
  confidence: number;
  occupiedScore: number;
  engine: "cnn" | "unavailable";
};

export type SlotDetection = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: "Occupied" | "Empty";
  confidence: number;
};

export type AerialResult = {
  slots: SlotDetection[];
  available: number;
  occupied: number;
  total: number;
  imageWidth: number;
  imageHeight: number;
  grid: GridLayout;
};

type TfModule = typeof import("@tensorflow/tfjs");

let tfModule: TfModule | null = null;
let model: tf.LayersModel | null = null;
let loadPromise: Promise<boolean> | null = null;

const MANIFEST_URL = "/models/parking/weights_manifest.json";
const WEIGHTS_URL = "/models/parking/weights.bin";
const BATCH_SIZE = 16;

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

function preprocessImageData(
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

function scoreToResult(
  occupiedScore: number,
  threshold = 0.5,
): Omit<PredictionResult, "engine"> {
  const label: PredictionResult["label"] =
    occupiedScore >= threshold ? "Occupied" : "Empty";
  const confidence =
    label === "Occupied" ? occupiedScore : 1 - occupiedScore;
  return { label, confidence, occupiedScore };
}

async function predictTensor(
  input: import("@tensorflow/tfjs").Tensor4D,
): Promise<number[]> {
  if (!model) throw new Error("MODEL_NOT_LOADED");
  const output = model.predict(input) as import("@tensorflow/tfjs").Tensor;
  const scores = Array.from(await output.data());
  input.dispose();
  output.dispose();
  return scores;
}

function cropCell(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  x: number,
  y: number,
  w: number,
  h: number,
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, x, y, w, h, 0, 0, 64, 64);
  return ctx.getImageData(0, 0, 64, 64);
}

export async function predictWithCnn(file: File): Promise<PredictionResult> {
  const ready = await loadCnnModel();
  if (!ready || !model) throw new Error("MODEL_NOT_LOADED");

  const tf = await getTf();
  const bitmap = await createImageBitmap(file);
  const imageData = cropCell(bitmap, bitmap.width, bitmap.height, 0, 0, bitmap.width, bitmap.height);
  const input = preprocessImageData(tf, imageData);
  const [score] = await predictTensor(input);
  return { ...scoreToResult(score), engine: "cnn" };
}

export async function predictAerialLot(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<AerialResult> {
  const ready = await loadCnnModel();
  if (!ready || !model) throw new Error("MODEL_NOT_LOADED");

  const tf = await getTf();
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const grid = computeParkingGrid(width, height);

  const cellW = grid.roiW / grid.cols;
  const cellH = grid.roiH / grid.rows;
  const cells: { x: number; y: number; w: number; h: number }[] = [];

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      cells.push({
        x: grid.marginX + col * cellW,
        y: grid.marginY + row * cellH,
        w: cellW,
        h: cellH,
      });
    }
  }

  const slots: SlotDetection[] = [];
  const total = cells.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batchCells = cells.slice(i, i + BATCH_SIZE);
    const cellImages = batchCells.map((c) =>
      cropCell(bitmap, width, height, c.x, c.y, c.w, c.h),
    );
    const batchTensors = cellImages.map((img) => preprocessImageData(tf, img));

    const batchInput = tf.concat(batchTensors) as import("@tensorflow/tfjs").Tensor4D;
    batchTensors.forEach((t) => t.dispose());

    const scores = await predictTensor(batchInput);

    batchCells.forEach((c, j) => {
      const visualScore = analyzeCellForVehicle(cellImages[j]);
      const fused = fuseAerialScores(scores[j], visualScore);
      const { label, confidence } = scoreToResult(
        fused,
        AERIAL_OCCUPIED_THRESHOLD,
      );
      slots.push({
        x: c.x,
        y: c.y,
        width: c.w,
        height: c.h,
        label,
        confidence,
      });
    });

    onProgress?.(Math.min(i + BATCH_SIZE, total), total);
  }

  const available = slots.filter((s) => s.label === "Empty").length;
  const occupied = slots.filter((s) => s.label === "Occupied").length;

  return {
    slots,
    available,
    occupied,
    total: slots.length,
    imageWidth: width,
    imageHeight: height,
    grid,
  };
}
