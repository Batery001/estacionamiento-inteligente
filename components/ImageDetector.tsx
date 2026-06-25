"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AerialOverlay } from "@/components/AerialOverlay";
import {
  getModelInfo,
  loadCnnModel,
  predictPklotFromXml,
  predictParkingSpot,
  type AerialResult,
  type PredictionResult,
} from "@/lib/demoInference";
import { getImageDimensions, getImageMode } from "@/lib/detectAerial";
import { validateSingleSpotCrop } from "@/lib/validateCrop";

type ModelStatus = "loading" | "ready" | "missing";
type ViewMode = "single" | "aerial";

function SpotFrame({
  preview,
  result,
}: {
  preview: string;
  result: PredictionResult;
}) {
  const occupied = result.label === "Occupied";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative rounded-xl p-1 ${
          occupied
            ? "shadow-lg shadow-red-500/40 ring-4 ring-red-500"
            : "shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Recorte del espacio"
          className="max-h-56 max-w-full rounded-lg object-contain"
        />
        <div
          className={`absolute left-2 top-2 rounded-md px-2 py-1 text-xs font-bold uppercase ${
            occupied ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {occupied ? "No disponible" : "Disponible"}
        </div>
      </div>
    </div>
  );
}

function ModelStatusBanner({
  status,
  source,
}: {
  status: ModelStatus;
  source?: string;
}) {
  const sourceLabel =
    source === "colab-pklot"
      ? "pesos PKLot (Colab)"
      : source === "synthetic-pklot"
        ? "pesos sintéticos — exporta Colab para mejores resultados"
        : source;

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-parking-500/30 bg-parking-500/10 p-4 text-sm text-parking-200">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-parking-400 border-t-transparent" />
        Cargando CNN (TensorFlow.js)…
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        <span className="font-semibold">CNN activa</span> — inferencia 100% red
        neuronal convolucional.
        {sourceLabel && (
          <p className="mt-1 text-xs text-emerald-300/80">Origen: {sourceLabel}</p>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="font-semibold">Motor CNN no cargado</p>
      <p className="mt-2">
        Faltan pesos en{" "}
        <code className="rounded bg-black/20 px-1">public/models/parking/</code>
      </p>
    </div>
  );
}

export function ImageDetector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [xmlName, setXmlName] = useState<string | null>(null);
  const pendingXmlRef = useRef<string | null>(null);
  const lastImageRef = useRef<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [aerialResult, setAerialResult] = useState<AerialResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [modelSource, setModelSource] = useState<string | undefined>();

  useEffect(() => {
    loadCnnModel().then((ok) => {
      setModelStatus(ok ? "ready" : "missing");
      if (ok) setModelSource(getModelInfo().source);
    });
  }, []);

  const processImage = useCallback(
    async (file: File, xmlText?: string | null) => {
      if (modelStatus !== "ready") {
        setError("La CNN aún no está cargada.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Solo se permiten archivos de imagen.");
        return;
      }

      lastImageRef.current = file;

      setError(null);
      setResult(null);
      setAerialResult(null);
      setProgress(null);
      setViewMode(null);

      try {
        const { width, height } = await getImageDimensions(file);
        const mode = getImageMode(width, height);
        const url = URL.createObjectURL(file);
        setPreview(url);
        setLoading(true);
        setViewMode(mode);

        if (mode === "aerial") {
          if (!xmlText) {
            setMeta(`${width}×${height} px — vista aérea`);
            setError(
              "Sube el XML PKLot que corresponde a esta foto (misma carpeta en Kaggle: UFPR04, UFPR05, etc.). Sin XML no se pueden marcar los espacios uno por uno.",
            );
            return;
          }
          setMeta(`${width}×${height} px — modo PKLot (XML)`);
          const aerial = await predictPklotFromXml(file, xmlText, (done, total) => {
            setProgress(`CNN por espacio PKLot: ${done}/${total}`);
          });
          setAerialResult(aerial);
          setMeta(
            `${width}×${height} px — ${aerial.total} espacios (XML PKLot)`,
          );
        } else {
          const validation = await validateSingleSpotCrop(file);
          if (!validation.ok) {
            setError(validation.reason ?? "Recorte no válido.");
            setMeta(`${width}×${height} px`);
            return;
          }
          setMeta(`${width}×${height} px — recorte PKLotSegmented`);
          const prediction = await predictParkingSpot(file);
          setResult(prediction);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "MODEL_NOT_LOADED") {
          setError("No se pudo cargar la CNN.");
          setModelStatus("missing");
        } else if (msg === "XML_INVALID" || msg === "XML_NO_SPACES") {
          setError(
            "XML PKLot no válido. Debe contener etiquetas <space> con <contour> y puntos.",
          );
        } else {
          setError("No se pudo analizar la imagen.");
        }
      } finally {
        setLoading(false);
        setProgress(null);
      }
    },
    [modelStatus],
  );

  const handleFile = useCallback(
    async (file: File) => {
      await processImage(file, pendingXmlRef.current);
    },
    [processImage],
  );

  const handleXmlFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      pendingXmlRef.current = text;
      setXmlName(file.name);
      if (lastImageRef.current) {
        await processImage(lastImageRef.current, text);
      }
    },
    [processImage],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (modelStatus !== "ready" || loading) return;

      const files = Array.from(e.dataTransfer.files);
      const image = files.find((f) => f.type.startsWith("image/"));
      const xml = files.find(
        (f) =>
          f.name.toLowerCase().endsWith(".xml") ||
          f.type === "text/xml" ||
          f.type === "application/xml",
      );

      let xmlText = pendingXmlRef.current;
      if (xml) {
        xmlText = await xml.text();
        pendingXmlRef.current = xmlText;
        setXmlName(xml.name);
      }
      if (image) await processImage(image, xmlText);
    },
    [loading, modelStatus, processImage],
  );

  const canUpload = modelStatus === "ready" && !loading;

  const reset = () => {
    setPreview(null);
    setResult(null);
    setAerialResult(null);
    setViewMode(null);
    setError(null);
    setMeta(null);
    setProgress(null);
    setXmlName(null);
    pendingXmlRef.current = null;
    lastImageRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
    if (xmlInputRef.current) xmlInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <ModelStatusBanner status={modelStatus} source={modelSource} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-xl border-l-4 border-emerald-500 p-4">
          <p className="text-sm font-semibold text-emerald-300">Disponible</p>
          <p className="mt-1 text-xs text-slate-400">Marco verde por espacio libre</p>
        </div>
        <div className="glass rounded-xl border-l-4 border-red-500 p-4">
          <p className="text-sm font-semibold text-red-300">No disponible</p>
          <p className="mt-1 text-xs text-slate-400">Marco rojo solo con vehículo</p>
        </div>
        <div className="glass rounded-xl border-l-4 border-sky-500 p-4">
          <p className="text-sm font-semibold text-sky-300">Vista aérea PKLot</p>
          <p className="mt-1 text-xs text-slate-400">
            Imagen + XML → un polígono exacto por espacio
          </p>
        </div>
      </div>

      <div className="glass flex flex-wrap items-center gap-3 rounded-xl p-4 text-sm">
        <span className="text-slate-300">
          Vista aérea: primero el <code className="text-parking-300">.xml</code>, luego
          el <code className="text-parking-300">.jpg</code> (misma carpeta en Kaggle).
          O arrastra ambos a la vez.
        </span>
        <button
          type="button"
          disabled={!canUpload}
          onClick={() => xmlInputRef.current?.click()}
          className="rounded-lg bg-parking-500/20 px-3 py-1.5 text-xs text-parking-200 hover:bg-parking-500/30 disabled:opacity-50"
        >
          {xmlName ? `XML: ${xmlName}` : "Seleccionar XML PKLot"}
        </button>
        <input
          ref={xmlInputRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await handleXmlFile(file);
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className={`glass flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 transition ${
            canUpload
              ? "cursor-pointer border-white/20 hover:border-parking-400/50"
              : "cursor-not-allowed border-white/10 opacity-80"
          }`}
          onClick={() => canUpload && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={!canUpload}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {!preview ? (
            <>
              <div className="mb-4 text-4xl">🅿️</div>
              <p className="text-center text-lg font-medium">
                Sube foto aérea o recorte de un espacio
              </p>
              <p className="mt-2 max-w-sm text-center text-sm text-slate-400">
                Recorte de un espacio, o foto aérea + XML PKLot
              </p>
            </>
          ) : aerialResult && preview ? (
            <AerialOverlay imageUrl={preview} result={aerialResult} />
          ) : result && preview ? (
            <SpotFrame preview={preview} result={result} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Vista previa"
              className={`max-h-64 rounded-xl object-contain ${error ? "opacity-60" : ""}`}
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
          {meta && (
            <p className="mt-2 font-mono text-xs text-slate-500">{meta}</p>
          )}

          {loading && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-3 text-slate-300">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-parking-400 border-t-transparent" />
                {viewMode === "aerial"
                  ? progress ?? "Escaneando estacionamiento…"
                  : "CNN analizando recorte…"}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-amber-500/10 p-4 text-sm text-amber-200">
              <p className="font-semibold">No se pudo procesar</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {!loading && aerialResult && (
            <div className="mt-6 space-y-4">
              <div className="inline-flex rounded-full bg-parking-500/20 px-3 py-1 text-xs text-parking-300">
                Modo PKLot · CNN por espacio (XML)
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <p className="text-2xl font-bold text-emerald-400">
                    {aerialResult.available}
                  </p>
                  <p className="text-xs text-slate-400">Disponibles</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-3">
                  <p className="text-2xl font-bold text-red-400">
                    {aerialResult.occupied}
                  </p>
                  <p className="text-xs text-slate-400">Ocupados</p>
                </div>
                <div className="rounded-lg bg-slate-700/50 p-3">
                  <p className="text-2xl font-bold text-white">
                    {aerialResult.total}
                  </p>
                  <p className="text-xs text-slate-400">Detectados</p>
                </div>
              </div>
              <p className="text-sm text-slate-400">
                Utilización:{" "}
                <span className="text-white">
                  {((aerialResult.occupied / aerialResult.total) * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="mt-6">
              <div className="mb-3 text-xs text-parking-300">Modo recorte individual</div>
              <div
                className={`inline-flex rounded-full px-4 py-2 text-sm font-bold ${
                  result.label === "Occupied"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {result.label === "Occupied" ? "NO DISPONIBLE" : "DISPONIBLE"}
              </div>
              <p className="mt-4 text-4xl font-bold">
                {(result.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-slate-400">confianza CNN</p>
            </div>
          )}

          {!loading && !result && !aerialResult && !error && modelStatus === "ready" && (
            <p className="mt-4 text-slate-400">
              Sube un recorte de un espacio (64×64) o una vista aérea con su XML
              PKLot.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
