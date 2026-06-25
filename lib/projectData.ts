export const METRICS = {
  accuracy: 0.8814,
  precision: 0.8364,
  recall: 0.9933,
  f1: 0.9087,
  trainingMinutes: 17.92,
  trainImages: 1_060_132,
  valImages: 331_570,
  epochs: 5,
} as const;

export const ARCHITECTURE = [
  "Conv2D(32) + MaxPooling",
  "Conv2D(64) + MaxPooling",
  "Conv2D(128) + MaxPooling",
  "Flatten + Dense(128) + Dropout(0.5)",
  "Dense(1, sigmoid) — binario",
] as const;

export const DATASET_INFO = {
  name: "PKLot (Parking Lot Dataset)",
  source: "Kaggle — blanderbuss/parking-lot-dataset",
  trainDomains: "PUCPR, UFPR04",
  valDomain: "UFPR05",
  classes: ["Empty", "Occupied"],
  imageSize: "64×64 px",
  augmentation: ["Rotación ±10°", "Flip horizontal", "Brillo 0.8–1.2"],
} as const;
