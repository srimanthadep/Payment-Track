import React, { useEffect, useRef, useState, useCallback } from "react";
import lottie, { AnimationItem } from "lottie-web";
import notificationData from "@/assets/notification/notification-V3.json";

interface AnimatedNotificationIconProps {
  className?: string;
  isHovered?: boolean;
}

export const AnimatedNotificationIcon: React.FC<AnimatedNotificationIconProps> = ({
  className = "w-5 h-5 text-foreground",
  isHovered = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<HTMLDivElement>(null);
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
    const el = lottieRef.current;
    if (!el || typeof window === "undefined") return;

    el.innerHTML = "";
    let anim: AnimationItem | null = null;
    let isCancelled = false;

    try {
      anim = lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: notificationData,
      });

      anim.addEventListener("DOMLoaded", () => {
        if (!isCancelled) {
          setIsReady(true);
        }
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
      isCancelled = true;
      if (anim) {
        try {
          anim.destroy();
        } catch (_) {}
      }
      if (el) {
        el.innerHTML = "";
      }
      animRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={playAnimation}
      data-lottie-icon="true"
      className={`animated-bell-icon relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${className}`}
      style={{
        width: 20,
        height: 20,
        minWidth: 20,
        minHeight: 20,
        maxWidth: 20,
        maxHeight: 20,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      {/* Isolated container for Lottie SVG */}
      <div
        ref={lottieRef}
        className={`w-full h-full max-w-[20px] max-h-[20px] overflow-hidden flex items-center justify-center pointer-events-none [&_svg]:!w-full [&_svg]:!h-full [&_svg]:!max-w-[20px] [&_svg]:!max-h-[20px] [&_svg]:!overflow-hidden [&_svg]:!block [&_path[stroke]]:!stroke-current ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
        style={{
          width: 20,
          height: 20,
          maxWidth: 20,
          maxHeight: 20,
          overflow: "hidden",
        }}
      />

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
          className="w-full h-full max-w-[20px] max-h-[20px] text-current block absolute inset-0 m-auto"
          style={{ width: 20, height: 20, maxWidth: 20, maxHeight: 20 }}
        >
          <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
        </svg>
      )}
    </div>
  );
};
