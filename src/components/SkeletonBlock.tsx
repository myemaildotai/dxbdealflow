import { cn } from "@/lib/deal-utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton-block", className)} aria-hidden="true" />;
}
