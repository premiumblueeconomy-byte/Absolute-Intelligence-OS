import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { listAtlasOpportunities, groupByCountry, type AtlasOpportunity } from "@/lib/atlas";
import { Globe2, ArrowUpDown, Search } from "lucide-react";

type SortKey = "opportunity_score" | "confidence_score" | "updated_at";

export default function Atlas() {
  const { ready } = useRequireAuth();
  const [items, setItems] = useState<AtlasOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("opportunity_score");

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    void listAtlasOpportunities().then(setItems).finally(() => setLoading(false));
  }, [ready]);

  const countries = useMemo(
    () => Array.from(new Set(items.map((o) => o.project?.location_country?.trim()).filter(Boolean))).sort() as string[],
    [items],
  );
  const industries = useMemo(
    () => Array.from(new Set(items.map((o) => o.project?.industry?.trim()).filter(Boolean))).sort() as string[],
    [items],
  );
  const statuses = useMemo(() => Array.from(new Set(items.map((o) => o.status))).sort(), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((o) => !q || o.title.toLowerCase().includes(q) || o.summary.toLowerCase().includes(q))
      .filter((o) => !country || o.project?.location_country === country)
      .filter((o) => !industry || o.project?.industry === industry)
      .filter((o) => !status || o.status === status)
      .filter((o) => o.opportunity_score >= minScore)
      .sort((a, b) => {
        if (sortKey === "updated_at") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        return b[sortKey] - a[sortKey];
      });
  }, [items, search, country, industry, status, minScore, sortKey]);

  const countryGroups = useMemo(() => groupByCountry(filtered), [filtered]);

  const avgScore = filtered.length ? filtered.reduce((s, o) => s + o.opportunity_score, 0) / filtered.length : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-1">
          <Globe2 className="w-5 h-5 text-accent" /> Global Opportunity Atlas
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Every opportunity you can see — across every project you own, and every project shared
          with you through an organization — in one place. Grouping and filtering happen entirely
          client-side over data you already have; nothing here is a live external feed.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-3">
            <div className="text-2xl font-black">{filtered.length}</div>
            <div className="text-[11px] text-muted-foreground">Opportunities</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-black">{countryGroups.length}</div>
            <div className="text-[11px] text-muted-foreground">Countries/regions</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-black">{industries.length}</div>
            <div className="text-[11px] text-muted-foreground">Industries</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-black">{avgScore.toFixed(0)}</div>
            <div className="text-[11px] text-muted-foreground">Avg opportunity score</div>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or summary…" className="pl-8" />
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All industries</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
            <option value="opportunity_score">Sort: Opportunity score</option>
            <option value="confidence_score">Sort: Confidence score</option>
            <option value="updated_at">Sort: Recently updated</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Min score {minScore}
            <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-24" />
          </label>
        </div>

        {countryGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {countryGroups.slice(0, 12).map((g) => (
              <button
                key={g.country}
                onClick={() => setCountry(country === g.country ? "" : g.country)}
                className={`text-[11px] rounded-full border px-2.5 py-1 transition-colors ${country === g.country ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-accent/50"}`}
              >
                {g.country} <span className="text-muted-foreground">· {g.count} · avg {g.avgScore.toFixed(0)}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <p className="text-sm font-semibold">No opportunities match yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Run a Resource or Problem Explorer in a project to populate the Atlas.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-mono uppercase tracking-wider">Title</th>
                  <th className="py-2 pr-3 font-mono uppercase tracking-wider">Project</th>
                  <th className="py-2 pr-3 font-mono uppercase tracking-wider">Country</th>
                  <th className="py-2 pr-3 font-mono uppercase tracking-wider">Industry</th>
                  <th className="py-2 pr-3 font-mono uppercase tracking-wider">Status</th>
                  <th className="py-2 pr-3 font-mono uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Score</span>
                  </th>
                  <th className="py-2 pr-3 font-mono uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/40">
                    <td className="py-2 pr-3">
                      {o.project ? (
                        <Link to="/opportunities/$opportunityId" params={{ opportunityId: o.id }} className="font-semibold hover:text-accent">
                          {o.title}
                        </Link>
                      ) : (
                        <span className="font-semibold">{o.title}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{o.project?.title ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{o.project?.location_country || "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{o.project?.industry || "—"}</td>
                    <td className="py-2 pr-3"><Badge variant="outline">{o.status.replace(/_/g, " ")}</Badge></td>
                    <td className="py-2 pr-3 font-bold">{o.opportunity_score.toFixed(0)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{o.confidence_score.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
