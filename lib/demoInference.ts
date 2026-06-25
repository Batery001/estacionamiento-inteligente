import { predictWithCnn, type PredictionResult } from "@/lib/cnnInference";

export type { PredictionResult };

export async function predictParkingSpot(file: File): Promise<PredictionResult> {
  return predictWithCnn(file);
}

export { loadCnnModel, isCnnLoaded, isCnnModelAvailable } from "@/lib/cnnInference";
