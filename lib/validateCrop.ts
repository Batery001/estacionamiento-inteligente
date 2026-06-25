export type CropValidation = {
  ok: boolean;
  width: number;
  height: number;
  reason?: string;
};

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

/** El modelo PKLot entrena con recortes ~cuadrados de un solo espacio (64×64). */
export async function validateSingleSpotCrop(file: File): Promise<CropValidation> {
  const { width, height } = await getImageDimensions(file);
  const aspect = Math.max(width, height) / Math.min(width, height);
  const area = width * height;

  if (aspect > 2.0 && area > 120_000) {
    return {
      ok: false,
      width,
      height,
      reason:
        "Parece una vista completa del estacionamiento. Recorta un solo espacio (como en PKLot).",
    };
  }

  if (width > 700 && height > 450 && aspect > 1.35) {
    return {
      ok: false,
      width,
      height,
      reason:
        "La imagen es demasiado amplia. Sube solo el recorte de un espacio individual.",
    };
  }

  if (area > 600_000) {
    return {
      ok: false,
      width,
      height,
      reason: `Imagen muy grande (${width}×${height} px). Usa un recorte de un único slot.`,
    };
  }

  if (aspect > 2.8) {
    return {
      ok: false,
      width,
      height,
      reason: "Proporción incorrecta. El recorte debe ser aproximadamente cuadrado.",
    };
  }

  return { ok: true, width, height };
}
