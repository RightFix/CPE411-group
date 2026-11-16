import type { ReactNode } from "react";

export type BadgeTone = "violet" | "blue" | "green" | "neutral" | "primary";

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", className = "", children }: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}
