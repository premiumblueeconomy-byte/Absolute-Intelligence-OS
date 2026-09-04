import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listProjects, createProject, type Project } from "@/lib/projects";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Plus, ArrowRight } from "lucide-react";

export default function Projects() {
  const { ready } = useRequireAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [objective, setObjective] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => { void listProjects().then(setProjects); };
  useEffect(() => { if (ready) load(); }, [ready]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createProject({ title, locationCountry: country, industry, objective });
      setTitle(""); setCountry(""); setIndustry(""); setObjective("");
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">Projects</h1>
          <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? "outline" : "accent"}>
            <Plus className="w-4 h-4" /> New project
          </Button>
        </div>

        {showForm && (
          <Card className="p-5 mb-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Coconut Shell Ghana" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Ghana" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="objective">Objective</Label>
                <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What are you trying to unlock?" />
              </div>
              <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create project"}</Button>
            </form>
          </Card>
        )}

        {projects.length === 0 && !showForm ? (
          <Card className="p-10 text-center border-dashed">
            <p className="text-sm font-semibold">Your intelligence work begins here.</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first project to start unlocking opportunities.</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link to="/projects/$projectId" params={{ projectId: p.id }}>
                  <Card className="p-4 flex items-center justify-between hover:border-accent/50 transition-colors">
                    <div>
                      <div className="text-sm font-bold">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {[p.location_country, p.industry].filter(Boolean).join(" · ") || "No location or industry set"}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
