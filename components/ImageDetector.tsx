"use client";

import { useCallback, useRef, useState } from "react";
import { predictParkingSpot, type PredictionResult } from "@/lib/demoInference";
import { validateSingleSpotCrop } from "@/lib/validateCrop";

function SpotFrame({
  preview,
  result,
}: {
  preview: string;
  result: PredictionResult;
}) {
  const occupied = result.label === "Occupied";
  const color = occupied ? "red" : "emerald";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative rounded-xl p-1 ${
          occupied
            ? "shadow-lg shadow-red-500/40 ring-4 ring-red-500"
            : "shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500"
        }`}
      >
        {/* Esquinas tipo detector */}
        <span
          className={`pointer-events-none absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-${color}-400`}
          style={{ borderColor: occupied ? "#f87171" : "#34d399" }}
        />
        <span
          className="pointer-events-none absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4"
          style={{ borderColor: occupied ? "#f87171" : "#34d399" }}
        />
        <span
          className="pointer-events-none absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4"
          style={{ borderColor: occupied ? "#f87171" : "#34d399" }}
        />
        <span
          className="pointer-events-none absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4"
          style={{ borderColor: occupied ? "#f87171" : "#34d399" }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Recorte del espacio"
          className="max-h-56 max-w-full rounded-lg object-contain"
        />

        <div
          className={`absolute left-2 top-2 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide ${
            occupied ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {occupied ? "No disponible" : "Disponible"}
        </div>
      </div>

      <p className={`text-sm font-medium ${occupied ? "text-red-300" : "text-emerald-300"}`}>
        {occupied
          ? "Espacio ocupado — marcado en rojo"
          : "Espacio libre — marcado en verde"}
      </p>
    </div>
  );
}

export function ImageDetector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropInfo, setCropInfo] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen.");
      return;
    }

    setError(null);
    setResult(null);
    setCropInfo(null);

    try {
      const validation = await validateSingleSpotCrop(file);
      if (!validation.ok) {
        setPreview(URL.createObjectURL(file));
        setError(validation.reason ?? "Recorte no válido.");
        setCropInfo(`${validation.width}×${validation.height} px`);
        return;
      }

      setCropInfo(`${validation.width}×${validation.height} px — recorte válido`);
      setPreview(URL.createObjectURL(file));
      setLoading(true);

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

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setCropInfo(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Leyenda y guía */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-xl border-l-4 border-emerald-500 p-4">
          <p className="text-sm font-semibold text-emerald-300">Disponible</p>
          <p className="mt-1 text-xs text-slate-400">
            Recorte de un espacio vacío → marco verde
          </p>
        </div>
        <div className="glass rounded-xl border-l-4 border-red-500 p-4">
          <p className="text-sm font-semibold text-red-300">No disponible</p>
          <p className="mt-1 text-xs text-slate-400">
            Recorte con vehículo → marco rojo
          </p>
        </div>
        <div className="glass rounded-xl border-l-4 border-amber-500 p-4">
          <p className="text-sm font-semibold text-amber-300">Solo 1 espacio</p>
          <p className="mt-1 text-xs text-slate-400">
            No subas fotos aéreas del estacionamiento completo
          </p>
        </div>
      </div>

      <div className="glass rounded-xl p-4 text-sm text-slate-300">
        <p className="font-medium text-white">¿Qué imagen subir?</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-emerald-500/10 p-3">
            <p className="font-medium text-emerald-300">Correcto</p>
            <p className="mt-1 text-xs text-slate-400">
              Un recorte cuadrado de <strong>un solo slot</strong>, como en el
              dataset PKLot (64×64 px aprox.).
            </p>
            <div className="mt-2 flex h-16 w-16 items-center justify-center rounded border-2 border-dashed border-emerald-500/50 bg-slate-800 text-[10px] text-slate-500">
              1 slot
            </div>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3">
            <p className="font-medium text-red-300">Incorrecto</p>
            <p className="mt-1 text-xs text-slate-400">
              Vista aérea de todo el estacionamiento con muchos espacios.
            </p>
            <div className="mt-2 flex h-10 w-28 items-center justify-center rounded border-2 border-dashed border-red-500/50 bg-slate-800 text-[10px] text-slate-500">
              muchos slots
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className="glass flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 p-6 transition hover:border-parking-400/50"
          onClick={() => !loading && inputRef.current?.click()}
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

          {!preview ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-parking-500/20 text-3xl">
                📷
              </div>
              <p className="text-center text-lg font-medium">
                Sube un recorte de un espacio
              </p>
              <p className="mt-2 max-w-xs text-center text-sm text-slate-400">
                JPG, PNG o WebP — imagen cuadrada de un solo estacionamiento
              </p>
            </>
          ) : result ? (
            <SpotFrame preview={preview} result={result} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Vista previa"
              className={`max-h-56 rounded-xl object-contain ${
                error ? "opacity-60 ring-2 ring-amber-500" : ""
              }`}
            />
          )}

          {preview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="mt-4 text-xs text-slate-400 underline hover:text-white"
            >
              Cambiar imagen
            </button>
          )}
        </div>

        <div className="glass flex flex-col justify-center rounded-2xl p-8">
          <h3 className="text-lg font-semibold">Resultado</h3>

          {cropInfo && (
            <p className="mt-2 font-mono text-xs text-slate-500">{cropInfo}</p>
          )}

          {loading && (
            <div className="mt-6 flex items-center gap-3 text-slate-300">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-parking-400 border-t-transparent" />
              Analizando recorte…
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-amber-500/10 p-4 text-sm text-amber-200">
              <p className="font-semibold">Imagen no aceptada</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {!loading && result && (
            <div className="mt-6">
              <div
                className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${
                  result.label === "Occupied"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {result.label === "Occupied" ? "NO DISPONIBLE" : "DISPONIBLE"}
              </div>
              <p className="mt-4 text-4xl font-bold text-white">
                {(result.confidence * 100).toFixed(1)}%
              </p>
              <p className="mt-1 text-sm text-slate-400">confianza estimada</p>
            </div>
          )}

          {!loading && !result && !error && (
            <p className="mt-4 text-slate-400">
              Sube el recorte de un único espacio para ver el marco verde
              (disponible) o rojo (ocupado).
            </p>
          )}

          <p className="mt-6 rounded-lg bg-slate-800/80 p-3 text-xs text-slate-400">
            Demo con heurística en navegador. El CNN real del notebook{" "}
            <code className="text-slate-300">notebooks/Hito5-6-CNN.ipynb</code>{" "}
            entrena con recortes PKLot y alcanza ~88% accuracy en validación.
          </p>
        </div>
      </div>
    </div>
  );
}
