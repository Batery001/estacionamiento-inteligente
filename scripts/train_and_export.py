"""
Entrena la CNN y exporta pesos compatibles con TF.js en la web.
"""
import json
import os
import struct

import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import Conv2D, Dense, Dropout, Flatten, MaxPooling2D
from tensorflow.keras.models import Sequential

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORT_DIR = os.path.join(ROOT, "public", "models", "parking")


def build_model() -> Sequential:
    return Sequential([
        Conv2D(32, (3, 3), activation="relu", input_shape=(64, 64, 3)),
        MaxPooling2D(pool_size=(2, 2)),
        Conv2D(64, (3, 3), activation="relu"),
        MaxPooling2D(pool_size=(2, 2)),
        Conv2D(128, (3, 3), activation="relu"),
        MaxPooling2D(pool_size=(2, 2)),
        Flatten(),
        Dense(128, activation="relu"),
        Dropout(0.5),
        Dense(1, activation="sigmoid"),
    ])


def generate_batch(n: int) -> tuple[np.ndarray, np.ndarray]:
    x = np.zeros((n, 64, 64, 3), dtype=np.float32)
    y = np.zeros((n, 1), dtype=np.float32)

    for i in range(n):
        occupied = np.random.rand() > 0.5
        y[i, 0] = 1.0 if occupied else 0.0
        base = np.random.uniform(35, 75, (64, 64, 3))
        x[i] = base
        x[i, 2:6, :, :] = 180
        x[i, -6:-2, :, :] = 180
        x[i, :, 2:6, :] = 180
        x[i, :, -6:-2, :] = 180

        if occupied:
            h0, w0 = np.random.randint(14, 22), np.random.randint(18, 28)
            r0, c0 = np.random.randint(18, 30), np.random.randint(16, 28)
            x[i, r0 : r0 + h0, c0 : c0 + w0, :] = np.random.uniform(5, 35, (h0, w0, 3))
        else:
            x[i] *= np.random.uniform(0.85, 1.0)

        x[i] /= 255.0

    return x, y


def export_weights(model: Sequential, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)

    for f in os.listdir(out_dir):
        if f.endswith((".json", ".bin")) and f != "README.md":
            os.remove(os.path.join(out_dir, f))

    manifest = {"weights": []}
    buffers: list[bytes] = []

    for layer in model.layers:
        weights = layer.get_weights()
        if not weights:
            continue
        for arr in weights:
            data = np.asarray(arr, dtype=np.float32)
            manifest["weights"].append({"shape": list(data.shape)})
            buffers.append(data.tobytes())

    with open(os.path.join(out_dir, "weights.bin"), "wb") as f:
        for buf in buffers:
            f.write(buf)

    with open(os.path.join(out_dir, "weights_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def main() -> None:
    print("Construyendo CNN...")
    model = build_model()
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])

    print("Entrenando motor embebido...")
    for epoch in range(12):
        x, y = generate_batch(512)
        loss, acc = model.train_on_batch(x, y)
        print(f"  Epoch {epoch + 1}/12 — loss: {loss:.4f}, acc: {acc:.4f}")

    print(f"Exportando pesos a {EXPORT_DIR}...")
    export_weights(model, EXPORT_DIR)
    print("Listo — la web carga la CNN sin Colab.")


if __name__ == "__main__":
    main()
