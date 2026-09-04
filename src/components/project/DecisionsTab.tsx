import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listDecisions, createDecision, updateDecisionOutcome, deleteDecision, type Decision } from "@/lib/decisions";
import { Plus, Trash2, ScrollText } from "lucide-react";

export function DecisionsTab({ projectId }: { projectId: string }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [decision, setDecision] = useState("");
  const [decisionMaker, setDecisionMaker] = useState("");
  const [context, setContext] = useState("");
  const [optionsConsidered, setOptionsConsidered] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");

  const load = () => { void listDecisions(projectId).then(setDecisions); };
  useEffect(load, [projectId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision.trim()) return;
    try {
      await createDecision({ projectId, decision, decisionMaker, context, optionsConsidered, expectedOutcome });
      setDecision(""); setDecisionMaker(""); setContext(""); setOptionsConsidered(""); setExpectedOutcome("");
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save decision");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Institutional memory — every important decision, its expected outcome, and what actually happened.</p>
        <Button size="sm" variant={showForm ? "outline" : "default"} onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-3.5 h-3.5" /> Log a decision
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={submit} className="space-y-3">
            <Textarea value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="What did you decide?" required />
            <div className="grid grid-cols-2 gap-2">
              <Input value={decisionMaker} onChange={(e) => setDecisionMaker(e.target.value)} placeholder="Decision maker" />
              <Input value={expectedOutcome} onChange={(e) => setExpectedOutcome(e.target.value)} placeholder="Expected outcome" />
            </div>
            <Textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Context" />
            <Textarea value={optionsConsidered} onChange={(e) => setOptionsConsidered(e.target.value)} placeholder="Options considered" />
            <Button type="submit" size="sm">Save</Button>
          </form>
        </Card>
      )}

      {decisions.length === 0 && !showForm ? (
        <Card className="p-8 text-center border-dashed">
          <ScrollText className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No decisions logged yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {decisions.map((d) => (
            <DecisionCard key={d.id} decision={d} onSaveOutcome={load} onDelete={() => deleteDecision(d.id).then(load)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DecisionCard({ decision, onSaveOutcome, onDelete }: { decision: Decision; onSaveOutcome: () => void; onDelete: () => void }) {
  const [actualOutcome, setActualOutcome] = useState(decision.actual_outcome);
  const [learning, setLearning] = useState(decision.learning);

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{decision.decision}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {decision.decided_at}{decision.decision_maker ? ` · ${decision.decision_maker}` : ""}
          </p>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {decision.context && <p className="text-xs text-muted-foreground">{decision.context}</p>}
      {decision.expected_outcome && <p className="text-xs"><span className="text-muted-foreground">Expected:</span> {decision.expected_outcome}</p>}
      <div className="grid md:grid-cols-2 gap-2 pt-1">
        <Textarea
          value={actualOutcome} onChange={(e) => setActualOutcome(e.target.value)}
          onBlur={() => updateDecisionOutcome(decision.id, actualOutcome, learning).then(onSaveOutcome)}
          placeholder="Actual outcome" className="text-xs min-h-12"
        />
        <Textarea
          value={learning} onChange={(e) => setLearning(e.target.value)}
          onBlur={() => updateDecisionOutcome(decision.id, actualOutcome, learning).then(onSaveOutcome)}
          placeholder="Learning" className="text-xs min-h-12"
        />
      </div>
    </Card>
  );
}
