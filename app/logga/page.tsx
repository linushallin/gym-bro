import { MuscleGroupPicker } from "@/components/muscle-group-picker";

export default function LoggaPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vad tränar du idag?</h1>
        <p className="mt-1 text-sm text-muted">Välj en eller flera muskelgrupper — passet får namn efter dem.</p>
      </div>

      <MuscleGroupPicker />
    </div>
  );
}
