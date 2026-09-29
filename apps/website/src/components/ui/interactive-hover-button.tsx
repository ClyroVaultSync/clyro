import { ArrowRight, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type InteractiveHoverButtonProps = {
  href?: string
  isLoading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>

export function InteractiveHoverButton({
  children,
  className,
  href,
  isLoading,
  ...props
}: InteractiveHoverButtonProps) {
  const Tag = href ? "a" : "button"

  return (
    <Tag
      href={href}
      disabled={!href ? isLoading : undefined}
      aria-disabled={isLoading || undefined}
      className={cn(
        "group relative inline-block w-auto cursor-pointer overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] p-2 px-6 text-center font-semibold text-heading",
        isLoading && "pointer-events-none opacity-70",
        className
      )}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      <div className="flex items-center justify-center gap-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-[var(--color-accent)] transition-all duration-300 group-hover:scale-[100.8]"></div>
        )}
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
          {children}
        </span>
      </div>
      <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-[var(--color-base)] opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100">
        <span>{children}</span>
        <ArrowRight />
      </div>
    </Tag>
  )
}
