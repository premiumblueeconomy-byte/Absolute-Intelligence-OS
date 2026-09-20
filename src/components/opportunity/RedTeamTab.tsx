import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { listRedTeamRuns, groupRisksByPerspective, type RedTeamRun } from "@/lib/red-team";
import { createExperiment } from "@/lib/experiments";
import type { AgentOutput } from "@/lib/ask-absolute";
import type { Opportunity } from "@/lib/opportunities";
import { FlaskConical } from "lucide-react";

export function RedTeamTab({ opportunity }: { opportunity: Opportunity }) {
  const [runs, setRuns] = useState<RedTeamRun[]>([]);
  useEffect(() => { void listRedTeamRuns(opportunity.id).then(setRuns).catch(()=>toast.error("Could not load saved critiques")); }, [opportunity.id]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Generate a draft above to challenge this opportunity. Earlier critiques remain below.</p>
      {runs.map((run) => (
        <RedTeamResultCard key={run.id} run={run} opportunityId={opportunity.id} />
      ))}
    </div>
  );
}

function RedTeamResultCard({ run, opportunityId }: { run: RedTeamRun; opportunityId: string }) {
  const result = run.result as unknown as AgentOutput;
  const grouped = groupRisksByPerspective(result.risks ?? []);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</span>
        <Badge variant="outline">Confidence {result.confidence}/100</Badge>
      </div>
      <p className="text-sm">{result.summary}</p>

      {grouped.length > 0 && (
        <div>
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Critical vulnerabilities by perspective</h4>
          <div className="space-y-2">
            {grouped.map((g) => (
              <div key={g.perspective} className="rounded-md border border-border p-2.5">
                <div className="text-xs font-bold text-destructive mb-1">{g.perspective}</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {g.findings.map((f, i) => <li key={i} className="text-xs text-muted-foreground">{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Conditions required for success</h4>
          <ul className="list-disc list-inside space-y-0.5">
            {result.recommendations.map((r, i) => <li key={i} className="text-xs">{r}</li>)}
          </ul>
        </div>
      )}

      {result.next_actions.length > 0 && (
        <div>
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Experiments required before investment</h4>
          <ul className="space-y-1">
            {result.next_actions.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs">
                <span>• {r}</span>
                <button
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                  onClick={() => {
                    void createExperiment({ opportunityId, title: r, dangerousAssumption: r }).then(() =>
                      toast.success("Added to Experiments tab"),
                    );
                  }}
                >
                  <FlaskConical className="w-3 h-3" /> Track
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

