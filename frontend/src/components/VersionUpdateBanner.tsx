import { useState, useEffect } from "react";
import { appUpdateService, VersionInfo } from "@/services/appUpdateService";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, X, ArrowUpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export const VersionUpdateBanner = () => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | undefined>();
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = appUpdateService.subscribe((updateAvailable, info) => {
      setHasUpdate(updateAvailable);
      setVersionInfo(info);
      if (updateAvailable) {
        setDismissed(appUpdateService.isDismissed());
      }
    });

    return () => unsubscribe();
  }, []);

  // When user navigates to a new page and an update is waiting, auto-apply it cleanly
  useEffect(() => {
    if (hasUpdate && !isUpdating) {
      // Small delay to ensure route isn't amidst an active form submit
      const timer = setTimeout(() => {
        // Only if not dismissed
        if (!appUpdateService.isDismissed()) {
          handleUpdate();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, hasUpdate]);

  const handleUpdate = () => {
    setIsUpdating(true);
    appUpdateService.applyUpdate();
  };

  const handleDismiss = () => {
    setDismissed(true);
    appUpdateService.dismissPromptForNow();
  };

  if (!hasUpdate || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Application update banner"
        role="region"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="fixed top-2 sm:top-4 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-xl z-[9999]"
      >
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-primary/40 shadow-2xl shadow-primary/20 ring-1 ring-primary/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1">
                  New Update Available
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                A new version was just pushed. Reload to get latest changes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="h-8 px-3 text-xs font-semibold bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white rounded-xl shadow-sm gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${isUpdating ? "animate-spin" : ""}`} />
              <span>{isUpdating ? "Updating..." : "Update Now"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              title="Dismiss for 5 minutes"
              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
