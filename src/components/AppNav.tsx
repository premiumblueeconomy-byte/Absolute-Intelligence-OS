import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, Compass, Briefcase, BookOpen, Brain, Eye, Building2, Globe2, Network, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function AppNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-sm md:text-base font-black tracking-tight">
            ABSOLUTE <span className="text-accent">INTELLIGENCE OS</span>
          </span>
        </Link>

        {user ? (
          <nav className="hidden md:flex items-center gap-1 scroll-strip" aria-label="Primary">
            <NavLink to="/dashboard" icon={Sparkles} label="Home" />
            <NavLink to="/projects" icon={Briefcase} label="Projects" />
            <NavLink to="/prompts" icon={BookOpen} label="Prompt Library" />
            <NavLink to="/ask" icon={Compass} label="Ask Absolute" />
            <NavLink to="/atlas" icon={Globe2} label="Atlas" />
            <NavLink to="/graph" icon={Network} label="Graph" />
            <NavLink to="/aiq" icon={Brain} label="AIQ" />
            <NavLink to="/watchlist" icon={Eye} label="Watchlist" />
            <NavLink to="/organizations" icon={Building2} label="Organizations" />
          </nav>
        ) : null}

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { void signOut(); void navigate({ to: "/" }); }}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, icon: Icon, label }: { to: string; icon: typeof Sparkles; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      activeProps={{ className: "text-foreground bg-secondary" }}
    >
      <Icon className="w-4 h-4" /> {label}
    </Link>
  );
}
