import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScoreRadar } from "@/components/ScoreRadar";
import {
  getOpportunity, opportunityDims, listAssumptions, listUnknowns, listClaims, listEvidence,
  updateOpportunityWeights, updateOpportunityStatus,
  type Opportunity, type Assumption, type Unknown_, type Claim, type Evidence,
} from "@/lib/opportunities";
import { getProject, type Project } from "@/lib/projects";
import { DEFAULT_WEIGHTS, DIMENSION_LABEL, readinessLabel, type ScoreDimensions } from "@/lib/scoring";
import { assembleOpportunityReport, saveReport } from "@/lib/reports";
import { exportReportPdf } from "@/lib/report-pdf";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { unlockFurther } from "@/lib/unlock-further";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { RedTeamTab } from "@/components/opportunity/RedTeamTab";
import { ExecutionTab } from "@/components/opportunity/ExecutionTab";
import { ScenariosTab } from "@/components/opportunity/ScenariosTab";
import { ExperimentsTab } from "@/components/opportunity/ExperimentsTab";
import { FileDown, Loader2, Sparkles } from "lucide-react";

const STATUS_OPTIONS: Opportunity["status"][] = [
  "signal", "discovered", "hypothesis", "investigating", "validating",
  "prototype", "pilot", "commercial_validation", "scale", "rejected",
];

const EVIDENCE_BADGE: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
  verified: { variant: "verified", label: "Verified" },
  probable: { variant: "probable", label: "Probable" },
  needs_validation: { variant: "needsValidation", label: "Needs validation" },
  weak_evidence: { variant: "weakEvidence", label: "Weak evidence" },
  unknown: { variant: "unknown", label: "Unknown" },
  contradicted: { variant: "contradicted", label: "Contradicted" },
};

export default function OpportunityDetail() {
  const { ready } = useRequireAuth();
  const { opportunityId } = useParams({ from: "/opportunities/$opportunityId" });
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [unknowns, setUnknowns] = useState<Unknown_[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [weights, setWeights] = useState<Record<keyof ScoreDimensions, number>>(DEFAULT_WEIGHTS);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    const o = await getOpportunity(opportunityId);
    setOpportunity(o);
    if (o) {
      const [p, a, u, c, e] = await Promise.all([
        getProject(o.project_id), listAssumptions(o.id), listUnknowns(o.id), listClaims(o.id), listEvidence(o.id),
      ]);
      setProject(p); setAssumptions(a); setUnknowns(u); setClaims(c); setEvidence(e);
    }
  };
  useEffect(() => { if (ready) void load(); }, [opportunityId, ready]);

  const dims = useMemo(() => (opportunity ? opportunityDims(opportunity) : null), [opportunity]);

  const applyWeights = async () => {
    if (!opportunity || !dims) return;
    try {
      const score = await updateOpportunityWeights(opportunity.id, dims, weights);
      setOpportunity({ ...opportunity, opportunity_score: score });
      toast.success("Weights applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update weights");
    }
  };

  const changeStatus = async (status: Opportunity["status"]) => {
    if (!opportunity) return;
    await updateOpportunityStatus(opportunity.id, status);
    setOpportunity({ ...opportunity, status });
  };

  const [unlocking, setUnlocking] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState<number | null>(null);
  const runUnlockFurther = async () => {
    if (!opportunity) return;
    setUnlocking(true);
    setUnlockedCount(null);
    try {
      const { created } = await unlockFurther(opportunity);
      setUnlockedCount(created.length);
      toast.success(`${created.length} new opportunities unlocked`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not unlock further");
    } finally {
      setUnlocking(false);
    }
  };

  const generateReport = async () => {
    if (!opportunity || !project) return;
    setExporting(true);
    try {
      const content = await assembleOpportunityReport(project, opportunity);
      await saveReport({ projectId: project.id, opportunityId: opportunity.id, title: content.title, content });
      exportReportPdf(content);
      toast.success("Report downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate report");
    } finally {
      setExporting(false);
    }
  };

  if (!opportunity || !dims) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav />
        <main className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</main>
      </div>
    );
  }

  const readiness = readinessLabel(opportunity.opportunity_score);
  const maturity = [
    { label: "Evidence", value: evidence.length ? Math.round((evidence.filter((e) => ["verified", "probable"].includes(e.status)).length / evidence.length) * 100) : 0 },
    { label: "Technology", value: opportunity.technology_readiness },
    { label: "Market", value: opportunity.market_attractiveness },
    { label: "Economics", value: opportunity.financial_attractiveness },
    { label: "Execution", value: opportunity.execution_feasibility },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8">
        {project && (
          <Link to="/projects/$projectId" params={{ projectId: project.id }} className="text-xs text-muted-foreground hover:text-accent">
            ← {project.title}
          </Link>
        )}

        <div className="flex items-start justify-between gap-4 mt-2 mb-2">
          <h1 className="text-2xl font-black">{opportunity.title}</h1>
          <select
            value={opportunity.status}
            onChange={(e) => void changeStatus(e.target.value as Opportunity["status"])}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{opportunity.summary}</p>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge>Opportunity {opportunity.opportunity_score}/100</Badge>
          <Badge variant="outline">Confidence {opportunity.confidence_score}/100</Badge>
          <Badge variant="outline">{readiness.label}</Badge>
          <Button size="sm" variant="outline" onClick={generateReport} disabled={exporting} className="ml-auto">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Generate report
          </Button>
        </div>

        {opportunity.confidence_score < 50 && (
          <Card className="p-3 mb-6 border-needs-validation/40 bg-needs-validation/5">
            <p className="text-xs">
              <strong>Interesting opportunity — but not yet investment-ready.</strong> Confidence is below 50; treat the
              opportunity score as a hypothesis until more evidence is attached.
            </p>
          </Card>
        )}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="evidence">Assumptions & Unknowns</TabsTrigger>
            <TabsTrigger value="redteam">Red Team</TabsTrigger>
            <TabsTrigger value="experiments">Experiments</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Transformation" value={opportunity.transformation} />
              <Field label="Recommended next action" value={opportunity.recommended_next_action} />
              <TagList label="Products" items={opportunity.products} />
              <TagList label="Applications" items={opportunity.applications} />
              <TagList label="Customers" items={opportunity.customers} />
              <TagList label="Markets" items={opportunity.markets} />
            </div>
            <div className="mt-6 space-y-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Intelligence maturity</h3>
              {maturity.map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="text-xs w-20 shrink-0 text-muted-foreground">{m.label}</span>
                  <Progress value={m.value} className="flex-1" />
                  <span className="text-xs w-9 text-right font-mono">{m.value}%</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <Button onClick={runUnlockFurther} disabled={unlocking} variant="outline">
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Unlock Further
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                "What have we not yet considered?" — searches for overlooked properties, adjacent
                technologies, substitute materials, secondary markets, waste utilization and circular
                loops this analysis missed.
              </p>
              <WorkflowProgress active={unlocking} />
              {unlockedCount !== null && !unlocking && (
                <p className="text-sm text-muted-foreground mt-2">
                  {unlockedCount} new {unlockedCount === 1 ? "opportunity" : "opportunities"} added — see the project's Opportunities tab.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="scoring">
            <div className="grid md:grid-cols-2 gap-6">
              <ScoreRadar dims={dims} />
              <div className="space-y-3">
                {(Object.keys(DIMENSION_LABEL) as (keyof ScoreDimensions)[]).map((key) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{DIMENSION_LABEL[key]}</span>
                      <span className="font-mono text-muted-foreground">{dims[key]} · weight {weights[key]}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={weights[key]}
                      onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
                      className="w-full accent-accent"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={applyWeights}>Apply weights</Button>
                  <Button size="sm" variant="ghost" onClick={() => setWeights(DEFAULT_WEIGHTS)}>Reset to default</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="evidence">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Assumptions</h3>
                {assumptions.length === 0 ? <Empty text="No assumptions recorded." /> : (
                  <ul className="space-y-2">
                    {assumptions.map((a) => (
                      <Card key={a.id} className="p-3">
                        <p className="text-sm">{a.statement}</p>
                        {a.validation_method && <p className="text-xs text-muted-foreground mt-1">Validate via: {a.validation_method}</p>}
                        <Badge variant="outline" className="mt-2">{a.status}</Badge>
                      </Card>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Unknowns</h3>
                {unknowns.length === 0 ? <Empty text="No unknowns recorded." /> : (
                  <ul className="space-y-2">
                    {unknowns.map((u) => (
                      <Card key={u.id} className="p-3">
                        <p className="text-sm">{u.question}</p>
                        {u.why_it_matters && <p className="text-xs text-muted-foreground mt-1">{u.why_it_matters}</p>}
                      </Card>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Claims</h3>
                {claims.length === 0 ? <Empty text="No claims recorded." /> : (
                  <ul className="space-y-2">
                    {claims.map((c) => {
                      const badge = EVIDENCE_BADGE[c.status] ?? EVIDENCE_BADGE.unknown;
                      return (
                        <Card key={c.id} className="p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm">{c.statement}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{c.claim_type} · confidence {c.confidence}/100</p>
                          </div>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </Card>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Evidence</h3>
                {evidence.length === 0 ? <Empty text="Strong decisions begin with strong evidence — none attached yet." /> : (
                  <ul className="space-y-2">
                    {evidence.map((e) => {
                      const badge = EVIDENCE_BADGE[e.status] ?? EVIDENCE_BADGE.unknown;
                      return (
                        <Card key={e.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm truncate">{e.source || e.source_url || "Unattributed"}</p>
                            {e.excerpt && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.excerpt}</p>}
                          </div>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </Card>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="redteam">
            <RedTeamTab opportunity={opportunity} />
          </TabsContent>

          <TabsContent value="experiments">
            <ExperimentsTab opportunity={opportunity} />
          </TabsContent>

          <TabsContent value="scenarios">
            <ScenariosTab opportunity={opportunity} />
          </TabsContent>

          <TabsContent value="execution">
            <ExecutionTab opportunity={opportunity} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <p className="text-sm">{value || "—"}</p>
    </Card>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  return (
    <Card className="p-3">
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
        </div>
      )}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
