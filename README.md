# Estacionamiento Inteligente

Sistema de **gestión inteligente de estacionamientos** (Proyecto 4) basado en Visión Artificial y CNN. Detecta espacios **ocupados** y **vacíos** usando el dataset [PKLot](https://www.kaggle.com/datasets/blanderbuss/parking-lot-dataset).

## Contenido del repositorio

| Carpeta / archivo | Descripción |
|---|---|
| `app/` | Frontend Next.js (interfaz web) |
| `components/` | Componentes de la UI |
| `notebooks/Hito5-6-CNN.ipynb` | Entrenamiento CNN — Hitos 5 y 6 |
| `lib/` | Datos del proyecto y demo de inferencia |

## Métricas CNN (validación UFPR05)

| Métrica | Valor |
|---|---|
| Accuracy | 88.14% |
| Precision | 83.64% |
| Recall | 99.33% |
| F1-Score | 90.87% |
| Tiempo entrenamiento | 17.92 min |

## Motor CNN

La web usa **solo la CNN** (TensorFlow.js) — sin heurísticas.

| Origen | Calidad | Cómo obtenerlo |
|---|---|---|
| `colab-pklot` | **Mejor** — 1M+ imágenes PKLot | Celda 3 del notebook en Colab |
| `synthetic-pklot` | Desarrollo / demo | `python scripts/train_and_export.py` |

### Conectar pesos de Colab (recomendado)

1. Entrena en Colab (`notebooks/Hito5-6-CNN.ipynb`).
2. Ejecuta celda **3** → descarga `parking_weights.zip`.
3. Copia a `public/models/parking/` y haz push.

La web mostrará **"pesos PKLot (Colab)"** en el banner.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Despliegue en Vercel

1. Sube este repositorio a GitHub.
2. Entra en [vercel.com](https://vercel.com) → **Add New Project**.
3. Importa `Batery001/estacionamiento-inteligente`.
4. Framework: **Next.js** (detectado automáticamente).
5. Clic en **Deploy**.

O con CLI:

```bash
npm i -g vercel
vercel
```

## Notebook (entrenamiento)

El modelo CNN se entrena en Google Colab con el notebook incluido. Requiere `kaggle.json` para descargar PKLot.

## Inferencia

La página ejecuta la **CNN en el navegador** (TensorFlow.js) con pesos incluidos en el repositorio. No requiere Colab ni backend externo.

## Equipo

Proyecto Integrador — Aprendizaje Automático · Visión Artificial
