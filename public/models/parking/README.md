# Modelo CNN para la web

Coloca aquí los archivos exportados desde Colab:

```
public/models/parking/
├── model.json
├── group1-shard1of1.bin   (el nombre puede variar)
└── ...
```

## Pasos

1. Abre `notebooks/Hito5-6-CNN.ipynb` en Google Colab.
2. Ejecuta las celdas 1 y 2 (datos + entrenamiento).
3. Ejecuta la **celda 3** (exportar modelo).
4. Descarga `parking_tfjs.zip` y descomprime.
5. Copia **todo el contenido** del zip a esta carpeta (`public/models/parking/`).
6. Haz `git push` — la web cargará la CNN automáticamente.

## Verificar

Abre en el navegador: `/models/parking/model.json` — debe devolver JSON, no 404.

> Los archivos `.bin` pueden pesar varios MB. Si GitHub rechaza el push, usa [Git LFS](https://git-lfs.com/) o sube el modelo a un release y ajusta la URL en `lib/cnnInference.ts`.
