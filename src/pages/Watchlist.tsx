import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  listWatchlist, addWatchlistItem, removeWatchlistItem, checkWatchlistItem,
  WATCHLIST_CATEGORY_LABEL, type WatchlistItem, type WatchlistCategory, type WatchlistStatus,
} from "@/lib/watchlist";
import { Eye, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";

export default function Watchlist() {
  const { ready } = useRequireAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<WatchlistCategory>("market");
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const load = () => { void listWatchlist().then(setItems); };
  useEffect(() => { if (ready) load(); }, [ready]);

  const add = async () => {
    if (!label.trim()) return;
    await addWatchlistItem({ category, label });
    setLabel("");
    load();
  };

  const check = async (item: WatchlistItem) => {
    setCheckingId(item.id);
    try {
      const updated = await checkWatchlistItem(item);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check this item");
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-1"><Eye className="w-5 h-5 text-accent" /> Watchlist</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Markets, companies, technologies, industries, regulations, opportunities, prices,
          countries, resources you want to keep an eye on. "Check" is not a live data feed — it
          asks the reasoning engine for its best-effort read and an honest confidence score, same
          as everywhere else in this app.
        </p>

        <div className="flex gap-2 mb-6">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What are you watching?" className="flex-1" onKeyDown={(e) => e.key === "Enter" && void add()} />
          <select value={category} onChange={(e) => setCategory(e.target.value as WatchlistCategory)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
            {(Object.keys(WATCHLIST_CATEGORY_LABEL) as WatchlistCategory[]).map((c) => <option key={c} value={c}>{WATCHLIST_CATEGORY_LABEL[c]}</option>)}
          </select>
          <Button onClick={add}><Plus className="w-3.5 h-3.5" /> Add</Button>
        </div>

        {items.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm text-muted-foreground">Nothing on your watchlist yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const status = item.last_status as unknown as WatchlistStatus | null;
              return (
                <Card key={item.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{WATCHLIST_CATEGORY_LABEL[item.category]}</Badge>
                        <span className="text-sm font-bold">{item.label}</span>
                      </div>
                      {item.last_checked_at && (
                        <p className="text-[11px] text-muted-foreground mt-1">Last checked {new Date(item.last_checked_at).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => check(item)} disabled={checkingId === item.id}>
                        {checkingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Check
                      </Button>
                      <button onClick={() => removeWatchlistItem(item.id).then(load)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {status && (
                    <div className="text-xs space-y-1 pt-1 border-t border-border">
                      <p>{status.summary}</p>
                      {status.significantChange && <p><span className="text-muted-foreground">Notable:</span> {status.significantChange}</p>}
                      {status.potentialImplication && <p><span className="text-muted-foreground">Implication:</span> {status.potentialImplication}</p>}
                      {status.recommendedAction && <p><span className="text-muted-foreground">Recommended:</span> {status.recommendedAction}</p>}
                      <Badge variant="outline">Confidence {status.confidence}/100</Badge>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
