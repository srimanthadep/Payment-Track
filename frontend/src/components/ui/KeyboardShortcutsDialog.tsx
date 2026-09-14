import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard, ArrowRight, ShieldAlert } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStaff?: boolean;
}

interface ShortcutItem {
  keyDisplay: string[];
  title: string;
  description: string;
  staffAllowed: boolean;
}

export const KeyboardShortcutsDialog = ({
  open,
  onOpenChange,
  isStaff = false,
}: KeyboardShortcutsDialogProps) => {
  const shortcuts: ShortcutItem[] = [
    {
      keyDisplay: ["N"],
      title: "New Transaction",
      description: "Quickly open the Add Transaction modal from any page",
      staffAllowed: true,
    },
    {
      keyDisplay: ["E"],
      title: "Expenses",
      description: "Jump to Expenses page to view and record business costs",
      staffAllowed: true,
    },
    {
      keyDisplay: ["D"],
      title: "Dashboard",
      description: "Navigate to the main financial overview dashboard",
      staffAllowed: false,
    },
    {
      keyDisplay: ["C"],
      title: "Add Customer",
      description: "Open the quick 2-input Add Customer dialog",
      staffAllowed: false,
    },
    {
      keyDisplay: ["?"],
      title: "Shortcuts Help",
      description: "Open this keyboard shortcuts quick reference modal",
      staffAllowed: false,
    },
    {
      keyDisplay: ["Ctrl", "K"],
      title: "Command Palette",
      description: "Search transactions, navigate pages, and execute commands",
      staffAllowed: true,
    },
  ];

  const visibleShortcuts = isStaff
    ? shortcuts.filter((s) => s.staffAllowed)
    : shortcuts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/80 shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-xs">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Speed up your workflow with one-key navigation and quick actions
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
          {visibleShortcuts.map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:border-border transition-colors group"
            >
              <div className="space-y-0.5 pr-4">
                <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span>{item.title}</span>
                  {!item.staffAllowed && (
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Owner
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {item.description}
                </p>
              </div>

              {/* Key Badges */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {item.keyDisplay.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-mono font-bold rounded-md bg-muted text-foreground border border-border shadow-xs group-hover:border-primary/40 group-hover:text-primary transition-colors">
                      {k}
                    </kbd>
                    {i < item.keyDisplay.length - 1 && (
                      <span className="text-xs text-muted-foreground font-mono">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-muted/30 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Shortcuts are disabled while typing in inputs or dialogs</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 font-mono text-[10px]">
            Esc to close
          </kbd>
        </div>
      </DialogContent>
    </Dialog>
  );
};
