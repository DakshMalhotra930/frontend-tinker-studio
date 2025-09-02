import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-md",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-md",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-md",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80 shadow-md",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/80 shadow-md",
        outline: "border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50",
        academic: "border-primary/20 bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-md",
        subject: "border-secondary/20 bg-gradient-to-r from-secondary/90 to-secondary text-secondary-foreground shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
