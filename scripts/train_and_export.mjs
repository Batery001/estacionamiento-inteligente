/**
 * Entrena la CNN y exporta a public/models/parking/ (sin Colab, sin tfjs-node)
 * Ejecutar: node scripts/train_and_export.mjs
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const EXPORT_DIR = path.join(ROOT, "public", "models", "parking");

async function saveModelToDisk(model, dir) {
  const tf = await import("@tensorflow/tfjs");
  await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      const weightData = artifacts.weightData;
      const buffer =
        weightData instanceof ArrayBuffer
          ? Buffer.from(weightData)
          : Buffer.concat(
              weightData.map((buf) => Buffer.from(buf instanceof ArrayBuffer ? buf : buf.buffer)),
            );

      const shard = "group1-shard1of1.bin";
      fs.writeFileSync(path.join(dir, shard), buffer);

      const modelJson = {
        format: "layers-model",
        generatedBy: "TensorFlow.js tfjs-layers v4.22.0",
        convertedBy: null,
        modelTopology: artifacts.modelTopology,
        weightsManifest: [{ paths: [shard], weights: artifacts.weightSpecs }],
      };

      fs.writeFileSync(
        path.join(dir, "model.json"),
        JSON.stringify(modelJson, null, 2),
      );

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: "JSON",
        },
      };
    }),
  );
}

function generateBatch(n, tf) {
  const xData = new Float32Array(n * 64 * 64 * 3);
  const yData = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const occupied = Math.random() > 0.5;
    yData[i] = occupied ? 1 : 0;
    const offset = i * 64 * 64 * 3;

    for (let r = 0; r < 64; r++) {
      for (let c = 0; c < 64; c++) {
        const idx = offset + (r * 64 + c) * 3;
        const asphalt = (40 + Math.random() * 35) / 255;
        xData[idx] = xData[idx + 1] = xData[idx + 2] = asphalt;

        if (r < 6 || r > 57 || c < 6 || c > 57) {
          xData[idx] = xData[idx + 1] = xData[idx + 2] = 0.75;
        }
      }
    }

    if (occupied) {
      const r0 = 18 + Math.floor(Math.random() * 12);
      const c0 = 16 + Math.floor(Math.random() * 12);
      const h = 16 + Math.floor(Math.random() * 10);
      const w = 20 + Math.floor(Math.random() * 12);
      for (let r = r0; r < Math.min(64, r0 + h); r++) {
        for (let c = c0; c < Math.min(64, c0 + w); c++) {
          const idx = offset + (r * 64 + c) * 3;
          const v = (10 + Math.random() * 25) / 255;
          xData[idx] = xData[idx + 1] = xData[idx + 2] = v;
        }
      }
    }
  }

  return {
    xs: tf.tensor4d(xData, [n, 64, 64, 3]),
    ys: tf.tensor2d(yData, [n, 1]),
  };
}

async function main() {
  const tf = await import("@tensorflow/tfjs");
  await tf.setBackend("cpu");
  await tf.ready();

  console.log("Construyendo CNN (arquitectura del notebook)...");
  const model = tf.sequential({
    layers: [
      tf.layers.conv2d({
        inputShape: [64, 64, 3],
        filters: 32,
        kernelSize: 3,
        activation: "relu",
      }),
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

  model.compile({
    optimizer: tf.train.adam(),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  console.log("Entrenando motor CNN embebido...");
  for (let epoch = 0; epoch < 15; epoch++) {
    const { xs, ys } = generateBatch(400, tf);
    const hist = await model.fit(xs, ys, { epochs: 1, batchSize: 40, verbose: 0 });
    const acc = hist.history.accuracy?.[0] ?? 0;
    console.log(`  Epoch ${epoch + 1}/15 — accuracy: ${(Number(acc) * 100).toFixed(1)}%`);
    xs.dispose();
    ys.dispose();
  }

  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  for (const f of fs.readdirSync(EXPORT_DIR)) {
    if (f.endsWith(".json") || f.endsWith(".bin")) {
      fs.unlinkSync(path.join(EXPORT_DIR, f));
    }
  }

  console.log(`Exportando a ${EXPORT_DIR}...`);
  await saveModelToDisk(model, EXPORT_DIR);
  console.log("CNN lista — la página la carga automáticamente.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
