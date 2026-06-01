import Image from "next/image";

export function LoadingScreen({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel relative flex w-full max-w-md flex-col items-center gap-5 overflow-hidden p-8 text-center">
        <div className="absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.85),transparent)]" />
        <div className="relative h-20 w-44">
          <Image src="/assets/Logo-Blue.png" alt="DXB Deal Flow" fill className="object-contain" sizes="176px" priority />
        </div>
        <div>
          <p className="font-heading text-2xl font-semibold text-brand-navy">DXB Deal Flow</p>
          <p className="mt-2 text-sm text-brand-slate">{label}</p>
        </div>
      </div>
    </div>
  );
}
