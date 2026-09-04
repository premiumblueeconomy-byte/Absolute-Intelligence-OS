import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  listTasks, createTask, updateTaskStatus, deleteTask, seedDefaultRoadmap,
  PHASE_LABEL, PHASE_ORDER, STATUS_ORDER, type Task, type TaskPhase, type TaskStatus,
} from "@/lib/execution";
import type { Opportunity } from "@/lib/opportunities";
import { Plus, Trash2, Rocket } from "lucide-react";

const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", blocked: "Blocked", done: "Done" };

export function ExecutionTab({ opportunity }: { opportunity: Opportunity }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<TaskPhase>("validation");
  const [owner, setOwner] = useState("");
  const [seeding, setSeeding] = useState(false);

  const load = () => { void listTasks(opportunity.id).then(setTasks); };
  useEffect(load, [opportunity.id]);

  const seed = async () => {
    setSeeding(true);
    try {
      await seedDefaultRoadmap(opportunity.id, opportunity.recommended_next_action);
      load();
      toast.success("12-month roadmap created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not seed the roadmap");
    } finally {
      setSeeding(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask({ opportunityId: opportunity.id, title, phase, owner });
    setTitle(""); setOwner("");
    load();
  };

  const cycleStatus = async (task: Task) => {
    const idx = STATUS_ORDER.indexOf(task.status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    await updateTaskStatus(task.id, next);
    load();
  };

  const remove = async (id: string) => {
    await deleteTask(id);
    load();
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-3">Intelligence becomes valuable when it reaches action.</p>
        <Button onClick={seed} disabled={seeding} variant="accent">
          <Rocket className="w-4 h-4" /> {seeding ? "Building…" : "Build 12-month execution plan"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex flex-wrap gap-2 items-end">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="flex-1 min-w-40" />
        <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner" className="w-32" />
        <select value={phase} onChange={(e) => setPhase(e.target.value as TaskPhase)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
          {PHASE_ORDER.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
        </select>
        <Button type="submit" size="sm"><Plus className="w-3.5 h-3.5" /> Add task</Button>
      </form>

      {PHASE_ORDER.map((p) => {
        const inPhase = tasks.filter((t) => t.phase === p);
        if (inPhase.length === 0) return null;
        return (
          <div key={p}>
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">{PHASE_LABEL[p]}</h3>
            <ul className="space-y-1.5">
              {inPhase.map((t) => (
                <li key={t.id}>
                  <Card className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {t.owner || "Unassigned"}{t.deadline ? ` · due ${t.deadline}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => cycleStatus(t)}>
                        <Badge variant={t.status === "done" ? "verified" : t.status === "blocked" ? "weakEvidence" : "outline"}>
                          {STATUS_LABEL[t.status]}
                        </Badge>
                      </button>
                      <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
