import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "models", "parking");
const tf = await import("@tensorflow/tfjs");
await tf.setBackend("cpu");
await tf.ready();

const manifest = JSON.parse(fs.readFileSync(path.join(dir, "weights_manifest.json"), "utf8"));
const buffer = fs.readFileSync(path.join(dir, "weights.bin"));

const model = tf.sequential({
  layers: [
    tf.layers.conv2d({ inputShape: [64, 64, 3], filters: 32, kernelSize: 3, activation: "relu" }),
    tf.layers.maxPooling2d({ poolSize: 2 }),
    tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: "relu" }),
    tf.layers.maxPooling2d({ poolSize: 2 }),
    tf.layers.conv2d({ filters: 128, kernelSize: 3, activation: "relu" }),
    tf.layers.maxPooling2d({ poolSize: 2 }),
    tf.layers.flatten(),
    tf.layers.dense({ units: 128, activation: "relu" }),
    tf.layers.dropout({ rate: 0.5 }),
    tf.layers.dense({ units: 1, activation: "sigmoid" }),
  ],
});

const tensors = [];
let offset = 0;
for (const spec of manifest.weights) {
  const count = spec.shape.reduce((a, b) => a * b, 1);
  const slice = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + count * 4);
  tensors.push(tf.tensor(new Float32Array(slice), spec.shape));
  offset += count * 4;
}
model.setWeights(tensors);
tensors.forEach((t) => t.dispose());

const input = tf.zeros([1, 64, 64, 3]);
const out = model.predict(input);
console.log("LOAD OK — sample output:", (await out.data())[0]);
input.dispose();
out.dispose();
model.dispose();
