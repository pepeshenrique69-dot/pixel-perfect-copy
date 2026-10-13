import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 23V9l14 14V9" fill="none" className="stroke-primary-foreground" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="9" r="2.2" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-[0.14em]">NEXVYA</span>
    </span>
  );
}
