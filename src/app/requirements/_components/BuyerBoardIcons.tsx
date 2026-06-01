import type { SVGProps } from "react";

function IconBase(props: SVGProps<SVGSVGElement>) {
  return <svg fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />;
}

export function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </IconBase>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </IconBase>
  );
}

export function SortIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="M7 6h10" />
      <path d="M10 12h7" />
      <path d="M13 18h4" />
      <path d="m7 4-2 2 2 2" />
      <path d="m17 20 2-2-2-2" />
    </IconBase>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </IconBase>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </IconBase>
  );
}

export function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="m12 3 1.8 4.8L19 9.5l-4.2 2.4L13.2 17 11 12 6 9.5l4.8-1.7L12 3Z" />
      <path d="M5 4v2" />
      <path d="M4 5h2" />
      <path d="M18 17v2" />
      <path d="M17 18h2" />
    </IconBase>
  );
}

export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="M12 21s6-5.7 6-10.2A6 6 0 0 0 6 10.8C6 15.3 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </IconBase>
  );
}

export function CurrencyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="M12 4v16" />
      <path d="M16.5 7.5c-.7-1.1-2.2-1.8-4-1.8-2.5 0-4.5 1.4-4.5 3.4s1.8 2.8 4.5 3.3 4.5 1.2 4.5 3.3-2 3.5-4.7 3.5c-1.9 0-3.6-.7-4.5-2" />
    </IconBase>
  );
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="m4 10 8-6 8 6" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </IconBase>
  );
}

export function BedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="M4 18V9" />
      <path d="M4 13h16v5" />
      <path d="M7 13V9h4a2 2 0 0 1 2 2v2" />
      <path d="M20 18v2" />
      <path d="M4 20v-2" />
    </IconBase>
  );
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </IconBase>
  );
}

export function ChatBubbleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="M7 17.5 3.8 20V6.8A2.8 2.8 0 0 1 6.6 4h10.8a2.8 2.8 0 0 1 2.8 2.8v7.4a2.8 2.8 0 0 1-2.8 2.8H7Z" />
    </IconBase>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase viewBox="0 0 24 24" {...props}>
      <path d="m5 13 4 4L19 7" />
    </IconBase>
  );
}

