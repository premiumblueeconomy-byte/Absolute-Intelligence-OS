import { Loader2 } from "lucide-react";

export function WorkflowProgress({ active, swarm = false }: { active: boolean; swarm?: boolean }) {
  if (!active) return null;
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground py-3">
      <Loader2 className="w-4 h-4 animate-spin text-accent" />
      <span>{swarm ? "Analyzing with specialists, reviewing disagreements, and combining findings. This may take up to two minutes." : "Working on your request…"}</span>
    </div>
  );
}

