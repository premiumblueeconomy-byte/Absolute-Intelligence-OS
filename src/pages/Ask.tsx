import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { listProjects, type Project } from "@/lib/projects";
import {
  createConversation, sendMessage, saveOpportunityFromMessage,
  buildQuestionTheQuestionPrompt, QUESTION_THE_QUESTION_AGENTS,
  MODE_AGENTS, MODE_LABEL, type ConversationMode, type Conversation,
} from "@/lib/conversations";
import type { AgentOutput } from "@/lib/ask-absolute";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Send, HelpCircle } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string; result?: AgentOutput };

export default function Ask() {
  const { ready } = useRequireAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [mode, setMode] = useState<ConversationMode>("understand");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (ready) void listProjects().then(setProjects); }, [ready]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns, sending]);

  const ensureConversation = async () => {
    if (conversation) return conversation;
    const c = await createConversation({ projectId: projectId || undefined, mode });
    setConversation(c);
    return c;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const content = input;
    setInput("");
    setTurns((t) => [...t, { role: "user", content }]);
    setSending(true);
    try {
      const c = await ensureConversation();
      const { result } = await sendMessage({
        conversationId: c.id,
        projectId: projectId || undefined,
        mode,
        content,
        context: projectId ? { projectId } : undefined,
      });
      setTurns((t) => [...t, { role: "assistant", content: result.summary, result }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reach the reasoning engine");
      setTurns((t) => t.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const questionTheQuestion = async () => {
    if (!input.trim() || sending) return;
    const content = input;
    setInput("");
    setTurns((t) => [...t, { role: "user", content }]);
    setSending(true);
    try {
      const c = await ensureConversation();
      const { result } = await sendMessage({
        conversationId: c.id,
        projectId: projectId || undefined,
        mode,
        content,
        promptOverride: buildQuestionTheQuestionPrompt(content),
        agentsOverride: QUESTION_THE_QUESTION_AGENTS,
        context: projectId ? { projectId } : undefined,
      });
      setTurns((t) => [...t, { role: "assistant", content: result.summary, result }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reach the reasoning engine");
      setTurns((t) => t.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const createOpportunity = async (result: AgentOutput, index: number) => {
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
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-6 flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-lg font-black">Ask Absolute</h1>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">No project (not saved)</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto scroll-strip pb-1">
          {(Object.keys(MODE_LABEL) as ConversationMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setConversation(null); }}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                mode === m ? "border-accent bg-accent/15 text-accent" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 mb-4">
          {turns.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
              Ask anything — a resource, a problem, an idea, a question. Mode: <strong>{MODE_LABEL[mode]}</strong>.
              Applied lenses: {MODE_AGENTS[mode].filter((a) => a !== "integrator_agent").map((a) => a.replace("_agent", "")).join(", ")}.
            </Card>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "flex justify-end" : ""}>
              <div className={t.role === "user" ? "max-w-[85%] rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm" : "max-w-full"}>
                {t.role === "user" ? t.content : <AssistantTurn result={t.result!} onCreateOpportunity={createOpportunity} />}
              </div>
            </div>
          ))}
          <WorkflowProgress active={sending} />
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submit} className="flex gap-2 sticky bottom-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a resource, problem, technology, market, place, company or idea…"
            className="min-h-11 resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(e as unknown as React.FormEvent); } }}
          />
          <Button
            type="button"
            title="Question the Question — reframe instead of answer"
            disabled={sending || !input.trim()}
            size="icon"
            variant="outline"
            onClick={questionTheQuestion}
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button type="submit" disabled={sending || !input.trim()} size="icon" variant="accent">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </main>
    </div>
  );
}

function AssistantTurn({ result, onCreateOpportunity }: { result: AgentOutput; onCreateOpportunity: (r: AgentOutput, i: number) => void }) {
  return (
    <Card className="p-4 space-y-3">
      <p className="text-sm">{result.summary}</p>

      {result.findings.length > 0 && (
        <Section title="Findings">
          <ul className="list-disc list-inside space-y-0.5">
            {result.findings.map((f, i) => <li key={i} className="text-xs text-muted-foreground">{f}</li>)}
          </ul>
        </Section>
      )}

      {result.opportunities.length > 0 && (
        <Section title="Opportunities">
          <div className="space-y-2">
            {result.opportunities.map((o, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{o.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{o.summary}</div>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => onCreateOpportunity(result, i)}>
                  Create Opportunity
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {result.risks.length > 0 && (
        <Section title="Risks">
          <ul className="list-disc list-inside space-y-0.5">
            {result.risks.map((r, i) => <li key={i} className="text-xs text-muted-foreground">{r}</li>)}
          </ul>
        </Section>
      )}

      {result.recommendations.length > 0 && (
        <Section title="Recommendations">
          <ul className="list-disc list-inside space-y-0.5">
            {result.recommendations.map((r, i) => <li key={i} className="text-xs text-muted-foreground">{r}</li>)}
          </ul>
        </Section>
      )}

      {result.next_actions.length > 0 && (
        <Section title="Next actions">
          <ul className="list-disc list-inside space-y-0.5">
            {result.next_actions.map((r, i) => <li key={i} className="text-xs text-muted-foreground">{r}</li>)}
          </ul>
        </Section>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Badge variant="outline">Confidence {result.confidence}/100</Badge>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      {children}
    </div>
  );
}
