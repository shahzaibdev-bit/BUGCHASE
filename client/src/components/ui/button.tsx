import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
// @ts-ignore
import Magnet from "@/components/Magnet";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom BugChase variants
        hero: "primary-gradient text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300",
        heroOutline: "border-2 border-primary/50 bg-primary/10 text-primary backdrop-blur-sm hover:bg-primary/20 hover:border-primary transition-all duration-300",
        glass: "bg-card/40 backdrop-blur-xl border border-border/30 text-foreground hover:bg-card/60 hover:border-primary/30 transition-all duration-300",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-lg shadow-success/25",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
        glow: "primary-gradient text-primary-foreground font-semibold animate-pulse-glow hover:scale-105 transition-transform duration-300",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-xl",
        sm: "h-9 rounded-xl px-3",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // Create the button element
    const buttonElement = <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;

    // Wrap in Magnet, hardcoding props as requested. 
    // We pass style to Magnet wrapper to ensure it doesn't break layout (display: inline-block is default, which is usually fine for buttons)
    return (
      <Magnet padding={100} magnetStrength={80} wrapperClassName="group">
        {buttonElement}
      </Magnet>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
