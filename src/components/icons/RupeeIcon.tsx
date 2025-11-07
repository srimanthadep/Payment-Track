import React from "react";

export const RupeeIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* Rupee Symbol (₹) */}
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
};




