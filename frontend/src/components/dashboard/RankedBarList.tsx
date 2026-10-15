import { formatCurrency } from "@/lib/format";

export interface RankedBarItem {
  key: string;
  label: string;
  value: number;
}

interface RankedBarListProps {
  items: RankedBarItem[];
  emptyLabel: string;
}

export function RankedBarList({ items, emptyLabel }: RankedBarListProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-text-faint">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((item) => item.value));

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate font-body text-[13px] text-text-dim" title={item.label}>
            {item.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent/15">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: max > 0 ? `${Math.max((item.value / max) * 100, 3)}%` : "0%" }}
            />
          </div>
          <span className="w-24 shrink-0 text-right font-mono text-[12.5px] tabular-nums text-text-faint">
            {formatCurrency(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
