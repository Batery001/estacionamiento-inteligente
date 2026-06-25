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
  const maxW = 640;

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

      for (const slot of result.slots) {
        const occupied = slot.label === "Occupied";
        const x = slot.x * scale;
        const y = slot.y * scale;
        const w = slot.width * scale;
        const h = slot.height * scale;

        ctx.strokeStyle = occupied ? "#ef4444" : "#22c55e";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = occupied
          ? "rgba(239, 68, 68, 0.25)"
          : "rgba(34, 197, 94, 0.25)";
        ctx.fillRect(x, y, w, h);
      }
    };
    img.src = imageUrl;
  }, [imageUrl, result]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full rounded-xl"
      aria-label="Mapa de espacios detectados"
    />
  );
}
