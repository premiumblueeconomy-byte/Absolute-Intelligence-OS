import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  listExperiments, createExperiment, updateExperiment, deleteExperiment,
  EXPERIMENT_STATUS_ORDER, EXPERIMENT_STATUS_LABEL, type Experiment, type ExperimentStatus,
} from "@/lib/experiments";
import type { Opportunity } from "@/lib/opportunities";
import { Plus, Trash2, Beaker } from "lucide-react";

const STATUS_BADGE: Record<ExperimentStatus, "outline" | "verified" | "weakEvidence" | "probable"> = {
  draft: "outline", planned: "outline", running: "probable",
  completed: "outline", validated: "verified", invalidated: "weakEvidence", failed: "weakEvidence",
};

export function ExperimentsTab({ opportunity }: { opportunity: Opportunity }) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");

  const load = () => { void listExperiments(opportunity.id).then(setExperiments); };
  useEffect(load, [opportunity.id]);

  const add = async () => {
    if (!title.trim()) return;
    await createExperiment({ opportunityId: opportunity.id, title, hypothesis });
    setTitle(""); setHypothesis("");
    load();
  };

  const cycleStatus = async (exp: Experiment) => {
    const idx = EXPERIMENT_STATUS_ORDER.indexOf(exp.status);
    const next = EXPERIMENT_STATUS_ORDER[(idx + 1) % EXPERIMENT_STATUS_ORDER.length];
    await updateExperiment(exp.id, { status: next });
    load();
  };

  const save = async (id: string, patch: Partial<Experiment>) => {
    try {
      await updateExperiment(id, patch);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold">Design an experiment</span>
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you testing?" />
        <Textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="Hypothesis / dangerous assumption to eliminate" />
        <Button size="sm" onClick={add}><Plus className="w-3.5 h-3.5" /> Add experiment</Button>
      </Card>

      {experiments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Spend small amounts to eliminate dangerous assumptions before spending large amounts.
        </p>
      ) : (
        <div className="space-y-3">
          {experiments.map((exp) => (
            <ExperimentCard key={exp.id} exp={exp} onCycleStatus={() => cycleStatus(exp)} onSave={save} onDelete={() => deleteExperiment(exp.id).then(load)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExperimentCard({
  exp, onCycleStatus, onSave, onDelete,
}: {
  exp: Experiment;
  onCycleStatus: () => void;
  onSave: (id: string, patch: Partial<Experiment>) => void;
  onDelete: () => void;
}) {
  const [method, setMethod] = useState(exp.method);
  const [successMetric, setSuccessMetric] = useState(exp.success_metric);
  const [actualResult, setActualResult] = useState(exp.actual_result);
  const [learning, setLearning] = useState(exp.learning);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold">{exp.title}</div>
          {exp.hypothesis && <p className="text-xs text-muted-foreground mt-0.5">{exp.hypothesis}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onCycleStatus}>
            <Badge variant={STATUS_BADGE[exp.status]}>{EXPERIMENT_STATUS_LABEL[exp.status]}</Badge>
          </button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Method</label>
          <Textarea value={method} onChange={(e) => setMethod(e.target.value)} onBlur={() => onSave(exp.id, { method })} className="text-xs min-h-14" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Success metric / threshold</label>
          <Textarea value={successMetric} onChange={(e) => setSuccessMetric(e.target.value)} onBlur={() => onSave(exp.id, { success_metric: successMetric })} className="text-xs min-h-14" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Actual result</label>
          <Textarea value={actualResult} onChange={(e) => setActualResult(e.target.value)} onBlur={() => onSave(exp.id, { actual_result: actualResult })} className="text-xs min-h-14" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Learning</label>
          <Textarea value={learning} onChange={(e) => setLearning(e.target.value)} onBlur={() => onSave(exp.id, { learning })} className="text-xs min-h-14" />
        </div>
      </div>
    </Card>
  );
}
