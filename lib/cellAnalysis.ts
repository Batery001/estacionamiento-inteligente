/**
 * Análisis visual por celda para vista aérea.
 * Detecta masas oscuras (vehículos) que la CNN sola no generaliza bien en fotos aéreas.
 */
export function analyzeCellForVehicle(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const total = width * height;

  const cx0 = Math.floor(width * 0.12);
  const cx1 = Math.floor(width * 0.88);
  const cy0 = Math.floor(height * 0.12);
  const cy1 = Math.floor(height * 0.88);

  let vehiclePixels = 0;
  let centerVehicle = 0;
  let centerTotal = 0;
  let lumSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lumSum += lum;

      const isVehicle =
        lum < 50 ||
        (lum < 78 && r < 95 && g < 95 && b < 105 && Math.max(r, g, b) - Math.min(r, g, b) < 40);

      if (isVehicle) vehiclePixels++;

      if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) {
        centerTotal++;
        if (isVehicle) centerVehicle++;
      }
    }
  }

  const meanLum = lumSum / total;
  const vehicleRatio = vehiclePixels / total;
  const centerRatio = centerTotal > 0 ? centerVehicle / centerTotal : 0;

  // Celdas con vehículo: masa oscura concentrada en el centro
  let score = centerRatio * 4.0 + vehicleRatio * 1.5;

  // Penalizar celdas muy brillantes (asfalto vacío con líneas blancas)
  if (meanLum > 145) score *= 0.65;

  return Math.min(0.99, Math.max(0.01, score));
}

/** Combina CNN + análisis visual para celdas aéreas. */
export function fuseAerialScores(cnnScore: number, visualScore: number): number {
  return 0.25 * cnnScore + 0.75 * visualScore;
}

export const AERIAL_OCCUPIED_THRESHOLD = 0.36;
