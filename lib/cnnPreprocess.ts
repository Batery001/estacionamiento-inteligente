/**
 * Preprocesamiento de imagen antes de la CNN (mismo pipeline que PKLot: rescale 1/255).
 * Normalización de contraste ligera para celdas aéreas con poca variación.
 */
export function preprocessCellImageData(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data.length);

  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const range = maxLum - minLum;
  const stretch = range > 25;

  for (let i = 0; i < data.length; i += 4) {
    if (stretch) {
      for (let c = 0; c < 3; c++) {
        out[i + c] = Math.min(
          255,
          Math.max(0, ((data[i + c] - minLum) / range) * 255),
        );
      }
    } else {
      out[i] = data[i];
      out[i + 1] = data[i + 1];
      out[i + 2] = data[i + 2];
    }
    out[i + 3] = 255;
  }

  return new ImageData(out, width, height);
}
