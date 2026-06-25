import { ARCHITECTURE, DATASET_INFO } from "@/lib/projectData";
import { ImageDetector } from "@/components/ImageDetector";
import { MetricsGrid } from "@/components/MetricsGrid";

const sections = [
  { id: "inicio", label: "Inicio" },
  { id: "demo", label: "Demo" },
  { id: "modelo", label: "Modelo" },
  { id: "dataset", label: "Dataset" },
  { id: "arquitectura", label: "Arquitectura" },
] as const;

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-parking-900/40 via-transparent to-transparent" />

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-parking-500 font-bold text-white">
              P
            </div>
            <div>
              <p className="font-semibold">Estacionamiento Inteligente</p>
              <p className="text-xs text-slate-400">Proyecto 4 · Visión Artificial</p>
            </div>
          </div>
          <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="hover:text-parking-300">
                {s.label}
              </a>
            ))}
          </nav>
          <a
            href="https://github.com/Batery001/estacionamiento-inteligente"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg glass px-4 py-2 text-sm hover:bg-white/10"
          >
            GitHub
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <section id="inicio" className="mb-20">
          <span className="rounded-full bg-parking-500/20 px-3 py-1 text-xs font-medium text-parking-300">
            Hitos 5 y 6 · CNN
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Gestión inteligente de estacionamientos con{" "}
            <span className="text-parking-400">redes neuronales convolucionales</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Detección automática de espacios <strong>ocupados</strong> y{" "}
            <strong>vacíos</strong> usando el dataset PKLot. Split por dominio
            (PUCPR/UFPR04 → entrenamiento, UFPR05 → validación) para evitar
            fuga de datos entre cámaras.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#demo"
              className="rounded-xl bg-parking-500 px-6 py-3 font-semibold text-white transition hover:bg-parking-400"
            >
              Probar demo
            </a>
            <a
              href="#modelo"
              className="rounded-xl glass px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              Ver métricas CNN
            </a>
          </div>
        </section>

        <section id="demo" className="mb-20">
          <h2 className="mb-2 text-2xl font-bold">Demo de detección</h2>
          <p className="mb-8 max-w-3xl text-slate-400">
            Sube una <strong className="text-slate-200">vista aérea</strong> del
            estacionamiento o un recorte de un espacio. La CNN encasilla cada
            slot en <span className="text-emerald-400">verde</span> (disponible)
            o <span className="text-red-400">rojo</span> (ocupado).
          </p>
          <ImageDetector />
        </section>

        <section id="modelo" className="mb-20">
          <h2 className="mb-2 text-2xl font-bold">Resultados del entrenamiento CNN</h2>
          <p className="mb-8 text-slate-400">
            Métricas de validación registradas en el notebook (época 5, split UFPR05).
          </p>
          <MetricsGrid />
        </section>

        <section id="dataset" className="mb-20">
          <h2 className="mb-6 text-2xl font-bold">Dataset y preparación (Hito 5)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-parking-300">{DATASET_INFO.name}</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>
                  <span className="text-slate-500">Fuente:</span> {DATASET_INFO.source}
                </li>
                <li>
                  <span className="text-slate-500">Train:</span> {DATASET_INFO.trainDomains}
                </li>
                <li>
                  <span className="text-slate-500">Validación:</span> {DATASET_INFO.valDomain}
                </li>
                <li>
                  <span className="text-slate-500">Clases:</span>{" "}
                  {DATASET_INFO.classes.join(", ")}
                </li>
                <li>
                  <span className="text-slate-500">Tamaño:</span> {DATASET_INFO.imageSize}
                </li>
              </ul>
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-parking-300">Data augmentation</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {DATASET_INFO.augmentation.map((a) => (
                  <li key={a}>✓ {a}</li>
                ))}
                <li>✓ Normalización rescale 1/255</li>
                <li>✓ Limpieza y split cross-domain</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="arquitectura" className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Arquitectura del sistema</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-2xl p-6 font-mono text-sm">
              <pre className="whitespace-pre text-slate-300">{`Usuario
   │
   ▼
Frontend (Next.js / Vercel)  ← estás aquí
   │
   ▼
Notebook CNN (Colab) — entrenamiento PKLot
   │
   ▼
Clasificación: Empty | Occupied`}</pre>
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="mb-4 font-semibold">Capas CNN (Hito 6)</h3>
              <ol className="space-y-2 text-sm text-slate-300">
                {ARCHITECTURE.map((layer, i) => (
                  <li key={layer}>
                    <span className="text-parking-400">{i + 1}.</span> {layer}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-slate-500">
                Optimizer: Adam · Loss: binary_crossentropy · EarlyStopping
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-sm text-slate-500">
        Proyecto Integrador · Aprendizaje Automático · Visión Artificial
      </footer>
    </div>
  );
}
