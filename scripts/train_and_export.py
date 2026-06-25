"""
Entrena la CNN (misma arquitectura que Hito 6) y exporta pesos para la web.
Datos sintéticos inspirados en PKLot: slots 64x64, asfalto, líneas, vehículos.
"""
import json
import os

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


def _asphalt() -> np.ndarray:
    base = np.random.uniform(40, 90)
    tile = np.random.normal(base, 8, (64, 64, 3))
    return np.clip(tile, 25, 120)


def _add_lines(slot: np.ndarray) -> None:
    w = np.random.randint(2, 5)
    slot[2 : 2 + w, :, :] = np.random.uniform(160, 220)
    slot[-2 - w : -2, :, :] = np.random.uniform(160, 220)
    slot[:, 2 : 2 + w, :] = np.random.uniform(160, 220)
    slot[:, -2 - w : -2, :] = np.random.uniform(160, 220)


def _add_vehicle(slot: np.ndarray) -> None:
    style = np.random.choice(["full", "partial", "aerial"])
    if style == "full":
        h, w = np.random.randint(16, 26), np.random.randint(20, 32)
        r, c = np.random.randint(16, 28), np.random.randint(14, 26)
    elif style == "partial":
        h, w = np.random.randint(20, 36), np.random.randint(22, 40)
        r, c = np.random.randint(8, 20), np.random.randint(8, 20)
    else:
        h, w = np.random.randint(12, 20), np.random.randint(14, 24)
        r, c = np.random.randint(20, 32), np.random.randint(18, 30)

    color = np.random.uniform(8, 45)
    slot[r : r + h, c : c + w, :] = color + np.random.normal(0, 6, (h, w, 3))
    slot[r : r + h, c : c + w, :] = np.clip(slot[r : r + h, c : c + w, :], 5, 80)


def generate_batch(n: int) -> tuple[np.ndarray, np.ndarray]:
    x = np.zeros((n, 64, 64, 3), dtype=np.float32)
    y = np.zeros((n, 1), dtype=np.float32)

    for i in range(n):
        occupied = np.random.rand() > 0.5
        y[i, 0] = 1.0 if occupied else 0.0
        slot = _asphalt()
        _add_lines(slot)
        if occupied:
            _add_vehicle(slot)
        else:
            slot *= np.random.uniform(0.88, 1.05)
        if np.random.rand() > 0.7:
            slot += np.random.normal(0, 4, slot.shape)
        x[i] = np.clip(slot, 0, 255) / 255.0

    return x, y


def export_weights(model: Sequential, out_dir: str, source: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        if f.endswith((".json", ".bin")):
            os.remove(os.path.join(out_dir, f))

    manifest: dict = {
        "source": source,
        "architecture": "cnn-hito6",
        "inputSize": [64, 64, 3],
        "weights": [],
    }
    buffers: list[bytes] = []

    for layer in model.layers:
        for arr in layer.get_weights():
            data = np.asarray(arr, dtype=np.float32)
            manifest["weights"].append({"shape": list(data.shape)})
            buffers.append(data.tobytes())

    with open(os.path.join(out_dir, "weights.bin"), "wb") as f:
        for buf in buffers:
            f.write(buf)

    with open(os.path.join(out_dir, "weights_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def main() -> None:
    print("CNN — misma arquitectura que notebooks/Hito5-6-CNN.ipynb")
    model = build_model()
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])

    epochs = 30
    print(f"Entrenando {epochs} épocas (sintético tipo PKLot)...")
    for epoch in range(epochs):
        x, y = generate_batch(1024)
        loss, acc = model.train_on_batch(x, y)
        if (epoch + 1) % 5 == 0 or epoch == 0:
            print(f"  Epoch {epoch + 1}/{epochs} — loss: {loss:.4f}, acc: {acc:.4f}")

    print(f"Exportando a {EXPORT_DIR}...")
    export_weights(model, EXPORT_DIR, "synthetic-pklot")
    print("Listo. Para pesos reales: exporta desde Colab (celda 3 del notebook).")


if __name__ == "__main__":
    main()
