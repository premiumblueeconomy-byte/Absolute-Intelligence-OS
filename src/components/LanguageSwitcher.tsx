import { LANGUAGES, useTranslation } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-1.5 text-xs"
      aria-label="Language"
    >
      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  );
}
