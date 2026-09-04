import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  listScenarios, saveScenario, deleteScenario, calculateScenario,
  SCENARIO_TYPE_LABEL, type Scenario, type ScenarioType, type ScenarioVariable, type ScenarioResults,
} from "@/lib/scenarios";
import { opportunityDims, type Opportunity } from "@/lib/opportunities";
import { Plus, Trash2, FlaskConical } from "lucide-react";

const EMPTY_VAR = (): ScenarioVariable => ({ name: "", unit: "", baselineValue: 100, newValue: 100, marginImpactPerPercent: 0 });

export function ScenariosTab({ opportunity }: { opportunity: Opportunity }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<ScenarioType>("adverse");
  const [baselineMargin, setBaselineMargin] = useState(30);
  const [variables, setVariables] = useState<ScenarioVariable[]>([EMPTY_VAR()]);
  const [preview, setPreview] = useState<ScenarioResults | null>(null);

  const load = () => { void listScenarios(opportunity.id).then(setScenarios); };
  useEffect(load, [opportunity.id]);

  useEffect(() => {
    setPreview(calculateScenario(opportunityDims(opportunity), baselineMargin, variables));
  }, [opportunity, baselineMargin, variables]);

  const updateVar = (i: number, patch: Partial<ScenarioVariable>) =>
    setVariables((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const save = async () => {
    if (!name.trim() || !preview) return;
    try {
      await saveScenario({ opportunityId: opportunity.id, name, scenarioType: type, variables, results: preview });
      setName("");
      setVariables([EMPTY_VAR()]);
      load();
      toast.success("Scenario saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save scenario");
    }
  };

  const remove = async (id: string) => { await deleteScenario(id); load(); };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold">Build a scenario</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scenario name" />
          <select value={type} onChange={(e) => setType(e.target.value as ScenarioType)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
            {(Object.keys(SCENARIO_TYPE_LABEL) as ScenarioType[]).map((t) => <option key={t} value={t}>{SCENARIO_TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground w-40">Baseline margin (%)</label>
          <Input type="number" value={baselineMargin} onChange={(e) => setBaselineMargin(Number(e.target.value))} className="w-24" />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Variables</div>
          {variables.map((v, i) => (
            <div key={i} className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.9fr_auto] gap-2 items-center">
              <Input value={v.name} onChange={(e) => updateVar(i, { name: e.target.value })} placeholder="e.g. Feedstock cost" className="h-8 text-xs" />
              <Input value={v.unit} onChange={(e) => updateVar(i, { unit: e.target.value })} placeholder="Unit" className="h-8 text-xs" />
              <Input type="number" value={v.baselineValue} onChange={(e) => updateVar(i, { baselineValue: Number(e.target.value) })} placeholder="Baseline" className="h-8 text-xs" />
              <Input type="number" value={v.newValue} onChange={(e) => updateVar(i, { newValue: Number(e.target.value) })} placeholder="New" className="h-8 text-xs" />
              <Input
                type="number" step="0.1" min={-1} max={1}
                value={v.marginImpactPerPercent}
                onChange={(e) => updateVar(i, { marginImpactPerPercent: Number(e.target.value) })}
                placeholder="Impact -1..1" className="h-8 text-xs"
              />
              <button onClick={() => setVariables((vs) => vs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setVariables((vs) => [...vs, EMPTY_VAR()])}>
            <Plus className="w-3.5 h-3.5" /> Add variable
          </Button>
        </div>

        {preview && (
          <div className="rounded-md border border-border p-3 grid grid-cols-2 gap-3 text-xs">
            <div>Projected margin: <strong>{preview.projectedMargin}%</strong> ({preview.marginDeltaPct >= 0 ? "+" : ""}{preview.marginDeltaPct}%)</div>
            <div>Opportunity score: <strong>{preview.baselineOpportunityScore}</strong> → <strong>{preview.projectedOpportunityScore}</strong></div>
            <div className="col-span-2 text-muted-foreground">
              Risk under this scenario is <strong>{preview.riskDelta}</strong> than baseline. This is an illustrative
              sensitivity model based on the weights you set, not a financial forecast.
            </div>
          </div>
        )}

        <Button onClick={save} disabled={!name.trim()}>Save scenario</Button>
      </Card>

      {scenarios.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Saved scenarios</h3>
          {scenarios.map((s) => {
            const r = s.results as unknown as ScenarioResults;
            return (
              <Card key={s.id} className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Margin {r.projectedMargin}% · Score {r.projectedOpportunityScore} · Risk {r.riskDelta}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline">{SCENARIO_TYPE_LABEL[s.scenario_type]}</Badge>
                  <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
