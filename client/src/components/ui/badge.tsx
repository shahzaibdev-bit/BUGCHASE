import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Severity badges
        critical: "border-transparent bg-red-500 text-white",
        high: "border-transparent bg-orange-500 text-white",
        medium: "border-transparent bg-yellow-500 text-white",
        low: "border-transparent bg-green-500 text-white",
        info: "border-transparent bg-zinc-500 text-white",
        // Status badges
        success: "border-transparent bg-white/10 text-white",
        warning: "border-transparent bg-yellow-500/20 text-yellow-400",
        pending: "border-transparent bg-yellow-500/20 text-yellow-400",
        active: "border-transparent bg-primary/20 text-primary",
        // Tag badges
        tag: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
