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

      const drawSlot = (slot: (typeof result.slots)[0]) => {
        const occupied = slot.label === "Occupied";
        const stroke = occupied ? "#ef4444" : "#22c55e";
        const fill = occupied
          ? "rgba(239, 68, 68, 0.3)"
          : "rgba(34, 197, 94, 0.2)";

        ctx!.fillStyle = fill;
        ctx!.strokeStyle = stroke;
        ctx!.lineWidth = lineW;

        if (slot.polygon && slot.polygon.length >= 3) {
          ctx!.beginPath();
          slot.polygon.forEach((p, i) => {
            const px = p.x * scale;
            const py = p.y * scale;
            if (i === 0) ctx!.moveTo(px, py);
            else ctx!.lineTo(px, py);
          });
          ctx!.closePath();
          ctx!.fill();
          ctx!.stroke();
        } else {
          const x = slot.x * scale;
          const y = slot.y * scale;
          const w = slot.width * scale;
          const h = slot.height * scale;
          ctx!.fillRect(x, y, w, h);
          ctx!.strokeRect(x + lineW / 2, y + lineW / 2, w - lineW, h - lineW);
        }
      };

      for (const slot of result.slots) {
        if (slot.label === "Empty") drawSlot(slot);
      }
      for (const slot of result.slots) {
        if (slot.label === "Occupied") drawSlot(slot);
      }
    };
    img.src = imageUrl;
  }, [imageUrl, result]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full rounded-xl"
      aria-label="Espacios PKLot: verde disponible, rojo ocupado"
    />
  );
}
