import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "paper" | "cloud" | "interactive";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Card({
  variant = "paper",
  padding = "lg",
  className = "",
  children,
  ...props
}: CardProps) {
  const classes = [
    "ui-card",
    `ui-card--${variant}`,
    `ui-card--pad-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
