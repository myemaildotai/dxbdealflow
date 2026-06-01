import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="subtle-panel flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-line bg-white shadow-[0_10px_24px_rgba(15,42,95,0.06)]">
        <div className="h-6 w-6 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.85)_0%,rgba(212,175,55,0.15)_70%)]" />
      </div>
      <p className="mt-5 font-heading text-xl font-semibold text-brand-ink">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-brand-slate">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
