"use client";

import { useEffect, useRef } from "react";
import type { AerialResult } from "@/lib/cnnInference";

export function AerialOverlay({
  imageUrl,
  result,
}: {
  imageUrl: string;
  result: AerialResult;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxW = 680;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / result.imageWidth);
      const dw = result.imageWidth * scale;
      const dh = result.imageHeight * scale;
      canvas.width = dw;
      canvas.height = dh;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, dw, dh);

      const lineW = Math.max(1, 1.5 * scale);

      // Primero vacíos (verde) — resaltar espacios disponibles
      for (const slot of result.slots) {
        if (slot.label !== "Empty") continue;
        const x = slot.x * scale;
        const y = slot.y * scale;
        const w = slot.width * scale;
        const h = slot.height * scale;

        ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = lineW;
        ctx.strokeRect(x + lineW / 2, y + lineW / 2, w - lineW, h - lineW);
      }

      // Luego ocupados (rojo) encima
      for (const slot of result.slots) {
        if (slot.label !== "Occupied") continue;
        const x = slot.x * scale;
        const y = slot.y * scale;
        const w = slot.width * scale;
        const h = slot.height * scale;

        ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = lineW + 0.5;
        ctx.strokeRect(x + lineW / 2, y + lineW / 2, w - lineW, h - lineW);
      }
    };
    img.src = imageUrl;
  }, [imageUrl, result]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full rounded-xl"
      aria-label="Espacios vacíos en verde y ocupados en rojo"
    />
  );
}
