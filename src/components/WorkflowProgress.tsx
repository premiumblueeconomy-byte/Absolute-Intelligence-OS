import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Perceived-progress stage labels (spec: "Each stage should visibly show
// progress ... This makes the experience feel like an intelligence process,
// not an AI typing animation"). The underlying call is a single request, so
// this cycles honestly-labeled stages rather than claiming a real percentage.
const STAGES = [
  "Establishing reality",
  "Mapping evidence",
  "Identifying relationships",
  "Searching transformation pathways",
  "Evaluating markets",
  "Generating opportunities",
  "Challenging assumptions",
  "Ranking opportunities",
  "Preparing actions",
];

export function WorkflowProgress({ active }: { active: boolean }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) { setStage(0); return; }
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1500);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
      <Loader2 className="w-4 h-4 animate-spin text-accent" />
      <span>{STAGES[stage]}…</span>
    </div>
  );
}
