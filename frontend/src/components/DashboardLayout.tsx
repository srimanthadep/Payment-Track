import { useState, useEffect, ReactNode, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { profileService, UserProfile } from "@/services/profileService";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Receipt, 
  LogOut, 
  Shield, 
  Globe, 
  Wallet, 
  Settings as SettingsIcon,
  Menu,
  ChevronRight,
  Sparkles,
  BarChart3,
  Target,
  Search,
  ScrollText,
  Users,
  HandCoins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { activityLogService } from "@/services/activityLogService";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    profileService.getUserProfile().then((p) => {
      setUserProfile(p);
      if (p?.id) {
        checkAdminRole(p.id);
      }
    });
    return profileService.subscribe(() => {
      profileService.getUserProfile().then((p) => {
        setUserProfile(p);
        if (p?.id) {
          checkAdminRole(p.id);
        }
      });
    });
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!roles);
    } catch {
      setIsAdmin(false);
    }
  };

  // Global shortcuts:
  // 1. Ctrl+K / Cmd+K for command palette search
  // 2. 'N' key to open Add Transaction dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Search shortcut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      // 2. 'n' / 'N' shortcut for Add Transaction
      if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable ||
            target.closest("input, textarea, select, [contenteditable='true']") ||
            target.closest("[role='dialog']") ||
            target.closest(".monaco-editor"))
        ) {
          return;
        }

        // Do not open if another modal dialog or alert is already active
        const hasOpenDialog = document.querySelector("[role='dialog'], [role='alertdialog']");
        if (hasOpenDialog) {
          return;
        }

        e.preventDefault();
        if (location.pathname === "/transactions") {
          window.dispatchEvent(new CustomEvent("open-add-transaction"));
        } else {
          navigate("/transactions?add=true");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [location.pathname, navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      activityLogService.log("auth.logout", "auth", "Logged out successfully");
      setUserProfile(null);
      setIsAdmin(false);
      navigate("/auth");
    }
  };

  const baseNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: Receipt },
    { name: "Expenses", href: "/expenses", icon: Wallet },
    { name: "Dues", href: "/dues", icon: HandCoins },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Goals", href: "/goals", icon: Target },
    { name: "Activity Logs", href: "/activity-logs", icon: ScrollText },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
    { name: "Web Scraping", href: "/scraping", icon: Globe },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { name: "Admin", href: "/admin", icon: Shield }]
    : baseNavItems;

  const mobileBottomNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: Receipt },
    { name: "Expenses", href: "/expenses", icon: Wallet },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border/80 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate("/settings")}
            title="Settings & Profile"
          >
            <div className="relative flex items-center justify-center">
              <img
                src={userProfile?.avatarUrl || "/logo-circle.png"}
                alt="Profile"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo-circle.png";
                }}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20 shadow-xs group-hover:ring-primary/50 transition-all"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block leading-tight">Payment Tracker</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                {userProfile?.fullName || "Enterprise Hub"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl border border-border/60 hover:bg-muted/80"
              onClick={() => setSearchOpen(true)}
              title="Search (Ctrl+K)"
            >
              <Search className="h-4.5 w-4.5" />
            </Button>
            <NotificationCenter />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border/60 hover:bg-muted/80">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <div
                className="p-5 border-b border-border/80 bg-muted/20 cursor-pointer"
                onClick={() => navigate("/settings")}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={userProfile?.avatarUrl || "/logo-circle.png"}
                    alt="Profile"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/logo-circle.png";
                    }}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30 shadow-md"
                  />
                  <div>
                    <span className="font-bold text-base tracking-tight block">Payment Tracker</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {userProfile?.fullName || "Business Portal"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
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
                  onClick={handleSignOut}
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

      {/* Main Layout Body */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border/80 bg-card/60 backdrop-blur-xl z-20 shadow-xs">
          {/* Brand header */}
          <div
            className="flex items-center space-x-3 p-5 border-b border-border/70 bg-gradient-to-b from-card to-card/50 cursor-pointer group"
            onClick={() => navigate("/settings")}
            title="Click to manage profile & settings"
          >
            <div className="relative">
              <img
                src={userProfile?.avatarUrl || "/logo-circle.png"}
                alt="Profile"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo-circle.png";
                }}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/25 shadow-sm group-hover:ring-primary/50 group-hover:scale-105 transition-all"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-base tracking-tight block leading-tight truncate">Payment Tracker</span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block truncate">
                {userProfile?.fullName || "Enterprise Hub"}
              </span>
            </div>
          </div>
          
          {/* Sidebar Nav items */}
          <div className="flex-1 flex flex-col justify-between py-4 px-3.5 overflow-y-auto">
            <div className="space-y-3">
              {/* Quick Actions Search Bar for Desktop */}
              <div className="flex items-center gap-1.5 px-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchOpen(true)}
                  className="flex-1 justify-start h-8 text-xs text-muted-foreground gap-2 border-border/70 hover:text-foreground"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Search...</span>
                  <kbd className="ml-auto text-[10px] font-mono border rounded px-1 bg-muted/60">Ctrl+K</kbd>
                </Button>
                <NotificationCenter />
              </div>

              <div>
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
          </div>
            
          {/* Bottom Actions */}
            <div className="pt-4 border-t border-border/70 space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-10 rounded-xl text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 sm:pb-32 lg:pb-10 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Floating Modern Mobile Bottom Navigation Bar */}
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

      {/* Global Search Command Palette */}
      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        userId={userProfile?.id}
      />
    </div>
  );
};

export default DashboardLayout;
