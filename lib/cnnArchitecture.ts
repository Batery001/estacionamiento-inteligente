import type * as tf from "@tensorflow/tfjs";

/** Misma arquitectura que el notebook — definida en TF.js para carga directa. */
export function createParkingCnn(tfNs: typeof tf) {
  const model = tfNs.sequential({
    layers: [
      tfNs.layers.conv2d({
        inputShape: [64, 64, 3],
        filters: 32,
        kernelSize: 3,
        activation: "relu",
      }),
      tfNs.layers.maxPooling2d({ poolSize: 2 }),
      tfNs.layers.conv2d({ filters: 64, kernelSize: 3, activation: "relu" }),
      tfNs.layers.maxPooling2d({ poolSize: 2 }),
      tfNs.layers.conv2d({ filters: 128, kernelSize: 3, activation: "relu" }),
      tfNs.layers.maxPooling2d({ poolSize: 2 }),
      tfNs.layers.flatten(),
      tfNs.layers.dense({ units: 128, activation: "relu" }),
      tfNs.layers.dropout({ rate: 0.5 }),
      tfNs.layers.dense({ units: 1, activation: "sigmoid" }),
    ],
  });
  return model;
}
