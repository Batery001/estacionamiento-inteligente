"use client";

import { useCallback, useRef, useState } from "react";
import { predictParkingSpot, type PredictionResult } from "@/lib/demoInference";

export function ImageDetector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen.");
      return;
    }
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const prediction = await predictParkingSpot(file);
      setResult(prediction);
    } catch {
      setError("No se pudo analizar la imagen.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div
        className="glass flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-dashed p-8 transition hover:border-parking-400/50"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Vista previa"
            className="max-h-64 rounded-xl object-contain"
          />
        ) : (
          <>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-parking-500/20 text-3xl">
              📷
            </div>
            <p className="text-center text-lg font-medium">
              Arrastra una imagen o haz clic para subir
            </p>
            <p className="mt-2 text-center text-sm text-slate-400">
              JPG, PNG o WebP — espacio de estacionamiento
            </p>
          </>
        )}
      </div>

      <div className="glass flex flex-col justify-center rounded-2xl p-8">
        <h3 className="text-lg font-semibold">Resultado</h3>
        {loading && (
          <div className="mt-6 flex items-center gap-3 text-slate-300">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-parking-400 border-t-transparent" />
            Analizando imagen…
          </div>
        )}
        {error && <p className="mt-4 text-red-400">{error}</p>}
        {!loading && result && (
          <div className="mt-6">
            <div
              className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${
                result.label === "Occupied"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {result.label === "Occupied" ? "OCUPADO" : "VACÍO"}
            </div>
            <p className="mt-4 text-4xl font-bold text-white">
              {(result.confidence * 100).toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-slate-400">confianza estimada</p>
          </div>
        )}
        {!loading && !result && !error && (
          <p className="mt-4 text-slate-400">
            Sube una foto de un espacio de estacionamiento para obtener una
            predicción.
          </p>
        )}
        <p className="mt-6 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200/90">
          Vista web en modo demostración (heurística en navegador). El modelo
          CNN completo se entrena en el notebook{" "}
          <code className="font-mono">notebooks/Hito5-6-CNN.ipynb</code> con
          métricas reales sobre PKLot.
        </p>
      </div>
    </div>
  );
}
