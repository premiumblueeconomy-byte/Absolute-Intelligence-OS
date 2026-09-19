import { useEffect, useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { listPromptTemplates, groupByCategory, filterPrompts, extractPlaceholders, type PromptTemplate } from "@/lib/prompts";
import { listProjects, type Project } from "@/lib/projects";
import { runIntelligenceWorkflow, type AgentOutput } from "@/lib/ask-absolute";
import { saveOpportunityFromMessage } from "@/lib/conversations";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function Prompts() {
  const { ready } = useRequireAuth();
  const navigate = useNavigate();
  const savingRef = useRef(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [active, setActive] = useState<PromptTemplate | null>(null);
  const [draft, setDraft] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentOutput | null>(null);

  useEffect(() => {
    if (!active) return;
    editorRef.current?.focus({ preventScroll: true });
    editorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    void listPromptTemplates().then((items) => { if (!cancelled) setPrompts(items); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    void listProjects().then((items) => { if (!cancelled) setProjects(items); })
      .catch(() => { if (!cancelled) toast.error("Could not load existing projects. You can still create one when saving."); });
    return () => { cancelled = true; };
  }, [ready, reload]);

  const filtered = filterPrompts(prompts, query, category);
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const groups = groupByCategory(filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize));
  const categories = [...new Set(prompts.map((p) => p.category))];
  const changePage = (next: number) => {
    setPage(next);
    listRef.current?.scrollTo({ top: 0 });
  };

  const openPrompt = (p: PromptTemplate) => {
    if (running || savingRef.current) return;
    if (active?.id === p.id) {
      editorRef.current?.focus();
      return;
    }
    setActive(p);
    setDraft(p.template);
    setResult(null);
  };

  const run = async () => {
    if (!active || running || savingRef.current) return;
    const prompt = draft.trim();
    if (!prompt) {
      toast.error("Enter your prompt first."); return;
    }
    if (prompt.length > 20000) {
      toast.error("Keep your prompt under 20,000 characters."); return;
    }
    if (extractPlaceholders(prompt).length) {
      toast.error("Replace the bracketed fields with your details before generating.");
      editorRef.current?.focus();
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const r = await runIntelligenceWorkflow({
        mode: "discover",
        agents: active.workflow,
        prompt,
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
    if (!result || savingRef.current) return;
    savingRef.current = true;
    setSaving(index);
    try {
      const saved = await saveOpportunityFromMessage({ projectId, result, opportunityIndex: index });
      setProjectId(saved.projectId);
      toast.success("Opportunity saved");
      void navigate({ to: "/opportunities/$opportunityId", params: { opportunityId: saved.opportunityId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save opportunity");
    } finally { savingRef.current = false; setSaving(null); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h1 className="text-2xl font-black">Prompt Library</h1>
          <select
            aria-label="Project for new opportunities"
            disabled={running || saving !== null}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">Create a project automatically</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <p className="text-sm text-muted-foreground mb-2">Unveil hidden value, unexpected connections, and opportunities worth testing. Generate with specialist agents, a critical review, and a combined recommendation.</p>
        <p className="text-xs text-muted-foreground mb-6">Creating an opportunity also creates its project unless you select one.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="space-y-2">
              <Input aria-label="Search prompts" placeholder="Search ideas, sectors, or #1000…" value={query}
                onChange={(e) => { setQuery(e.target.value); changePage(0); }} />
              <select aria-label="Prompt category" value={category}
                onChange={(e) => { setCategory(e.target.value); changePage(0); }}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All categories</option>
                {categories.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <p className="text-xs text-muted-foreground" role="status">
                {loading ? "Loading prompts…" : loadError ? "Could not load the library." :
                  `${filtered.length.toLocaleString("en-US")} of ${prompts.length.toLocaleString("en-US")} prompts · ${categories.length} categories`}
              </p>
              {loadError && <Button variant="outline" size="sm" onClick={() => setReload((n) => n + 1)}>Retry loading prompts</Button>}
            </div>
            <div ref={listRef} className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {!loading && !loadError && filtered.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                <p>No prompts match your search.</p>
                <Button variant="link" onClick={() => { setQuery(""); setCategory(""); changePage(0); }}>Clear filters</Button>
              </div>
            )}
            {Object.entries(groups).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">{category}</h2>
                <ul className="space-y-1.5">
                  {items.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => openPrompt(p)}
                        disabled={running || saving !== null}
                        aria-pressed={active?.id === p.id}
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
            {!loading && !loadError && filtered.length > 0 && (
              <nav aria-label="Prompt pages" className="flex items-center justify-between gap-2">
                <Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>Previous</Button>
                <span className="text-xs text-muted-foreground">Page {currentPage + 1} of {pages}</span>
                <Button size="sm" variant="outline" disabled={currentPage >= pages - 1} onClick={() => changePage(currentPage + 1)}>Next</Button>
              </nav>
            )}
          </div>

          <div>
            {!active ? (
              <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">Select a prompt, edit it with your details, then generate.</Card>
            ) : (
              <Card className="p-5 space-y-4">
                <div>
                  <Badge variant="outline">{active.category}</Badge>
                </div>
                <div className="space-y-2">
                  <label htmlFor="editable-prompt" className="text-sm font-semibold">Edit your prompt</label>
                  <p id="prompt-edit-help" className="text-xs text-muted-foreground">Replace bracketed fields such as [SUBJECT] with your details. You can rewrite any part or add more context before generating.</p>
                  <Textarea ref={editorRef} id="editable-prompt" aria-describedby="prompt-edit-help"
                    rows={12} maxLength={20000} value={draft} disabled={running || saving !== null}
                    className="min-h-64 resize-y text-sm leading-relaxed"
                    onChange={(e) => { setDraft(e.target.value); setResult(null); }} />
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" disabled={running || saving !== null || draft === active.template}
                      onClick={() => { setDraft(active.template); setResult(null); editorRef.current?.focus(); }}>Reset to original</Button>
                    <span className="text-xs text-muted-foreground">{draft.length.toLocaleString("en-US")} / 20,000</span>
                  </div>
                </div>
                <Button onClick={run} disabled={running || saving !== null || !draft.trim()} variant="accent">{running ? "Generating…" : "Generate with swarm intelligence"}</Button>
                <WorkflowProgress active={running} swarm />

                {result && (
                  <div className="pt-2 space-y-3 border-t border-border">
                    <p className="text-sm">{result.summary}</p>
                    {result.swarm && <Badge variant="outline">{result.swarm.agents.length} agents · cross-reviewed</Badge>}
                    {result.opportunities.map((o, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{o.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{o.summary}</div>
                        </div>
                        <Button size="sm" variant="outline" disabled={saving !== null} className="shrink-0 h-7 text-xs" onClick={() => createOpportunity(i)}>
                          {saving === i ? "Creating…" : "Create Opportunity"}
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


