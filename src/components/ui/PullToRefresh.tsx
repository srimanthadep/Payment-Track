import { ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
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
        await onRefresh();
        setIsRefreshing(false);
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
                className="text-primary"
              >
                ↻
              </motion.div>
            ) : (
              <div className="text-muted-foreground">Pull to refresh</div>
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
            className="text-primary text-xl"
          >
            ↻
          </motion.div>
        </div>
      )}
    </div>
  );
};

