import type { SVGProps } from "react";

// Set de íconos propio (line icons, viewBox 24x24, stroke actual) para
// no sumar una dependencia solo para 15 glifos del sidebar.
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function SalesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h16l-1.5 9.5a1.5 1.5 0 0 1-1.48 1.5H6.98a1.5 1.5 0 0 1-1.48-1.5L4 6Z" />
      <path d="M8 6V5a4 4 0 0 1 8 0v1" />
      <path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function QuotesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 3.5h7L18.5 8V20a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M9 12.5h6M9 15.5h6M9 9.5h2.5" />
    </svg>
  );
}

export function OrderNotesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="m8.5 13 2 2 4-4" />
      <path d="M9 17.5h6" />
    </svg>
  );
}

export function ProductsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m3.5 8 8.5-4.5L20.5 8 12 12.5 3.5 8Z" />
      <path d="M3.5 8v8L12 20.5 20.5 16V8" />
      <path d="M12 12.5V20.5" />
    </svg>
  );
}

export function CustomersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c.6-3 2.7-5 5.5-5s4.9 2 5.5 5" />
      <path d="M15.5 5.5a3 3 0 0 1 0 6" />
      <path d="M15 14.6c2.4.4 4.1 2.3 4.6 4.9" />
    </svg>
  );
}

export function CashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6.5" width="18" height="12" rx="1.5" />
      <path d="M3 10h18" />
      <circle cx="7" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M14 14.5h4" />
    </svg>
  );
}

export function AccountsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 9.5 12 4l8.5 5.5" />
      <path d="M5 10v8.5M9.5 10v8.5M14.5 10v8.5M19 10v8.5" />
      <path d="M3.5 19h17" />
    </svg>
  );
}

export function TeamIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="8.5" cy="8" r="3" />
      <path d="M2.8 19c.6-2.9 2.7-4.8 5.7-4.8s5.1 1.9 5.7 4.8" />
      <path d="M16 4.3a2.6 2.6 0 0 1 0 5" />
      <path d="M15.6 14.3c2.1.5 3.6 2.2 4.1 4.7" />
      <path d="M17.5 9.2h3M19 7.7v3" />
    </svg>
  );
}

export function CompanyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4.5" y="3.5" width="10" height="17" rx="1" />
      <rect x="14.5" y="9.5" width="5" height="11" rx="1" />
      <path d="M7.5 7h1M11 7h1M7.5 10.5h1M11 10.5h1M7.5 14h1M11 14h1" />
      <path d="M16.7 13h1M16.7 16h1" />
    </svg>
  );
}

export function IntegrationsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 3.5v3M15 3.5v3M9 17.5v3M15 17.5v3" />
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
    </svg>
  );
}

export function AdminIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 19 6.5v5c0 4.5-2.9 7.6-7 9-4.1-1.4-7-4.5-7-9v-5L12 3.5Z" />
      <path d="m9.3 12 1.9 1.9 3.5-3.8" />
    </svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 20H5.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H9" />
      <path d="M15.5 16.5 20 12l-4.5-4.5" />
      <path d="M20 12H9" />
    </svg>
  );
}

export function CollapseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5v14M14.5 6l-5 6 5 6M20 6l-5 6 5 6" />
    </svg>
  );
}

export function ExpandIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5v14M9.5 6l5 6-5 6M15 6l5 6-5 6" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
