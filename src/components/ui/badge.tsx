import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        "stage-new":
          "border-transparent bg-stage-new-bg text-stage-new",
        "stage-called":
          "border-transparent bg-stage-called-bg text-stage-called",
        "stage-onboard":
          "border-transparent bg-stage-onboard-bg text-stage-onboard",
        "stage-live":
          "border-transparent bg-stage-live-bg text-stage-live",
        "stage-lost":
          "border-transparent bg-stage-lost-bg text-stage-lost",
        "stage-purple":
          "border-transparent bg-stage-purple-bg text-stage-purple",
        "stage-teal":
          "border-transparent bg-stage-teal-bg text-stage-teal",
        "stage-indigo":
          "border-transparent bg-stage-indigo-bg text-stage-indigo",
        "stage-pink":
          "border-transparent bg-stage-pink-bg text-stage-pink",
        "stage-orange":
          "border-transparent bg-stage-orange-bg text-stage-orange",
        tier:
          "border-border bg-card text-card-foreground",
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
