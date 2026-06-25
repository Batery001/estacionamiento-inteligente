# Pesos de la CNN para la web

```
public/models/parking/
├── weights_manifest.json   ← incluye "source": colab-pklot | synthetic-pklot
└── weights.bin
```

## Opción A — Pesos reales PKLot (recomendado)

1. Entrena en Colab: `notebooks/Hito5-6-CNN.ipynb` (celdas 1 y 2).
2. Ejecuta **celda 3** → descarga `parking_weights.zip`.
3. Copia `weights.bin` y `weights_manifest.json` aquí.
4. `git push` — la web mostrará **"pesos PKLot (Colab)"**.

## Opción B — Regenerar pesos sintéticos (desarrollo local)

```bash
python scripts/train_and_export.py
```

Genera pesos con la misma arquitectura pero sin el dataset completo.

## Verificar en la web

Al cargar la página debe aparecer el banner **CNN activa** con el origen de los pesos.
