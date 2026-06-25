export type PredictionResult = {
  label: "Occupied" | "Empty";
  confidence: number;
  occupiedScore: number;
  isDemo: boolean;
};

function analyzeCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const data = ctx.getImageData(0, 0, width, height).data;
  let darkPixels = 0;
  let edgeSum = 0;
  const step = 4;
  const total = Math.floor((width * height) / step);

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 85) darkPixels++;
    const next = i + 4 * step;
    if (next < data.length) {
      const nr = data[next];
      const ng = data[next + 1];
      const nb = data[next + 2];
      edgeSum += Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
    }
  }

  const darkRatio = darkPixels / total;
  const edgeAvg = edgeSum / total / 3;
  const occupiedScore = Math.min(0.98, Math.max(0.02, darkRatio * 1.4 + edgeAvg / 120));
  return occupiedScore;
}

export async function predictParkingSpot(file: File): Promise<PredictionResult> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");

  ctx.drawImage(bitmap, 0, 0, size, size);
  const occupiedScore = analyzeCanvas(ctx, size, size);
  const label: PredictionResult["label"] = occupiedScore >= 0.5 ? "Occupied" : "Empty";
  const confidence = label === "Occupied" ? occupiedScore : 1 - occupiedScore;

  await new Promise((r) => setTimeout(r, 600));

  return {
    label,
    confidence,
    occupiedScore,
    isDemo: true,
  };
}
