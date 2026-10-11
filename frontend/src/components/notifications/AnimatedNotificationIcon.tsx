import React, { useEffect, useRef, useState, useCallback } from "react";
import lottie, { AnimationItem } from "lottie-web";
import notificationData from "@/assets/notification/notification-V3.json";

interface AnimatedNotificationIconProps {
  className?: string;
  isHovered?: boolean;
}

export const AnimatedNotificationIcon: React.FC<AnimatedNotificationIconProps> = ({
  className = "h-4.5 w-4.5 text-foreground",
  isHovered = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Play full ringing cycle on hover
  const playAnimation = useCallback(() => {
    if (animRef.current) {
      animRef.current.goToAndPlay(0, true);
    }
  }, []);

  // Trigger when parent button or external hover state changes to true
  useEffect(() => {
    if (isHovered) {
      playAnimation();
    }
  }, [isHovered, playAnimation]);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    let anim: AnimationItem | null = null;
    try {
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: notificationData,
      });

      anim.addEventListener("DOMLoaded", () => {
        setIsReady(true);
      });

      // When animation finishes, cleanly settle at frame 0 (upright bell)
      anim.addEventListener("complete", () => {
        if (animRef.current) {
          animRef.current.goToAndStop(0, true);
        }
      });

      animRef.current = anim;
    } catch (err) {
      console.warn("Could not load notification animation:", err);
    }

    return () => {
      if (anim) {
        try {
          anim.destroy();
        } catch (_) {}
      }
      animRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={playAnimation}
      className={`relative inline-flex items-center justify-center shrink-0 select-none [&_svg]:w-full [&_svg]:h-full [&_svg]:overflow-visible [&_path[stroke]]:!stroke-current ${className}`}
      aria-hidden="true"
    >
      {/* Fallback bell icon until Lottie is mounted or in test/non-DOM environments */}
      {!isReady && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full text-current"
        >
          <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
        </svg>
      )}
    </div>
  );
};
