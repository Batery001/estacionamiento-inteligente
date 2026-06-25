export type ImageMode = "single" | "aerial";

export type GridLayout = {
  marginX: number;
  marginY: number;
  roiW: number;
  roiH: number;
  cols: number;
  rows: number;
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

/** Divide la zona visible del lote en celdas ~cuadradas para la CNN. */
export function computeParkingGrid(
  width: number,
  height: number,
): GridLayout {
  const marginX = width * 0.04;
  const marginY = height * 0.06;
  const roiW = width - marginX * 2;
  const roiH = height - marginY * 2;
  const aspect = roiW / roiH;

  const targetCells = Math.min(
    72,
    Math.max(24, Math.round((roiW * roiH) / 12_000)),
  );
  const cols = Math.max(4, Math.round(Math.sqrt(targetCells * aspect)));
  const rows = Math.max(3, Math.round(targetCells / cols));

  return { marginX, marginY, roiW, roiH, cols, rows };
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
