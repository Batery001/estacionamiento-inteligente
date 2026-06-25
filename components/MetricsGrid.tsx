import { METRICS } from "@/lib/projectData";

const items = [
  { key: "Accuracy", value: METRICS.accuracy, color: "text-parking-300" },
  { key: "Precision", value: METRICS.precision, color: "text-sky-300" },
  { key: "Recall", value: METRICS.recall, color: "text-violet-300" },
  { key: "F1-Score", value: METRICS.f1, color: "text-amber-300" },
] as const;

export function MetricsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.key} className="glass rounded-2xl p-5">
          <p className="text-sm text-slate-400">{item.key}</p>
          <p className={`mt-2 text-3xl font-bold ${item.color}`}>
            {(item.value * 100).toFixed(2)}%
          </p>
        </div>
      ))}
      <div className="glass rounded-2xl p-5 sm:col-span-2 lg:col-span-2">
        <p className="text-sm text-slate-400">Entrenamiento</p>
        <p className="mt-2 text-xl font-semibold text-white">
          {METRICS.trainingMinutes.toFixed(2)} min · {METRICS.epochs} épocas
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {METRICS.trainImages.toLocaleString("es-CL")} train ·{" "}
          {METRICS.valImages.toLocaleString("es-CL")} val
        </p>
      </div>
    </div>
  );
}
