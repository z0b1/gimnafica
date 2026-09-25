type Row = { label: string; value: number };

/**
 * Ranked horizontal bars, one hue. Values are printed at the bar tip, so the
 * list doubles as the table view.
 */
export function BarList({
  rows,
  total,
  limit,
  showShare = false,
}: {
  rows: Row[];
  total: number;
  limit?: number;
  showShare?: boolean;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const rest = rows.slice(shown.length);
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div>
      <ul className="space-y-2.5">
        {shown.map((row) => {
          const share = Math.round((row.value / total) * 100);
          return (
            <li
              key={row.label}
              title={`${row.label}: ${row.value}${showShare ? ` (${share}%)` : ""}`}
              className="grid grid-cols-[minmax(6rem,11rem)_1fr] items-center gap-3 text-sm"
            >
              <span className="truncate text-stone-700">{row.label}</span>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 rounded-r bg-amber-700"
                  style={{ width: `calc((100% - 4.5rem) * ${row.value / max})`, minWidth: 2 }}
                />
                <span className="shrink-0 font-semibold tabular-nums">
                  {row.value}
                  {showShare && <span className="ml-1 font-normal text-stone-500">{share}%</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {rest.length > 0 && (
        <p className="mt-3 text-xs text-stone-500">
          i još {rest.length}, ukupno {rest.reduce((s, r) => s + r.value, 0)}
        </p>
      )}
    </div>
  );
}
