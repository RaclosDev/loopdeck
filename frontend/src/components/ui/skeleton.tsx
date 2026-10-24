import { cn } from "../../lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--bg-glass-strong)] border border-[var(--border-subtle)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
