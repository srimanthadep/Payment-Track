export interface ThemeAccent {
  id: string;
  name: string;
  primaryHsl: string;
  ringHsl: string;
  colorHex: string;
  gradient: string;
}

export const THEME_ACCENTS: ThemeAccent[] = [
  {
    id: "ocean",
    name: "Ocean Blue",
    primaryHsl: "220 80% 35%",
    ringHsl: "220 80% 35%",
    colorHex: "#1145a3",
    gradient: "linear-gradient(135deg, hsl(220 80% 35%), hsl(240 60% 50%))",
  },
  {
    id: "emerald",
    name: "Emerald Green",
    primaryHsl: "142 76% 36%",
    ringHsl: "142 76% 36%",
    colorHex: "#16a34a",
    gradient: "linear-gradient(135deg, hsl(142 76% 36%), hsl(160 60% 45%))",
  },
  {
    id: "violet",
    name: "Royal Violet",
    primaryHsl: "270 75% 45%",
    ringHsl: "270 75% 45%",
    colorHex: "#7c3aed",
    gradient: "linear-gradient(135deg, hsl(270 75% 45%), hsl(290 60% 50%))",
  },
  {
    id: "amber",
    name: "Sunset Amber",
    primaryHsl: "35 92% 45%",
    ringHsl: "35 92% 45%",
    colorHex: "#d97706",
    gradient: "linear-gradient(135deg, hsl(35 92% 45%), hsl(20 80% 50%))",
  },
  {
    id: "rose",
    name: "Crimson Rose",
    primaryHsl: "345 80% 45%",
    ringHsl: "345 80% 45%",
    colorHex: "#e11d48",
    gradient: "linear-gradient(135deg, hsl(345 80% 45%), hsl(0 75% 55%))",
  },
];

const ACCENT_STORAGE_KEY = "payment_track_theme_accent";

class ThemeService {
  getActiveAccent(): ThemeAccent {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (saved) {
        const found = THEME_ACCENTS.find((a) => a.id === saved);
        if (found) return found;
      }
    } catch {
      // ignore
    }
    return THEME_ACCENTS[0];
  }

  setAccent(accentId: string): void {
    const accent = THEME_ACCENTS.find((a) => a.id === accentId) || THEME_ACCENTS[0];
    localStorage.setItem(ACCENT_STORAGE_KEY, accent.id);
    this.applyAccent(accent);
  }

  applyAccent(accent?: ThemeAccent): void {
    const active = accent || this.getActiveAccent();
    document.documentElement.style.setProperty("--primary", active.primaryHsl);
    document.documentElement.style.setProperty("--ring", active.ringHsl);
    document.documentElement.style.setProperty("--gradient-primary", active.gradient);
  }
}

export const themeService = new ThemeService();
