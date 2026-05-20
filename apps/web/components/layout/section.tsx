import { cn } from "@/lib/utils"

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  variant?: "default" | "alternate" | "muted" | "transparent"
  border?: "none" | "top" | "bottom" | "both"
}

export function Section({ 
  children, 
  className, 
  variant = "transparent",
  border = "none",
  ...props 
}: SectionProps) {
  return (
    <section 
      className={cn(
        "py-16 md:py-24", // Consistent vertical spacing
        {
          "bg-base": variant === "default",
          "bg-surface/30": variant === "alternate",
          "bg-elevated": variant === "muted",
          "bg-transparent": variant === "transparent",
        },
        {
          "border-t border-border": border === "top" || border === "both",
          "border-b border-border": border === "bottom" || border === "both",
        },
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}
