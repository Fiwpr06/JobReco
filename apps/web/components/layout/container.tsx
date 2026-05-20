import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  size?: "default" | "sm" | "lg" | "xl"
}

export function Container({ 
  children, 
  className, 
  size = "default",
  ...props 
}: ContainerProps) {
  return (
    <div 
      className={cn(
        "mx-auto px-6 md:px-8", // Consistent horizontal spacing
        {
          "max-w-7xl": size === "default",
          "max-w-5xl": size === "sm",
          "max-w-[1400px]": size === "lg",
          "max-w-none": size === "xl",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
