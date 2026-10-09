import { useState, useEffect } from "react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Trash2, Sparkles, TrendingUp, AlertTriangle, Info, Target, Wallet, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "success" | "info" | "warning" | "goal";
  read: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = "payment_track_notifications";

export const NotificationCenter = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        // Initial welcome notifications
        const initial: AppNotification[] = [
          {
            id: "notif-1",
            title: "Welcome to Payment Tracker Hub",
            description: "Real-time ledger, analytics, and goals are active for your account.",
            timestamp: new Date().toISOString(),
            type: "info",
            read: false,
          },
          {
            id: "notif-2",
            title: "Goals & Targets Feature Available",
            description: "You can now set monthly and weekly profit targets under the Goals menu.",
            timestamp: new Date().toISOString(),
            type: "goal",
            read: false,
          },
        ];
        setNotifications(initial);
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(initial));
      }
    } catch {
      // ignore
    }
  }, []);

  // Realtime subscription for live notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-live-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const tx = payload.new as any;
          const amountStr = Number(tx.amount || 0).toLocaleString("en-IN");
          const profitStr = Number(tx.profit || 0).toLocaleString("en-IN");
          const newNotif: AppNotification = {
            id: `tx-${tx.id}-${Date.now()}`,
            title: `New ${tx.transaction_type === "payout" ? "Payout" : "Payment"} Recorded`,
            description: `₹${amountStr} (${tx.card_type || "Card"}) • Profit: ₹${profitStr}`,
            timestamp: new Date().toISOString(),
            type: "success",
            read: false,
          };

          setNotifications((prev) => {
            const updated = [newNotif, ...prev.slice(0, 49)];
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });

          toast({
            title: newNotif.title,
            description: newNotif.description,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dues",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const due = payload.new as any;
          const amountStr = Number(due.amount || 0).toLocaleString("en-IN");
          const newNotif: AppNotification = {
            id: `due-${due.id}-${Date.now()}`,
            title: "New Due Recorded",
            description: `${due.customer_name || "Customer"}: ₹${amountStr} (${due.status || "unpaid"})`,
            timestamp: new Date().toISOString(),
            type: "warning",
            read: false,
          };

          setNotifications((prev) => {
            const updated = [newNotif, ...prev.slice(0, 49)];
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });

          toast({
            title: newNotif.title,
            description: newNotif.description,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const exp = payload.new as any;
          const amountStr = Number(exp.amount || 0).toLocaleString("en-IN");
          const newNotif: AppNotification = {
            id: `exp-${exp.id}-${Date.now()}`,
            title: "Expense Logged",
            description: `${exp.category || "Expense"}: ₹${amountStr}${exp.notes ? ` • ${exp.notes}` : ""}`,
            timestamp: new Date().toISOString(),
            type: "info",
            read: false,
          };

          setNotifications((prev) => {
            const updated = [newNotif, ...prev.slice(0, 49)];
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });

          toast({
            title: newNotif.title,
            description: newNotif.description,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  const saveNotifications = (items: AppNotification[]) => {
    setNotifications(items);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "success":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "goal":
        return <Target className="h-4 w-4 text-primary" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl border border-border/60 hover:bg-muted/80"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-[380px] p-0 flex flex-col" hideCloseButton>
        <SheetHeader className="p-4 border-b border-border/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-bold">Notifications</SheetTitle>
            <SheetDescription className="sr-only">Notifications and system alerts</SheetDescription>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Read all</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={clearAll}
                title="Clear all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Bell className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs">No pending notifications</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border transition-all ${
                  n.read
                    ? "bg-card/50 border-border/60 opacity-80"
                    : "bg-primary/5 border-primary/20 shadow-xs"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-background border border-border/60 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground truncate">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {format(new Date(n.timestamp), "hh:mm a")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.description}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
