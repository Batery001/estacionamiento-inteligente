import {
  predictWithCnn,
  predictAerialLot,
  type PredictionResult,
  type AerialResult,
} from "@/lib/cnnInference";

export type { PredictionResult, AerialResult };

export async function predictParkingSpot(file: File): Promise<PredictionResult> {
  return predictWithCnn(file);
}

export { predictAerialLot, loadCnnModel, isCnnLoaded, isCnnModelAvailable, getModelInfo } from "@/lib/cnnInference";
