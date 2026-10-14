# Design System, Architecture & Mobile Wrapper Blueprint

> **Reference Documentation for Replicating this Exact Design in Any Project**  
> *Stack: React 18+ / Vite / Tailwind CSS / Radix UI / Framer Motion / Lucide Icons / Lottie Web*

---

## Table of Contents
1. [Visual Philosophy & Core Principles](#1-visual-philosophy--core-principles)
2. [Dependencies & Tooling Setup](#2-dependencies--tooling-setup)
3. [Design Tokens & Theme Engine](#3-design-tokens--theme-engine)
   - [Tailwind Configuration (`tailwind.config.ts`)](#tailwind-configuration)
   - [Global CSS & Tokens (`index.css`)](#global-css--tokens)
   - [Dynamic Multi-Accent Runtime Service (`themeService.ts`)](#dynamic-multi-accent-service)
4. [Master Layout System (`DashboardLayout.tsx`)](#4-master-layout-system)
   - [Layout Topology Diagram](#layout-topology-diagram)
   - [Desktop Fixed Sidebar Navigation](#desktop-fixed-sidebar-navigation)
   - [Responsive Content Container](#responsive-content-container)
   - [Global Keyboard Shortcuts System](#global-keyboard-shortcuts-system)
5. [Mobile Architecture & Wrappers](#5-mobile-architecture--wrappers)
   - [Mobile Sticky Top Header](#mobile-sticky-top-header)
   - [Mobile Sheet Navigation Drawer](#mobile-sheet-navigation-drawer)
   - [Floating Glassmorphic Bottom Navigation Bar](#floating-glassmorphic-bottom-navigation-bar)
   - [Mobile Floating Action Button (FAB)](#mobile-floating-action-button-fab)
   - [Pull-to-Refresh Component Wrapper (`PullToRefresh.tsx`)](#pull-to-refresh-component-wrapper)
   - [Mobile Touch & Viewport Optimizations](#mobile-touch--viewport-optimizations)
6. [Iconography & Animated Micro-Interactions](#6-iconography--animated-micro-interactions)
   - [Lucide Icons Standard](#lucide-icons-standard)
   - [Custom Vector Components (`AiIcon`, `RupeeIcon`)](#custom-vector-components)
   - [Interactive Lottie Animated Bell (`AnimatedNotificationIcon.tsx`)](#interactive-lottie-animated-bell)
7. [Core UI Component Library](#7-core-ui-component-library)
   - [Responsive Stat / Metric Cards](#responsive-stat--metric-cards)
   - [Adaptive Data Tables (Mobile Cards vs. Desktop Grid)](#adaptive-data-tables)
   - [Segmented Tabs & Period Selectors](#segmented-tabs--period-selectors)
   - [Command Palette Search Dialog (`CommandPalette.tsx`)](#command-palette-search-dialog)
   - [Inputs with Spin & Mouse Wheel Safety (`Input.tsx`)](#inputs-with-spin--mouse-wheel-safety)
   - [Empty States & Loading Skeletons](#empty-states--loading-skeletons)
8. [Step-by-Step Porting Checklist](#8-step-by-step-porting-checklist)

---

## 1. Visual Philosophy & Core Principles

This design system is built to deliver a **native-app feel** inside modern responsive web apps. It combines desktop financial workstation ergonomics with sleek mobile PWA navigation.

### Key Pillars:
1. **Glassmorphism & Depth**: Multi-layer backdrops (`backdrop-blur-md`, `backdrop-blur-2xl`), subtle border strokes (`border-border/80`), and high-elevation diffused shadows (`shadow-[0_8px_32px_rgba(0,0,0,0.14)]`).
2. **Spring Physics**: Seamless animated transitions powered by `framer-motion` using shared layout IDs (`layoutId="mobile-active-pill"`, `layoutId="sidebar-active-indicator"`) with spring parameters `{ stiffness: 350, damping: 30 }`.
3. **Mobile-First Touch Ergonomics**:
   - Floating pill bottom navigation dock positioned above the thumb zone (`bottom-3`, `max-w-md mx-auto`).
   - Tactile feedback via native `navigator.vibrate(15)` on button and tab touches.
   - Pull-to-refresh gesture handling with spring pull resistance.
   - Non-obscured content canvas via adaptive bottom padding (`pb-28 sm:pb-32 lg:pb-10`).
4. **Dynamic Personalization**: Zero-reload runtime accent switching (Ocean, Emerald, Violet, Amber, Rose) dynamically modifying root CSS variables.
5. **Data Protection & Polish**:
   - Number inputs strip browser default increment spinners and automatically drop focus on mouse-wheel events to prevent unintended numerical alterations.
   - Custom ultra-sleek 4px/5px scrollbars with pill-rounded handles.

---

## 2. Dependencies & Tooling Setup

To port this exact design to a new project (Vite + React + TypeScript or Next.js), install the core packages:

```bash
npm install @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-popover @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-toast @radix-ui/react-tooltip @radix-ui/react-dropdown-menu
npm install class-variance-authority clsx tailwind-merge tailwindcss-animate
npm install framer-motion lucide-react lottie-web date-fns
```

### Essential Helper (`lib/utils.ts`)
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 3. Design Tokens & Theme Engine

All colors are strictly managed through **HSL CSS variables**, enabling instant dark/light switching and dynamic accent colors without hardcoded hexadecimal classes.

### Tailwind Configuration
`tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

### Global CSS & Tokens
`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 220 13% 18%;

    --card: 0 0% 100%;
    --card-foreground: 220 13% 18%;

    --popover: 0 0% 100%;
    --popover-foreground: 220 13% 18%;

    --primary: 220 80% 35%;
    --primary-foreground: 0 0% 100%;

    --secondary: 220 40% 95%;
    --secondary-foreground: 220 80% 35%;

    --muted: 220 20% 96%;
    --muted-foreground: 220 13% 46%;

    --accent: 142 76% 36%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 100%;

    --border: 220 20% 90%;
    --input: 220 20% 90%;
    --ring: 220 80% 35%;

    --radius: 0.75rem;

    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;

    --gradient-primary: linear-gradient(135deg, hsl(220 80% 35%), hsl(240 60% 50%));
    --gradient-success: linear-gradient(135deg, hsl(142 76% 36%), hsl(160 60% 45%));
    --gradient-card: linear-gradient(180deg, hsl(0 0% 100%), hsl(220 20% 98%));

    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 220 18% 12%;
    --foreground: 220 10% 95%;

    --card: 220 18% 15%;
    --card-foreground: 220 10% 95%;

    --popover: 220 18% 15%;
    --popover-foreground: 220 10% 95%;

    --primary: 220 80% 55%;
    --primary-foreground: 0 0% 100%;

    --secondary: 220 18% 22%;
    --secondary-foreground: 220 10% 95%;

    --muted: 220 18% 22%;
    --muted-foreground: 220 10% 70%;

    --accent: 142 76% 45%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 62.8% 50%;
    --destructive-foreground: 0 0% 100%;

    --border: 220 18% 22%;
    --input: 220 18% 22%;
    --ring: 220 80% 55%;

    --success: 142 76% 45%;
    --success-foreground: 0 0% 100%;

    --gradient-primary: linear-gradient(135deg, hsl(220 80% 55%), hsl(240 60% 60%));
    --gradient-success: linear-gradient(135deg, hsl(142 76% 45%), hsl(160 60% 50%));
    --gradient-card: linear-gradient(180deg, hsl(220 18% 15%), hsl(220 18% 18%));

    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* Remove default number input up/down spin buttons globally */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  /* Touch-friendly optimizations */
  button, a {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  /* Prevent text selection on buttons */
  button {
    -webkit-user-select: none;
    user-select: none;
  }
}

/* Modern sleek custom scrollbars */
* {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.22) transparent;
}

::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.2);
  border-radius: 9999px;
  transition: background 0.15s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.38);
}

::-webkit-scrollbar-corner {
  background: transparent;
}

/* Ultra-sleek 4px scrollbar for sidebars, sheets, and lists */
.sleek-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.sleek-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.18);
  border-radius: 9999px;
}

.sleek-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.35);
}

/* Sizing lock for animated notification bell */
.animated-bell-icon,
.animated-bell-icon * {
  box-sizing: border-box;
}

.animated-bell-icon svg,
[data-lottie-icon] svg {
  width: 20px !important;
  height: 20px !important;
  max-width: 20px !important;
  max-height: 20px !important;
  overflow: hidden !important;
  display: block !important;
}
```

---

### Dynamic Multi-Accent Service
`src/services/themeService.ts`:

Enables the user to switch the entire application's primary brand theme on the fly without refreshing.

```typescript
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

const ACCENT_STORAGE_KEY = "app_theme_accent";

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
```

Initialize this in `src/main.tsx`:
```typescript
themeService.applyAccent();
```

---

## 4. Master Layout System

The master layout encapsulates the dual-mode responsive framework:

```
+-------------------------------------------------------------------------------+
| [MOBILE ONLY] Sticky Top Header (<header className="lg:hidden ...">)           |
|  [Logo & Org]                                    [Action] [Bell] [Drawer Menu]|
+-------------------------------------------------------------------------------+
| [DESKTOP ONLY] Sidebar      | Main Content Canvas                             |
| (w-72 fixed inset-y-0)      | (lg:pl-72 flex-1 pb-28 sm:pb-32 lg:pb-10)       |
|                             |                                                 |
| - Brand Logo & Status       | - PullToRefresh Wrapper                         |
| - Custom Profit Tracker     | - Motion Page Entrance                          |
| - Spring Active Nav Links   | - Segmented Controls & Date Filter              |
| - Shortcuts Help (?)        | - Responsive Grids / Tables                     |
| - Signout Trigger           |                                                 |
+-----------------------------+-------------------------------------------------+
| [MOBILE ONLY] Floating Glass Bottom Dock (fixed bottom-3 inset-x-0 z-40)       |
|  ( ) Home     ( ) Txns     ( ) Expenses     ( ) Analytics     ( ) Settings    |
+-------------------------------------------------------------------------------+
```

### Complete Code Blueprint (`src/components/DashboardLayout.tsx`)

```tsx
import { useState, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Receipt, 
  LogOut, 
  Wallet, 
  Settings as SettingsIcon,
  Menu,
  BarChart3,
  Users,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { KeyboardShortcutsDialog } from "@/components/ui/KeyboardShortcutsDialog";

interface DashboardLayoutProps {
  children: ReactNode;
  headerAction?: ReactNode;
}

export const DashboardLayout = ({ children, headerAction }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Global Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Search Command Palette: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      // Input field or modal protection guard
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']") ||
          target.closest("[role='dialog']"))
      ) {
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key.toLowerCase();
      if (key === "n") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-add-transaction"));
      } else if (key === "d") {
        e.preventDefault();
        navigate("/dashboard");
      } else if (key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: Receipt },
    { name: "Expenses", href: "/expenses", icon: Wallet },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  // 5 primary items displayed on mobile bottom bar
  const mobileBottomNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: Receipt },
    { name: "Expenses", href: "/expenses", icon: Wallet },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 1. Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border/80 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Brand & Avatar */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate("/settings")}
          >
            <div className="relative flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-2 ring-primary/20">
                PT
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block leading-tight">Payment Tracker</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                Enterprise Hub
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5">
            {headerAction}
            <NotificationCenter />
            
            {/* Sheet Mobile Menu Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border/60 hover:bg-muted/80">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>Mobile navigation drawer</SheetDescription>
                </SheetHeader>
                <div
                  className="p-5 border-b border-border/80 bg-muted/20 cursor-pointer"
                  onClick={() => navigate("/settings")}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm ring-2 ring-primary/30 shadow-md">
                      PT
                    </div>
                    <div>
                      <span className="font-bold text-base tracking-tight block">Payment Tracker</span>
                      <span className="text-xs text-muted-foreground font-medium">Business Portal</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 sleek-scrollbar">
                  <p className="text-[11px] font-semibold text-muted-foreground px-3 uppercase tracking-wider mb-2">Navigation</p>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <Button
                        key={item.name}
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start h-10 px-3 font-medium rounded-xl text-sm transition-all",
                          isActive && "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs"
                        )}
                        onClick={() => navigate(item.href)}
                      >
                        <Icon className={cn("mr-3 h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                        {item.name}
                      </Button>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-border/80 bg-muted/10">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
                    onClick={() => navigate("/auth")}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* 2. Main Desktop Structure */}
      <div className="flex-1 flex">
        {/* Desktop Fixed Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 border-r border-border/80 bg-card/60 backdrop-blur-xl z-20 shadow-xs">
          {/* Brand header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/70 bg-gradient-to-b from-card to-card/50">
            <div
              className="flex items-center space-x-2.5 cursor-pointer group min-w-0 flex-1 mr-1"
              onClick={() => navigate("/settings")}
            >
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm ring-2 ring-primary/25 shadow-sm group-hover:scale-105 transition-all">
                  PT
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm tracking-tight block leading-tight truncate">Payment Tracker</span>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block truncate">
                  Enterprise Hub
                </span>
              </div>
            </div>
            <NotificationCenter />
          </div>

          {/* Navigation Items */}
          <div className="flex-1 flex flex-col justify-between py-4 px-3.5 overflow-y-auto sleek-scrollbar">
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground/80 px-3 uppercase tracking-wider mb-2">Main Menu</p>
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-left outline-none",
                        isActive
                          ? "text-primary font-bold shadow-xs bg-primary/10 border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        <span>{item.name}</span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="w-1.5 h-4 rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border/70 space-y-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-3 text-xs text-muted-foreground hover:text-foreground gap-2.5 rounded-xl"
                onClick={() => setShortcutsOpen(true)}
              >
                <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Shortcuts</span>
                <kbd className="ml-auto text-[10px] font-mono border border-border/70 rounded px-1.5 py-0.2 bg-muted/60">?</kbd>
              </Button>

              <Button 
                variant="ghost" 
                className="w-full justify-start h-9 rounded-xl text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => navigate("/auth")}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* 3. Main Content Canvas */}
        <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 sm:pb-32 lg:pb-10 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* 4. Floating Modern Mobile Bottom Navigation Dock */}
      <div className="lg:hidden fixed bottom-3 inset-x-0 z-40 px-3.5 max-w-md mx-auto pointer-events-none">
        <nav className="pointer-events-auto bg-card/90 dark:bg-card/95 backdrop-blur-2xl border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-1.5 flex items-center justify-between ring-1 ring-black/5 dark:ring-white/10">
          {mobileBottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  if ("vibrate" in navigator) {
                    try {
                      navigator.vibrate(15);
                    } catch {}
                  }
                  navigate(item.href);
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 outline-none select-none",
                  isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-active-pill"
                    className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl border border-primary/20"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                
                <div className={cn("relative z-10 p-0.5 transition-transform duration-200", isActive && "scale-110")}>
                  <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                </div>
                
                <span className={cn("relative z-10 text-[10px] tracking-tight mt-0.5 truncate max-w-[58px]", isActive ? "font-bold text-primary" : "font-medium")}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 5. Global Modals */}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
};
```

---

## 5. Mobile Architecture & Wrappers

### Floating Glassmorphic Bottom Navigation Bar
The bottom dock floats above viewport edges rather than pinning flush to the screen bottom:
- **Floating Outer Pill**: `fixed bottom-3 inset-x-0 z-40 px-3.5 max-w-md mx-auto pointer-events-none`
- **Glass Card Container**: `pointer-events-auto bg-card/90 dark:bg-card/95 backdrop-blur-2xl border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-1.5 flex items-center justify-between ring-1 ring-black/5 dark:ring-white/10`
- **Animated Indicator**: An absolute background pill animated with `layoutId="mobile-active-pill"` creates an ultra-smooth sliding highlight when switching routes.
- **Haptic Vibration**: `navigator.vibrate(15)` gives a physical click sensation on mobile touchscreens.

### Mobile Floating Action Button (FAB)
`src/components/ui/FloatingActionButton.tsx`:

Sits cleanly above the floating bottom dock (`bottom-20` vs dock `bottom-3` + 50px height):

```tsx
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export const FloatingActionButton = ({ onClick, className, icon }: FloatingActionButtonProps) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn(
        "fixed bottom-20 right-4 z-40 sm:hidden",
        className
      )}
    >
      <Button
        onClick={() => {
          if ("vibrate" in navigator) {
            try { navigator.vibrate(15); } catch {}
          }
          onClick();
        }}
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center p-0"
      >
        {icon || <Plus className="h-6 w-6" />}
      </Button>
    </motion.div>
  );
};
```

### Pull-to-Refresh Component Wrapper
`src/components/ui/PullToRefresh.tsx`:

Provides native iOS/Android style touch pull-down gesture to trigger state refreshes with spring animation.

```tsx
import { ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

export const PullToRefresh = ({ onRefresh, children, disabled }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const pullDistance = currentY - startY;
  const maxPullDistance = 80;
  const pullProgress = Math.min(pullDistance / maxPullDistance, 1);

  useEffect(() => {
    if (disabled || isRefreshing) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || window.scrollY > 0) return;
      const y = e.touches[0].clientY;
      setCurrentY(y);
      if (y > startY && pullDistance > 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;
      if (pullDistance > maxPullDistance) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setIsPulling(false);
      setStartY(0);
      setCurrentY(0);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled, isRefreshing, isPulling, pullDistance, startY, onRefresh]);

  return (
    <div className="relative">
      <AnimatePresence>
        {isPulling && pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: Math.min(pullDistance * 0.5, 40) }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur"
            style={{ height: `${Math.min(pullDistance, maxPullDistance)}px` }}
          >
            {pullProgress >= 1 ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-primary font-bold text-lg"
              >
                ↻
              </motion.div>
            ) : (
              <div className="text-xs font-medium text-muted-foreground">Pull to refresh</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          y: isPulling && pullDistance > 0 ? Math.min(pullDistance * 0.3, 30) : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>

      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur h-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-primary text-xl font-bold"
          >
            ↻
          </motion.div>
        </div>
      )}
    </div>
  );
};
```

---

## 6. Iconography & Animated Micro-Interactions

### Lucide Icons Standard
Icons use standard Tailwind sizing:
- Menu / Navigation / Buttons: `h-4 w-4` or `h-5 w-5`
- Metric Badges: `h-3.5 w-3.5 sm:h-4 sm:w-4`
- Mobile Action FAB: `h-6 w-6`

### Custom Vector Components
`src/components/icons/RupeeIcon.tsx`:
```tsx
import React from "react";

export const RupeeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <text
      x="50%"
      y="50%"
      dominantBaseline="central"
      textAnchor="middle"
      fontSize="20"
      fontFamily="Arial, sans-serif"
      fontWeight="bold"
    >
      ₹
    </text>
  </svg>
);
```

### Interactive Lottie Animated Bell
`src/components/notifications/AnimatedNotificationIcon.tsx`:

Loads a micro-animation with `lottie-web`. Upon mouse hover or new notification events, plays the bell wobble cycle from frame 0 and settles upright without shifting layout boundaries:

```tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import lottie, { AnimationItem } from "lottie-web";

interface AnimatedNotificationIconProps {
  className?: string;
  isHovered?: boolean;
  animationJson?: any;
}

export const AnimatedNotificationIcon: React.FC<AnimatedNotificationIconProps> = ({
  className = "w-5 h-5 text-foreground",
  isHovered = false,
  animationJson,
}) => {
  const lottieRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [isReady, setIsReady] = useState(false);

  const playAnimation = useCallback(() => {
    if (animRef.current) {
      animRef.current.goToAndPlay(0, true);
    }
  }, []);

  useEffect(() => {
    if (isHovered) playAnimation();
  }, [isHovered, playAnimation]);

  useEffect(() => {
    const el = lottieRef.current;
    if (!el || !animationJson || typeof window === "undefined") return;

    el.innerHTML = "";
    let anim: AnimationItem | null = null;

    try {
      anim = lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: animationJson,
      });

      anim.addEventListener("DOMLoaded", () => setIsReady(true));
      anim.addEventListener("complete", () => {
        if (animRef.current) animRef.current.goToAndStop(0, true);
      });

      animRef.current = anim;
    } catch (err) {
      console.warn("Lottie load error:", err);
    }

    return () => {
      if (anim) anim.destroy();
      animRef.current = null;
    };
  }, [animationJson]);

  return (
    <div
      onMouseEnter={playAnimation}
      className={`animated-bell-icon relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${className}`}
      style={{ width: 20, height: 20, maxWidth: 20, maxHeight: 20 }}
    >
      <div
        ref={lottieRef}
        className={`w-full h-full overflow-hidden flex items-center justify-center pointer-events-none [&_svg]:!w-full [&_svg]:!h-full [&_path[stroke]]:!stroke-current ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
      />
      {!isReady && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full text-current absolute inset-0 m-auto"
        >
          <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
        </svg>
      )}
    </div>
  );
};
```

---

## 7. Core UI Component Library

### Responsive Stat / Metric Cards
Layout adapts seamlessly from **2 columns on mobile** to **4 columns on desktop**:
`grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 items-stretch`

Each card structure:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05 }}
  className="h-full"
>
  <Card className="overflow-hidden relative shadow-sm border-border/80 h-full flex flex-col justify-between">
    <div>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-2 min-h-[2.25rem] sm:min-h-[2.5rem] flex items-center">
          Total Withdrawals (Today)
        </CardTitle>
        <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex-shrink-0">
          <ArrowDownCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-base sm:text-2xl font-bold tracking-tight">₹1,50,000.00</div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">12 recorded</p>
      </CardContent>
    </div>
  </Card>
</motion.div>
```

### Adaptive Data Tables
To avoid cramped, unreadable tables on mobile devices, data uses a dual render strategy:

1. **Mobile Card List (`sm:hidden`)**:
```tsx
<div className="sm:hidden space-y-2">
  {records.map((item) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-3 shadow-xs space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{item.title}</div>
        <Badge variant="outline">{item.status}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>Amount: <span className="font-bold text-foreground">₹{item.amount}</span></div>
        <div>Fee: <span className="text-destructive">₹{item.fee}</span></div>
      </div>
    </motion.div>
  ))}
</div>
```

2. **Desktop Grid (`hidden sm:block`)**:
```tsx
<div className="hidden sm:block rounded-md border overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow className="h-9 hover:bg-transparent border-b">
        <TableHead className="text-xs font-semibold">Date</TableHead>
        <TableHead className="text-xs font-semibold">Customer</TableHead>
        <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {records.map((item) => (
        <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
          <TableCell className="text-xs">{item.date}</TableCell>
          <TableCell className="text-xs font-medium">{item.customer}</TableCell>
          <TableCell className="text-xs text-right font-bold">₹{item.amount}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### Segmented Tabs & Period Selectors
```tsx
<Tabs value={period} onValueChange={setPeriod} className="w-full sm:w-auto">
  <TabsList className="grid grid-cols-4 w-full sm:w-auto">
    <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
    <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
    <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
    <TabsTrigger value="all" className="text-xs sm:text-sm">All Time</TabsTrigger>
  </TabsList>
</Tabs>
```

### Inputs with Spin & Mouse Wheel Safety
`src/components/ui/input.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onWheel, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        ref={ref}
        onWheel={(e) => {
          if (type === "number" || (e.target as HTMLInputElement).type === "number") {
            (e.target as HTMLElement).blur();
          }
          onWheel?.(e);
        }}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

### Empty States
`src/components/ui/EmptyState.tsx`:

```tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileQuestion } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20 ${className}`}
    >
      <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
        {icon || <FileQuestion className="h-8 w-8 text-primary" />}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="text-xs h-9 gap-1.5 shadow-xs">
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};
```

---

## 8. Step-by-Step Porting Checklist

Follow these steps to reproduce this exact architecture in another React/TypeScript project:

1. **Install Prerequisites**:
   Install Radix primitives, Lucide, Framer Motion, and Tailwind utilities.
2. **Apply Tailwind Configuration**:
   Copy the `tailwind.config.ts` colors block and keyframes directly.
3. **Copy Global Style Sheet (`index.css`)**:
   Include all HSL root variables, `.dark` variables, spin button removal, tap highlight reset, and `.sleek-scrollbar` definitions.
4. **Setup `lib/utils.ts`**:
   Ensure `cn()` (`clsx` + `twMerge`) is available.
5. **Install Dynamic Theme Accent Engine**:
   Copy `src/services/themeService.ts` and invoke `themeService.applyAccent()` in `main.tsx`.
6. **Deploy Layout Shell (`DashboardLayout.tsx`)**:
   Integrate the fixed desktop sidebar, mobile sticky header, mobile sheet drawer, and floating bottom pill navigation dock.
7. **Ensure Main Content Bottom Padding**:
   Always keep `pb-28 sm:pb-32 lg:pb-10` on the `<main>` container so floating elements never obscure content.
8. **Wrap Scrollable Views with `PullToRefresh`**:
   Add pull-to-refresh to primary list/dashboard views.
9. **Add `FloatingActionButton` on Actionable Pages**:
   Position at `fixed bottom-20 right-4 z-40 sm:hidden`.
10. **Use Adaptive Data Views**:
    Use `sm:hidden` for mobile card feeds and `hidden sm:block` for tabular records.
