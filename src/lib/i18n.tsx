import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Scope note (see README): only navigation labels and the landing page hero
// are translated so far — everything else in the app is English-only. The
// translations below are this model's own best-effort rendering, not
// reviewed by a native speaker or professional localizer; treat them as a
// starting point to verify, not a finished localization, especially the
// Swahili strings where confidence is lower than the Romance languages.

const en = {
  "nav.home": "Home",
  "nav.projects": "Projects",
  "nav.prompts": "Prompt Library",
  "nav.ask": "Ask Absolute",
  "nav.atlas": "Atlas",
  "nav.graph": "Graph",
  "nav.aiq": "AIQ",
  "nav.watchlist": "Watchlist",
  "nav.organizations": "Organizations",
  "nav.admin": "Admin",
  "nav.signOut": "Sign out",
  "nav.signIn": "Sign in",
  "nav.getStarted": "Get started",
  "landing.tagline": "Discover Reality. Connect Knowledge. Unlock Opportunity. Execute Better.",
  "landing.subtitle":
    "Absolute Intelligence OS connects evidence, science, markets, technology, systems thinking and strategy to reveal what others cannot see.",
  "landing.ctaPrimary": "Unlock an Opportunity",
  "landing.ctaSecondary": "Explore How It Works",
  "landing.whatCanYouUnlock": "What can you unlock?",
  "landing.howItWorks": "How it works",
  "landing.closingLine1": "Don't stop at answers.",
  "landing.closingLine2": "Discover what becomes possible.",
};

export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;

const fr: Dictionary = {
  "nav.home": "Accueil",
  "nav.projects": "Projets",
  "nav.prompts": "Bibliothèque de prompts",
  "nav.ask": "Demander à Absolute",
  "nav.atlas": "Atlas",
  "nav.graph": "Graphe",
  "nav.aiq": "AIQ",
  "nav.watchlist": "Liste de suivi",
  "nav.organizations": "Organisations",
  "nav.admin": "Administration",
  "nav.signOut": "Se déconnecter",
  "nav.signIn": "Se connecter",
  "nav.getStarted": "Commencer",
  "landing.tagline": "Découvrez la réalité. Connectez les savoirs. Débloquez l'opportunité. Exécutez mieux.",
  "landing.subtitle":
    "Absolute Intelligence OS relie les preuves, la science, les marchés, la technologie, la pensée systémique et la stratégie pour révéler ce que les autres ne voient pas.",
  "landing.ctaPrimary": "Débloquer une opportunité",
  "landing.ctaSecondary": "Découvrir comment ça marche",
  "landing.whatCanYouUnlock": "Que pouvez-vous débloquer ?",
  "landing.howItWorks": "Comment ça marche",
  "landing.closingLine1": "Ne vous arrêtez pas aux réponses.",
  "landing.closingLine2": "Découvrez ce qui devient possible.",
};

const es: Dictionary = {
  "nav.home": "Inicio",
  "nav.projects": "Proyectos",
  "nav.prompts": "Biblioteca de prompts",
  "nav.ask": "Preguntar a Absolute",
  "nav.atlas": "Atlas",
  "nav.graph": "Grafo",
  "nav.aiq": "AIQ",
  "nav.watchlist": "Lista de seguimiento",
  "nav.organizations": "Organizaciones",
  "nav.admin": "Administración",
  "nav.signOut": "Cerrar sesión",
  "nav.signIn": "Iniciar sesión",
  "nav.getStarted": "Comenzar",
  "landing.tagline": "Descubre la realidad. Conecta el conocimiento. Desbloquea la oportunidad. Ejecuta mejor.",
  "landing.subtitle":
    "Absolute Intelligence OS conecta evidencia, ciencia, mercados, tecnología, pensamiento sistémico y estrategia para revelar lo que otros no pueden ver.",
  "landing.ctaPrimary": "Desbloquear una oportunidad",
  "landing.ctaSecondary": "Explorar cómo funciona",
  "landing.whatCanYouUnlock": "¿Qué puedes desbloquear?",
  "landing.howItWorks": "Cómo funciona",
  "landing.closingLine1": "No te detengas en las respuestas.",
  "landing.closingLine2": "Descubre lo que se vuelve posible.",
};

const pt: Dictionary = {
  "nav.home": "Início",
  "nav.projects": "Projetos",
  "nav.prompts": "Biblioteca de prompts",
  "nav.ask": "Perguntar à Absolute",
  "nav.atlas": "Atlas",
  "nav.graph": "Grafo",
  "nav.aiq": "AIQ",
  "nav.watchlist": "Lista de observação",
  "nav.organizations": "Organizações",
  "nav.admin": "Administração",
  "nav.signOut": "Sair",
  "nav.signIn": "Entrar",
  "nav.getStarted": "Começar",
  "landing.tagline": "Descubra a realidade. Conecte o conhecimento. Desbloqueie a oportunidade. Execute melhor.",
  "landing.subtitle":
    "O Absolute Intelligence OS conecta evidências, ciência, mercados, tecnologia, pensamento sistêmico e estratégia para revelar o que outros não conseguem ver.",
  "landing.ctaPrimary": "Desbloquear uma oportunidade",
  "landing.ctaSecondary": "Explorar como funciona",
  "landing.whatCanYouUnlock": "O que você pode desbloquear?",
  "landing.howItWorks": "Como funciona",
  "landing.closingLine1": "Não pare nas respostas.",
  "landing.closingLine2": "Descubra o que se torna possível.",
};

const sw: Dictionary = {
  "nav.home": "Nyumbani",
  "nav.projects": "Miradi",
  "nav.prompts": "Maktaba ya Prompts",
  "nav.ask": "Uliza Absolute",
  "nav.atlas": "Atlasi",
  "nav.graph": "Grafu",
  "nav.aiq": "AIQ",
  "nav.watchlist": "Orodha ya Ufuatiliaji",
  "nav.organizations": "Mashirika",
  "nav.admin": "Msimamizi",
  "nav.signOut": "Toka",
  "nav.signIn": "Ingia",
  "nav.getStarted": "Anza",
  "landing.tagline": "Gundua Uhalisia. Unganisha Maarifa. Fungua Fursa. Tekeleza Vyema Zaidi.",
  "landing.subtitle":
    "Absolute Intelligence OS huunganisha ushahidi, sayansi, masoko, teknolojia, mawazo ya kimfumo na mkakati ili kufichua kile wengine hawawezi kuona.",
  "landing.ctaPrimary": "Fungua Fursa",
  "landing.ctaSecondary": "Chunguza Jinsi Inavyofanya Kazi",
  "landing.whatCanYouUnlock": "Unaweza kufungua nini?",
  "landing.howItWorks": "Jinsi inavyofanya kazi",
  "landing.closingLine1": "Usisimame kwenye majibu.",
  "landing.closingLine2": "Gundua kinachowezekana.",
};

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "sw", label: "Kiswahili" },
];

const DICTIONARIES: Record<string, Dictionary> = { en, fr, es, pt, sw };
const STORAGE_KEY = "aios-language";

interface I18nContextType {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => en[key],
});

export const useTranslation = () => useContext(I18nContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Starts at "en" on both server and first client render (matches SSR
  // output), then hydrates the saved preference from localStorage — avoids
  // a hydration mismatch at the cost of a one-frame flash for non-English users.
  const [language, setLanguageState] = useState("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && DICTIONARIES[saved]) setLanguageState(saved);
    } catch {
      // localStorage unavailable (private browsing etc.) — stay on English.
    }
  }, []);

  const setLanguage = (code: string) => {
    if (!DICTIONARIES[code]) return;
    setLanguageState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  };

  const t = (key: TranslationKey) => DICTIONARIES[language]?.[key] ?? en[key];

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
}
