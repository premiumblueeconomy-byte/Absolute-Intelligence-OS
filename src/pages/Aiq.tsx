import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  AIQ_QUESTIONS, AIQ_DOMAIN_LABEL, classify, strengthsAndWeaknesses,
  recommendedExercises, saveAssessment, listAssessments, type AiqAssessment, type AiqDomain,
} from "@/lib/aiq";
import { cn } from "@/lib/utils";
import { Brain, RotateCcw } from "lucide-react";

const SCALE_LABEL: Record<number, string> = { 1: "Rarely", 2: "Sometimes", 3: "Often", 4: "Usually", 5: "Almost always" };

export default function Aiq() {
  const { ready } = useRequireAuth();
  const [history, setHistory] = useState<AiqAssessment[]>([]);
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const load = () => { void listAssessments().then((h) => { setHistory(h); setTaking(h.length === 0); }); };
  useEffect(() => { if (ready) load(); }, [ready]);

  const latest = history[0];

  const submit = async () => {
    if (Object.keys(answers).length < AIQ_QUESTIONS.length) {
      toast.error("Answer every question first");
      return;
    }
    setSaving(true);
    try {
      await saveAssessment(answers);
      setAnswers({});
      setTaking(false);
      load();
      toast.success("AIQ updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black flex items-center gap-2"><Brain className="w-5 h-5 text-accent" /> AIQ</h1>
          {!taking && latest && (
            <Button size="sm" variant="outline" onClick={() => setTaking(true)}><RotateCcw className="w-3.5 h-3.5" /> Retake</Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Absolute Intelligence Quotient — this platform helps train human intelligence, not just use AI.
        </p>

        {taking ? (
          <div className="space-y-4">
            {AIQ_QUESTIONS.map((q) => (
              <Card key={q.id} className="p-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{AIQ_DOMAIN_LABEL[q.domain]}</div>
                <p className="text-sm mb-3">{q.statement}</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
                      className={cn(
                        "flex-1 rounded-md border py-1.5 text-[11px] font-semibold transition-colors",
                        answers[q.id] === v ? "border-accent bg-accent/15 text-accent" : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {SCALE_LABEL[v]}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
            <Button onClick={submit} disabled={saving} variant="accent" size="lg">
              {saving ? "Scoring…" : "See my AIQ"}
            </Button>
          </div>
        ) : latest ? (
          <ResultsView assessment={latest} history={history} />
        ) : null}
      </main>
    </div>
  );
}

function ResultsView({ assessment, history }: { assessment: AiqAssessment; history: AiqAssessment[] }) {
  const domainScores = assessment.domain_scores as unknown as Record<AiqDomain, number>;
  const { strengths, weaknesses } = strengthsAndWeaknesses(domainScores);
  const classification = classify(assessment.overall_score);

  return (
    <div className="space-y-6">
      <Card className="p-6 text-center">
        <div className="text-5xl font-black text-accent">{assessment.overall_score}</div>
        <div className="text-sm font-bold mt-1">{classification.band}</div>
        <div className="text-xs text-muted-foreground">{classification.range} band</div>
      </Card>

      <div className="space-y-2">
        {(Object.keys(AIQ_DOMAIN_LABEL) as AiqDomain[]).map((d) => (
          <div key={d} className="flex items-center gap-3">
            <span className="text-xs w-44 shrink-0">{AIQ_DOMAIN_LABEL[d]}</span>
            <Progress value={(domainScores[d] ?? 0) * 10} className="flex-1" />
            <span className="text-xs w-10 text-right font-mono">{domainScores[d] ?? 0}/10</span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Strengths</h3>
          <ul className="space-y-1">
            {strengths.map((d) => <li key={d} className="text-sm">{AIQ_DOMAIN_LABEL[d]}</li>)}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Weaknesses</h3>
          <ul className="space-y-1">
            {weaknesses.map((d) => <li key={d} className="text-sm">{AIQ_DOMAIN_LABEL[d]}</li>)}
          </ul>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Recommended exercises</h3>
        <ul className="list-disc list-inside space-y-1">
          {recommendedExercises(weaknesses).map((e, i) => <li key={i} className="text-xs">{e}</li>)}
        </ul>
      </Card>

      {history.length > 1 && (
        <Card className="p-4">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">History</h3>
          <ul className="space-y-1">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</span>
                <span className="font-mono font-bold">{h.overall_score}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
