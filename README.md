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

## Conectar la CNN a la web (cerebro del proyecto)

La interfaz usa **TensorFlow.js** con el modelo exportado desde Colab.

1. Entrena en Colab (`notebooks/Hito5-6-CNN.ipynb` — celdas 1 y 2).
2. Ejecuta la **celda 3** (exportar a TensorFlow.js).
3. Descarga `parking_tfjs.zip` y copia su contenido a `public/models/parking/`.
4. `git push` → Vercel redeploya con la CNN activa.

Ver detalle en [`public/models/parking/README.md`](public/models/parking/README.md).

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

## Nota sobre inferencia

La web ejecuta la **misma CNN** entrenada en el notebook, convertida a TensorFlow.js. Sin los archivos del modelo en `public/models/parking/`, la demo mostrará instrucciones para exportarlos desde Colab.

## Equipo

Proyecto Integrador — Aprendizaje Automático · Visión Artificial
