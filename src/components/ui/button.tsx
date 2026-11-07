import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "pos"
    | "success"
    | "warning";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs sm:text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer duration-75 active:scale-95";

    const variantStyles: Record<string, string> = {
      default:
        "bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/25",
      destructive:
        "bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm shadow-destructive/25",
      outline:
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
      pos: "min-h-[48px] px-5 py-3 text-sm font-black rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25",
      success:
        "bg-success text-success-foreground hover:opacity-90 shadow-sm shadow-success/25",
      warning:
        "bg-warning text-warning-foreground hover:opacity-90 shadow-sm shadow-warning/25",
    };

    const sizeStyles: Record<string, string> = {
      default: "min-h-[40px] sm:min-h-[38px] h-9 sm:h-10 px-4 py-2",
      sm: "min-h-[36px] h-8 rounded-lg px-3 text-xs",
      lg: "min-h-[48px] sm:min-h-[50px] h-11 sm:h-12 rounded-2xl px-6 sm:px-8 text-sm sm:text-base font-black",
      icon: "min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] h-10 w-10 sm:h-10 sm:w-10",
    };

    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
