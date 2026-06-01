export function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="panel relative flex h-full min-h-[136px] min-w-0 flex-col justify-between overflow-hidden p-4 sm:min-h-[156px] sm:p-5 md:min-h-[176px] md:p-6">
      <div className="absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.8),transparent)] sm:inset-x-6 md:inset-x-8" />
      <div>
        <p className="micro-copy line-clamp-2 whitespace-normal break-words leading-tight lg:block lg:truncate lg:whitespace-nowrap lg:leading-normal">{label}</p>
        <p className="mt-3 break-words font-heading text-xl font-bold leading-none text-brand-navy sm:text-2xl md:mt-4 md:text-4xl">{value}</p>
      </div>
      <p className="mt-4 break-words border-t border-brand-line/80 pt-3 text-xs leading-5 text-brand-slate sm:text-sm md:mt-6 md:pt-4 md:leading-6">{helper}</p>
    </div>
  );
}
