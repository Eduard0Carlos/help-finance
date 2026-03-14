import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValues?: boolean;
  formatValue?: (v: number) => string;
  className?: string;
  color?: string;
}

export function ProgressBar({
  value,
  max,
  label,
  showValues = false,
  formatValue,
  className,
  color = "#00d4aa",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const fmt = formatValue ?? ((v) => String(v));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-xs text-[#9ca3af]">{label}</span>}
      <div className="flex items-center gap-2">
        {showValues && (
          <span className="text-xs text-[#9ca3af] shrink-0">{fmt(value)}</span>
        )}
        <div className="flex-1 h-1.5 bg-[#2a2a3e] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        {showValues && (
          <>
            <span className="text-xs text-[#9ca3af] shrink-0">{pct}%</span>
            <span className="text-xs text-[#9ca3af] shrink-0">{fmt(max)}</span>
          </>
        )}
      </div>
    </div>
  );
}
