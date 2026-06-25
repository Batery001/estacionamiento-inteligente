export type ImageMode = "single" | "aerial";

export type GridLayout = {
  marginX: number;
  marginY: number;
  roiW: number;
  roiH: number;
  cols: number;
  rows: number;
  /** Ancho/alto de cada celda en px (≈ 1 espacio) */
  cellW: number;
  cellH: number;
};

export function getImageMode(width: number, height: number): ImageMode {
  const aspect = Math.max(width, height) / Math.min(width, height);
  const area = width * height;

  if (aspect > 1.35 && width > 500 && area > 100_000) {
    return "aerial";
  }
  if (area > 400_000 && aspect > 1.2) {
    return "aerial";
  }
  return "single";
}

/**
 * Cuadrícula fina: ~1 celda = 1 espacio de estacionamiento.
 * Antes había pocas celdas grandes (11×6) que agrupaban varios autos.
 */
export function computeParkingGrid(
  width: number,
  height: number,
): GridLayout {
  const marginX = width * 0.025;
  const marginY = height * 0.04;
  const roiW = width - marginX * 2;
  const roiH = height - marginY * 2;

  // Tamaño objetivo de celda según resolución (slot individual en vista aérea)
  const targetCellW = Math.max(42, Math.min(72, roiW / 20));
  const targetCellH = Math.max(48, Math.min(80, roiH / 9));

  let cols = Math.max(12, Math.round(roiW / targetCellW));
  let rows = Math.max(6, Math.round(roiH / targetCellH));

  const maxCells = 280;
  while (cols * rows > maxCells) {
    if (cols > rows && cols > 12) cols--;
    else if (rows > 6) rows--;
    else break;
  }

  const cellW = roiW / cols;
  const cellH = roiH / rows;

  return { marginX, marginY, roiW, roiH, cols, rows, cellW, cellH };
}

export function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}
