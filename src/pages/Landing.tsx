import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import {
  Sprout, AlertTriangle, Cpu, TrendingUp, Building2, FlaskConical, Lightbulb,
  ArrowRight, ScanSearch, GitBranch, Sparkles, TestTube2, Rocket,
} from "lucide-react";

const UNLOCK_CARDS = [
  { icon: Sprout, label: "A Resource" },
  { icon: AlertTriangle, label: "A Problem" },
  { icon: Cpu, label: "A Technology" },
  { icon: TrendingUp, label: "A Market" },
  { icon: Building2, label: "A Location" },
  { icon: FlaskConical, label: "A Research Finding" },
  { icon: Lightbulb, label: "A Business Idea" },
];

const HOW_IT_WORKS = [
  { icon: ScanSearch, title: "Give AIOS a subject", body: "A resource, problem, technology, market, place, company or idea." },
  { icon: GitBranch, title: "AIOS maps reality", body: "Facts, evidence, causes, and the system it belongs to." },
  { icon: Sparkles, title: "AIOS discovers connections", body: "Hidden relationships across industries most people never link." },
  { icon: Lightbulb, title: "AIOS reveals opportunities", body: "Ranked, evidence-graded, structured — not a wall of text." },
  { icon: TestTube2, title: "AIOS tests the opportunities", body: "Red-teams them and designs the cheapest validating experiment." },
  { icon: Rocket, title: "AIOS builds execution pathways", body: "A phased roadmap with owners, budgets and KPIs." },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden="true" />
          <div className="relative max-w-4xl mx-auto px-4 md:px-6 pt-20 pb-16 text-center">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
              ABSOLUTE <span className="text-accent">INTELLIGENCE</span>
            </h1>
            <p className="mt-3 text-sm md:text-base font-mono uppercase tracking-widest text-muted-foreground">
              {t("landing.tagline")}
            </p>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.subtitle")}
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" variant="accent" asChild>
                <Link to="/signup">{t("landing.ctaPrimary")} <ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#how-it-works">{t("landing.ctaSecondary")}</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-center mb-6">
            {t("landing.whatCanYouUnlock")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {UNLOCK_CARDS.map(({ icon: Icon, label }) => (
              <Card key={label} className="p-4 flex flex-col items-center text-center gap-2 hover:border-accent/50 hover:-translate-y-0.5 hover:shadow-md transition-all">
                <Icon className="w-5 h-5 text-accent" />
                <span className="text-sm font-semibold">{label}</span>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="max-w-5xl mx-auto px-4 md:px-6 pb-20">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-center mb-6">
            {t("landing.howItWorks")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map(({ icon: Icon, title, body }, i) => (
              <Card key={title} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <h3 className="text-sm font-bold mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 md:px-6 pb-24 text-center">
          <p className="text-xl md:text-2xl font-bold text-foreground">
            {t("landing.closingLine1")}
            <br />
            {t("landing.closingLine2")}
          </p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            ABSOLUTE INTELLIGENCE OS
          </span>
          <span>&copy; {new Date().getFullYear()} Absolute Intelligence OS. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
