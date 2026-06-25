"""Exporta pesos del modelo entrenado en Colab al formato de la web."""
import json
import os
import sys

import numpy as np

# Uso en Colab después del entrenamiento:
#   %run export_colab_weights.py
# O copiar este script y ejecutar con model_cnn ya en memoria.


def export_keras_model(model, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    manifest = {"weights": [], "source": "colab-pklot", "architecture": "cnn-hito6"}
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

    print(f"Exportado: {out_dir}/weights.bin + weights_manifest.json")
    print("Copia esos archivos a public/models/parking/ del proyecto web.")


if __name__ == "__main__":
    try:
        model_cnn  # type: ignore  # noqa: F821 — existe en Colab tras entrenar
    except NameError:
        print("Ejecuta esto en Colab DESPUÉS de entrenar model_cnn.", file=sys.stderr)
        sys.exit(1)
    export_keras_model(model_cnn, "/content/web_weights")
