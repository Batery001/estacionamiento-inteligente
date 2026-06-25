# Motor CNN embebido

La red neuronal vive en el proyecto y la web la carga automáticamente:

```
public/models/parking/
├── weights_manifest.json
└── weights.bin
```

## Regenerar pesos (opcional)

```bash
python scripts/train_and_export.py
```

O con entorno virtual:

```bash
python -m venv .venv-train
.venv-train\Scripts\pip install tensorflow numpy
.venv-train\Scripts\python scripts/train_and_export.py
```

La arquitectura está definida en `lib/cnnArchitecture.ts` (misma que el notebook).

## Reemplazar con pesos de Colab (PKLot completo)

Si entrenaste en Colab con el notebook y quieres esos pesos exactos, exporta las capas con un script compatible y sustituye `weights.bin` + `weights_manifest.json`.
