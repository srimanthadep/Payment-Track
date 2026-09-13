import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Receipt,
  Wallet,
  LayoutDashboard,
  BarChart3,
  Settings,
  Target,
  Globe,
  ArrowRight,
  Clock,
  IndianRupee,
  Users,
  HandCoins,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

interface SearchResult {
  id: string;
  type: "transaction" | "expense" | "page" | "customer";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const PAGES: SearchResult[] = [
  {
    id: "page-dashboard",
    type: "page",
    title: "Dashboard",
    subtitle: "Overview and statistics",
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: "/dashboard",
  },
  {
    id: "page-transactions",
    type: "page",
    title: "Transactions",
    subtitle: "Manage payment transactions",
    icon: <Receipt className="h-4 w-4" />,
    href: "/transactions",
  },
  {
    id: "page-expenses",
    type: "page",
    title: "Expenses",
    subtitle: "Track business expenses",
    icon: <Wallet className="h-4 w-4" />,
    href: "/expenses",
  },
  {
    id: "page-customers",
    type: "page",
    title: "Customers",
    subtitle: "Customer CRM and transaction history",
    icon: <Users className="h-4 w-4" />,
    href: "/customers",
  },
  {
    id: "page-dues",
    type: "page",
    title: "Dues",
    subtitle: "Track loans given and repayments",
    icon: <HandCoins className="h-4 w-4" />,
    href: "/dues",
  },
  {
    id: "page-analytics",
    type: "page",
    title: "Analytics",
    subtitle: "Revenue charts and insights",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/analytics",
  },
  {
    id: "page-goals",
    type: "page",
    title: "Goals & Targets",
    subtitle: "Set and track financial goals",
    icon: <Target className="h-4 w-4" />,
    href: "/goals",
  },
  {
    id: "page-settings",
    type: "page",
    title: "Settings",
    subtitle: "App configuration and profile",
    icon: <Settings className="h-4 w-4" />,
    href: "/settings",
  },
  {
    id: "page-scraping",
    type: "page",
    title: "Web Scraping",
    subtitle: "Portal scraping configuration",
    icon: <Globe className="h-4 w-4" />,
    href: "/scraping",
  },
];

const RECENT_SEARCHES_KEY = "payment_track_recent_searches";

export const CommandPalette = ({
  open,
  onOpenChange,
  userId,
}: CommandPaletteProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Save recent search
  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Debounced search
  const performSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim().toLowerCase();

      if (!q) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const allResults: SearchResult[] = [];

      // 1. Search pages
      const matchingPages = PAGES.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q)
      );
      allResults.push(...matchingPages);

      // 2. Search transactions
      if (userId) {
        try {
          const { data: txns } = await supabase
            .from("transactions")
            .select("id, amount, transaction_type, card_type, transaction_date, portals(name)")
            .eq("user_id", userId)
            .or(
              `amount.eq.${!isNaN(Number(q)) ? q : "0"},card_type.ilike.%${q}%,transaction_type.ilike.%${q}%`
            )
            .order("transaction_date", { ascending: false })
            .limit(5);

          if (txns) {
            allResults.push(
              ...txns.map((t: any) => ({
                id: `tx-${t.id}`,
                type: "transaction" as const,
                title: `₹${Number(t.amount || 0).toLocaleString("en-IN")} ${t.transaction_type}`,
                subtitle: `${(t.portals as any)?.name || "Unknown"} • ${t.card_type || "N/A"} • ${format(new Date(t.transaction_date), "dd MMM yyyy")}`,
                icon: <Receipt className="h-4 w-4" />,
                href: "/transactions",
                badge: t.transaction_type,
                badgeVariant:
                  t.transaction_type === "withdrawal"
                    ? ("destructive" as const)
                    : ("default" as const),
              }))
            );
          }
        } catch {
          // Silently fail
        }

        // 3. Search expenses
        try {
          const { data: expenses } = await supabase
            .from("expenses")
            .select("id, amount, category, expense_date, paid_to, notes")
            .eq("user_id", userId)
            .or(
              `category.ilike.%${q}%,paid_to.ilike.%${q}%,notes.ilike.%${q}%${!isNaN(Number(q)) ? `,amount.eq.${q}` : ""}`
            )
            .order("expense_date", { ascending: false })
            .limit(5);

          if (expenses) {
            allResults.push(
              ...expenses.map((e: any) => ({
                id: `exp-${e.id}`,
                type: "expense" as const,
                title: `₹${Number(e.amount || 0).toLocaleString("en-IN")} – ${e.category}`,
                subtitle: `${e.paid_to || "Unknown"} • ${format(new Date(e.expense_date), "dd MMM yyyy")}`,
                icon: <Wallet className="h-4 w-4" />,
                href: "/expenses",
                badge: "Expense",
                badgeVariant: "secondary" as const,
              }))
            );
          }
        } catch {
          // Silently fail
        }

        // 4. Search customers
        try {
          const { data: custTxns } = await supabase
            .from("transactions")
            .select("customer_name, customer_phone, amount, transaction_date")
            .eq("user_id", userId)
            .or(`customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,notes.ilike.%Customer%${q}%`)
            .order("transaction_date", { ascending: false })
            .limit(10);

          if (custTxns && custTxns.length > 0) {
            const seen = new Set<string>();
            for (const ct of custTxns) {
              const name = ct.customer_name?.trim();
              const phone = ct.customer_phone?.trim();
              const display = name || phone;
              if (display && !seen.has(display.toLowerCase())) {
                seen.add(display.toLowerCase());
                allResults.push({
                  id: `cust-${display}`,
                  type: "customer" as const,
                  title: name || "Customer",
                  subtitle: phone ? `Phone: ${phone}` : "Customer profile",
                  icon: <Users className="h-4 w-4" />,
                  href: "/customers",
                  badge: "Customer",
                  badgeVariant: "default" as const,
                });
                if (seen.size >= 4) break;
              }
            }
          }
        } catch {
          // Silently fail
        }
      }

      setResults(allResults);
      setSelectedIndex(0);
      setIsSearching(false);
    },
    [userId]
  );

  // Debounce the search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => performSearch(query), 250);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, performSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (query.trim()) saveRecentSearch(query.trim());
    if (result.href) {
      navigate(result.href);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search transactions, expenses, pages..."
            className="border-0 shadow-none focus-visible:ring-0 text-base h-auto p-0 bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground ml-3">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {/* Recent searches when empty */}
          {!query.trim() && recentSearches.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Searches
              </div>
              {recentSearches.map((term) => (
                <button
                  key={term}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/70 text-sm text-left transition-colors"
                  onClick={() => setQuery(term)}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick navigation when empty */}
          {!query.trim() && recentSearches.length === 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Navigation
              </div>
              {PAGES.slice(0, 5).map((page) => (
                <button
                  key={page.id}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/70 text-sm text-left transition-colors"
                  onClick={() => handleSelect(page)}
                >
                  <span className="text-muted-foreground">{page.icon}</span>
                  <span className="font-medium">{page.title}</span>
                  <span className="text-muted-foreground text-xs ml-auto">{page.subtitle}</span>
                </button>
              ))}
            </div>
          )}

          {/* Searching indicator */}
          {isSearching && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
              Searching...
            </div>
          )}

          {/* Results list */}
          {!isSearching && query.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Try searching by amount, category, or portal name
              </p>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="space-y-1">
              {/* Group by type */}
              {["page", "transaction", "expense"].map((type) => {
                const typeResults = results.filter((r) => r.type === type);
                if (typeResults.length === 0) return null;

                const typeLabel =
                  type === "page"
                    ? "Pages"
                    : type === "transaction"
                    ? "Transactions"
                    : "Expenses";

                return (
                  <div key={type}>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {typeLabel}
                    </div>
                    {typeResults.map((result, i) => {
                      const globalIndex = results.indexOf(result);
                      return (
                        <button
                          key={result.id}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors ${
                            globalIndex === selectedIndex
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/70"
                          }`}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <span
                            className={
                              globalIndex === selectedIndex
                                ? "text-primary"
                                : "text-muted-foreground"
                            }
                          >
                            {result.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {result.title}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </div>
                          </div>
                          {result.badge && (
                            <Badge
                              variant={result.badgeVariant || "secondary"}
                              className="text-[10px] flex-shrink-0"
                            >
                              {result.badge}
                            </Badge>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border bg-background font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border bg-background font-mono">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-border bg-background font-mono">Ctrl</kbd>
            +
            <kbd className="px-1 py-0.5 rounded border border-border bg-background font-mono">K</kbd>
            to toggle
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
