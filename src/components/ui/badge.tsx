import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info";
  dot?: boolean;
}

function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default:
      "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/80",
    secondary:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/80",
    outline: "text-foreground border-border",
    success:
      "border-transparent bg-success text-success-foreground shadow-xs hover:bg-success/80",
    warning:
      "border-transparent bg-warning text-warning-foreground shadow-xs hover:bg-warning/80",
    info: "border-transparent bg-info text-info-foreground shadow-xs hover:bg-info/80",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1.5 shrink-0 opacity-90" />
      )}
      {children}
    </div>
  );
}

export { Badge };
