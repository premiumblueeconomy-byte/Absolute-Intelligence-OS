import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PERSONAS } from "@/lib/personas";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Persona } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [country, setCountry] = useState("");
  const [organization, setOrganization] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user || !persona) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ persona, country, organization, onboarded: true })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 md:px-6 py-14">
        <h1 className="text-2xl font-black">Who's unlocking opportunities today?</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          This tunes your dashboard, suggested prompts and opportunity-ranking weights.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-8">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersona(p.id)}
              className={cn(
                "text-left rounded-lg border p-3 transition-colors",
                persona === p.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/40",
              )}
            >
              <div className="text-sm font-bold">{p.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{p.blurb}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Nigeria" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org">Organization</Label>
            <Input id="org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <Button disabled={!persona || saving} onClick={submit} size="lg" variant="accent">
          {saving ? "Saving…" : "Enter Absolute Intelligence OS"}
        </Button>
      </main>
    </div>
  );
}
