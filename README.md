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

## Nota sobre la demo web

La interfaz en Vercel incluye una **demo en navegador** para probar la carga de imágenes. Las métricas mostradas provienen del entrenamiento real en el notebook. Para producción se integraría el modelo exportado (`.h5` / TF.js) vía API de inferencia.

## Equipo

Proyecto Integrador — Aprendizaje Automático · Visión Artificial
