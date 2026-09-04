import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        verified: "border-transparent bg-verified/15 text-verified",
        probable: "border-transparent bg-probable/15 text-probable",
        needsValidation: "border-transparent bg-needs-validation/15 text-needs-validation",
        weakEvidence: "border-transparent bg-weak-evidence/15 text-weak-evidence",
        unknown: "border-transparent bg-unknown/15 text-unknown",
        contradicted: "border-transparent bg-contradicted/15 text-contradicted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
