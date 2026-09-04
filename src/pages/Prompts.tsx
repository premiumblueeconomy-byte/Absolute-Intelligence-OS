import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { listPromptTemplates, groupByCategory, fillTemplate, extractPlaceholders, type PromptTemplate } from "@/lib/prompts";
import { listProjects, type Project } from "@/lib/projects";
import { runIntelligenceWorkflow, type AgentOutput } from "@/lib/ask-absolute";
import { saveOpportunityFromMessage } from "@/lib/conversations";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function Prompts() {
  const { ready } = useRequireAuth();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [active, setActive] = useState<PromptTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentOutput | null>(null);

  useEffect(() => {
    if (!ready) return;
    void listPromptTemplates().then(setPrompts);
    void listProjects().then(setProjects);
  }, [ready]);

  const groups = groupByCategory(prompts);

  const openPrompt = (p: PromptTemplate) => {
    setActive(p);
    setValues({});
    setResult(null);
  };

  const run = async () => {
    if (!active) return;
    setRunning(true);
    setResult(null);
    try {
      const filled = fillTemplate(active.template, values);
      const r = await runIntelligenceWorkflow({
        mode: "discover",
        agents: active.workflow,
        prompt: filled,
        context: projectId ? { projectId } : undefined,
      });
      setResult(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not run this prompt");
    } finally {
      setRunning(false);
    }
  };

  const createOpportunity = async (index: number) => {
    if (!result) return;
    if (!projectId) { toast.error("Pick a project first"); return; }
    try {
      await saveOpportunityFromMessage({ projectId, result, opportunityIndex: index });
      toast.success("Opportunity saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save opportunity");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-2xl font-black">Prompt Library</h1>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">No project (not saved)</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <p className="text-sm text-muted-foreground mb-6">50 flagship prompts, each wired to its own agent workflow.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {Object.entries(groups).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">{category}</h2>
                <ul className="space-y-1.5">
                  {items.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => openPrompt(p)}
                        className={`w-full text-left rounded-md border p-2.5 text-xs transition-colors ${
                          active?.id === p.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"
                        }`}
                      >
                        <span className="font-mono text-muted-foreground mr-1.5">#{p.prompt_number}</span>
                        {p.template}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            {!active ? (
              <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">Select a prompt to run it.</Card>
            ) : (
              <Card className="p-5 space-y-4">
                <div>
                  <Badge variant="outline">{active.category}</Badge>
                  <p className="text-sm mt-2">{active.template}</p>
                </div>
                {extractPlaceholders(active.template).map((ph) => (
                  <div key={ph} className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{ph}</label>
                    <Input value={values[ph] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [ph]: e.target.value }))} />
                  </div>
                ))}
                <Button onClick={run} disabled={running} variant="accent">{running ? "Running…" : "Run this prompt"}</Button>
                <WorkflowProgress active={running} />

                {result && (
                  <div className="pt-2 space-y-3 border-t border-border">
                    <p className="text-sm">{result.summary}</p>
                    {result.opportunities.map((o, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{o.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{o.summary}</div>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => createOpportunity(i)}>
                          Create Opportunity
                        </Button>
                      </div>
                    ))}
                    <Badge variant="outline">Confidence {result.confidence}/100</Badge>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
