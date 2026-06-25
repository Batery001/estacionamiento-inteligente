export type AutoDetectedSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AnalysisImage = {
  width: number;
  height: number;
  gray: Float32Array;
  lineMask: Uint8Array;
  scale: number;
};

const MAX_ANALYSIS_DIM = 720;

function bitmapToAnalysis(bitmap: ImageBitmap): AnalysisImage {
  const scale = Math.min(1, MAX_ANALYSIS_DIM / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const gray = new Float32Array(width * height);
  const lineMask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
    const isWhite = lum > 145 && sat < 0.42;
    const isYellow = lum > 95 && r > 145 && g > 120 && b < 130 && sat > 0.15;
    lineMask[i] = isWhite || isYellow ? 1 : 0;
  }

  // Refuerzo con bordes (líneas de pintura)
  const edge = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] -
        2 * gray[i - 1] -
        gray[i + width - 1] +
        gray[i - width + 1] +
        2 * gray[i + 1] +
        gray[i + width + 1];
      const gy =
        -gray[i - width - 1] -
        2 * gray[i - width] -
        gray[i - width + 1] +
        gray[i + width - 1] +
        2 * gray[i + width] +
        gray[i + width + 1];
      edge[i] = Math.hypot(gx, gy);
    }
  }

  for (let i = 0; i < width * height; i++) {
    if (lineMask[i] || edge[i] > 55) {
      lineMask[i] = 1;
    }
  }

  dilateMask(lineMask, width, height, 1);

  return { width, height, gray, lineMask, scale };
}

function dilateMask(mask: Uint8Array, w: number, h: number, radius: number) {
  const copy = mask.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!copy[y * w + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            mask[ny * w + nx] = 1;
          }
        }
      }
    }
  }
}

function smoothProjection(proj: Float32Array, radius: number): Float32Array {
  const out = new Float32Array(proj.length);
  for (let i = 0; i < proj.length; i++) {
    let sum = 0;
    let n = 0;
    for (let d = -radius; d <= radius; d++) {
      const j = i + d;
      if (j >= 0 && j < proj.length) {
        sum += proj[j];
        n++;
      }
    }
    out[i] = sum / n;
  }
  return out;
}

function findPeaks(
  proj: Float32Array,
  minDist: number,
  minValue: number,
): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < proj.length - 1; i++) {
    if (proj[i] < minValue) continue;
    if (proj[i] <= proj[i - 1] || proj[i] < proj[i + 1]) continue;
    const last = peaks[peaks.length - 1];
    if (last !== undefined && i - last < minDist) {
      if (proj[i] > proj[last]) peaks[peaks.length - 1] = i;
      continue;
    }
    peaks.push(i);
  }
  return peaks;
}

function estimatePeriod(
  proj: Float32Array,
  minP: number,
  maxP: number,
): number | null {
  let bestLag = minP;
  let bestScore = -Infinity;
  const mean =
    proj.reduce((a, b) => a + b, 0) / Math.max(1, proj.length);

  for (let lag = minP; lag <= maxP; lag++) {
    let score = 0;
    let n = 0;
    for (let i = 0; i < proj.length - lag; i++) {
      score += (proj[i] - mean) * (proj[i + lag] - mean);
      n++;
    }
    if (n > 0 && score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  return bestScore > 0 ? bestLag : null;
}

function buildGridFromPeaks(
  xPeaks: number[],
  yPeaks: number[],
  width: number,
  height: number,
  marginX: number,
  marginY: number,
): AutoDetectedSlot[] {
  const xs = [marginX, ...xPeaks.filter((p) => p > marginX && p < width - marginX), width - marginX];
  const ys = [marginY, ...yPeaks.filter((p) => p > marginY && p < height - marginY), height - marginY];

  const uniqueXs = [...new Set(xs)].sort((a, b) => a - b);
  const uniqueYs = [...new Set(ys)].sort((a, b) => a - b);

  const slots: AutoDetectedSlot[] = [];
  for (let ri = 0; ri < uniqueYs.length - 1; ri++) {
    for (let ci = 0; ci < uniqueXs.length - 1; ci++) {
      const x = uniqueXs[ci];
      const y = uniqueYs[ri];
      const w = uniqueXs[ci + 1] - x;
      const h = uniqueYs[ri + 1] - y;
      if (w < 8 || h < 8) continue;
      const aspect = w / h;
      if (aspect < 0.25 || aspect > 4.5) continue;
      slots.push({ x, y, width: w, height: h });
    }
  }
  return slots;
}

function detectByProjections(img: AnalysisImage): AutoDetectedSlot[] {
  const { width, height, lineMask } = img;
  const marginX = Math.round(width * 0.02);
  const marginY = Math.round(height * 0.06);
  const roiW = width - marginX * 2;
  const roiH = height - marginY * 2;

  const vProj = new Float32Array(width);
  const hProj = new Float32Array(height);

  for (let y = marginY; y < height - marginY; y++) {
    for (let x = marginX; x < width - marginX; x++) {
      if (lineMask[y * width + x]) {
        vProj[x] += 1;
        hProj[y] += 1;
      }
    }
  }

  const vSmooth = smoothProjection(vProj, 2);
  const hSmooth = smoothProjection(hProj, 2);

  const vMean = vProj.reduce((a, b) => a + b, 0) / roiW;
  const hMean = hProj.reduce((a, b) => a + b, 0) / roiH;
  const vStd = Math.sqrt(
    vProj.reduce((s, v) => s + (v - vMean) ** 2, 0) / Math.max(1, width),
  );
  const hStd = Math.sqrt(
    hProj.reduce((s, v) => s + (v - hMean) ** 2, 0) / Math.max(1, height),
  );

  const minCellW = Math.max(12, roiW / 28);
  const minCellH = Math.max(14, roiH / 12);
  const periodX = estimatePeriod(vSmooth, minCellW * 0.7, minCellW * 1.8) ?? minCellW;
  const periodY = estimatePeriod(hSmooth, minCellH * 0.7, minCellH * 1.8) ?? minCellH;

  let xPeaks = findPeaks(vSmooth, Math.round(periodX * 0.55), vMean + vStd * 0.35);
  let yPeaks = findPeaks(hSmooth, Math.round(periodY * 0.55), hMean + hStd * 0.35);

  // Si hay pocos picos, generar rejilla alineada al periodo detectado
  if (xPeaks.length < 3) {
    xPeaks = [];
    let x = marginX + periodX * 0.5;
    while (x < width - marginX - periodX * 0.3) {
      xPeaks.push(Math.round(x));
      x += periodX;
    }
  }
  if (yPeaks.length < 2) {
    yPeaks = [];
    let y = marginY + periodY * 0.5;
    while (y < height - marginY - periodY * 0.3) {
      yPeaks.push(Math.round(y));
      y += periodY;
    }
  }

  return buildGridFromPeaks(xPeaks, yPeaks, width, height, marginX, marginY);
}

function detectByComponents(img: AnalysisImage): AutoDetectedSlot[] {
  const { width, height, lineMask } = img;
  const marginX = Math.round(width * 0.02);
  const marginY = Math.round(height * 0.06);

  const interior = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    interior[i] = lineMask[i] ? 0 : 1;
  }

  const labels = new Int32Array(width * height);
  let nextLabel = 1;
  const parent: number[] = [0];

  function find(a: number): number {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  }

  function unite(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!interior[i]) continue;
      if (x < marginX || x >= width - marginX || y < marginY || y >= height - marginY) {
        interior[i] = 0;
        continue;
      }

      const left = x > 0 && interior[i - 1] ? labels[i - 1] : 0;
      const up = y > 0 && interior[i - width] ? labels[i - width] : 0;

      if (!left && !up) {
        labels[i] = nextLabel;
        parent.push(nextLabel);
        nextLabel++;
      } else if (left && !up) {
        labels[i] = left;
      } else if (!left && up) {
        labels[i] = up;
      } else {
        labels[i] = Math.min(left, up);
        unite(left, up);
      }
    }
  }

  type BBox = { minX: number; minY: number; maxX: number; maxY: number; area: number };
  const boxes = new Map<number, BBox>();

  for (let y = marginY; y < height - marginY; y++) {
    for (let x = marginX; x < width - marginX; x++) {
      const i = y * width + x;
      if (!interior[i]) continue;
      const root = find(labels[i]);
      const b = boxes.get(root);
      if (!b) {
        boxes.set(root, { minX: x, minY: y, maxX: x, maxY: y, area: 1 });
      } else {
        b.minX = Math.min(b.minX, x);
        b.minY = Math.min(b.minY, y);
        b.maxX = Math.max(b.maxX, x);
        b.maxY = Math.max(b.maxY, y);
        b.area++;
      }
    }
  }

  const imgArea = width * height;
  const minArea = imgArea * 0.0012;
  const maxArea = imgArea * 0.045;
  const slots: AutoDetectedSlot[] = [];

  for (const b of boxes.values()) {
    const w = b.maxX - b.minX + 1;
    const h = b.maxY - b.minY + 1;
    const area = b.area;
    if (area < minArea || area > maxArea) continue;
    const aspect = w / h;
    if (aspect < 0.3 || aspect > 4) continue;
    const fill = area / (w * h);
    if (fill < 0.45) continue;
    slots.push({ x: b.minX, y: b.minY, width: w, height: h });
  }

  return slots;
}

function scoreSlots(slots: AutoDetectedSlot[], img: AnalysisImage): number {
  if (slots.length < 8 || slots.length > 220) return -1;

  const areas = slots.map((s) => s.width * s.height);
  const mean = areas.reduce((a, b) => a + b, 0) / areas.length;
  const variance =
    areas.reduce((s, a) => s + (a - mean) ** 2, 0) / Math.max(1, areas.length);
  const cv = Math.sqrt(variance) / Math.max(1, mean);

  // Preferir cantidad razonable y tamaños uniformes (típico de un lote)
  const countScore = slots.length >= 15 && slots.length <= 120 ? 1 : 0.6;
  const uniformScore = cv < 0.55 ? 1 : cv < 0.85 ? 0.7 : 0.3;

  return slots.length * countScore * uniformScore;
}

function scaleSlots(
  slots: AutoDetectedSlot[],
  scale: number,
  fullW: number,
  fullH: number,
): AutoDetectedSlot[] {
  const inv = 1 / scale;
  const pad = Math.max(1, Math.round(2 * inv));

  return slots
    .map((s) => ({
      x: Math.round(s.x * inv) + pad,
      y: Math.round(s.y * inv) + pad,
      width: Math.round(s.width * inv) - pad * 2,
      height: Math.round(s.height * inv) - pad * 2,
    }))
    .filter(
      (s) =>
        s.width > 10 &&
        s.height > 10 &&
        s.x >= 0 &&
        s.y >= 0 &&
        s.x + s.width <= fullW &&
        s.y + s.height <= fullH,
    );
}

/**
 * Detecta espacios en vista aérea analizando líneas de pintura y regiones del lote.
 * No requiere XML; se adapta al tamaño real de cada celda cuando es posible.
 */
export async function detectParkingSlotsAuto(
  bitmap: ImageBitmap,
): Promise<AutoDetectedSlot[]> {
  const analysis = bitmapToAnalysis(bitmap);
  const byProj = detectByProjections(analysis);
  const byComp = detectByComponents(analysis);

  const projScore = scoreSlots(byProj, analysis);
  const compScore = scoreSlots(byComp, analysis);

  let chosen =
    compScore > projScore && compScore > 0 ? byComp : byProj.length > 0 ? byProj : byComp;

  if (chosen.length === 0) {
    chosen = byProj.length > 0 ? byProj : byComp;
  }

  return scaleSlots(chosen, analysis.scale, bitmap.width, bitmap.height);
}
