import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import {
  uploadAndExtract, listResearchDocuments, createOpportunityFromResearch,
  type ResearchDocument, type ResearchExtraction,
} from "@/lib/research";
import { Upload, FileText, Loader2 } from "lucide-react";

export function ResearchTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<ResearchDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => { void listResearchDocuments(projectId).then(setDocs); };
  useEffect(load, [projectId]);

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      await uploadAndExtract({ projectId, file });
      toast.success("Research extracted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not extract this document");
    } finally {
      setUploading(false);
    }
  };

  const createOpportunity = async (extraction: ResearchExtraction) => {
    try {
      await createOpportunityFromResearch(projectId, extraction);
      toast.success("Opportunity saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save opportunity");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 text-center border-dashed">
        <Upload className="w-5 h-5 text-accent mx-auto mb-2" />
        <p className="text-sm font-semibold mb-1">Upload a research paper (PDF, TXT, MD or CSV)</p>
        <p className="text-xs text-muted-foreground mb-3">
          Extracted into a structured commercialization assessment — not just a summary.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }}
        />
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Choose file
        </Button>
        <WorkflowProgress active={uploading} />
      </Card>

      {docs.map((doc) => {
        const extraction = doc.extraction as unknown as ResearchExtraction | null;
        return (
          <Card key={doc.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> {doc.file_name}</span>
              <Badge variant={doc.status === "completed" ? "verified" : doc.status === "failed" ? "weakEvidence" : "outline"}>{doc.status}</Badge>
            </div>
            {extraction && (
              <>
                <p className="text-sm">{extraction.researchQuestion}</p>
                <div className="grid md:grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">TRL:</span> {extraction.trl}/9 — {extraction.trlRationale}</div>
                  <div><span className="text-muted-foreground">Confidence:</span> {extraction.confidence}/100</div>
                </div>
                {extraction.commercialOpportunities.length > 0 && (
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Commercial opportunities</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {extraction.commercialOpportunities.map((c, i) => <li key={i} className="text-xs">{c}</li>)}
                    </ul>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => createOpportunity(extraction)}>Create Opportunity</Button>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
