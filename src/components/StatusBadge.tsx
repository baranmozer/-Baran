import type { TransferStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_META } from "@/lib/utils";

export function StatusBadge({ status }: { status: TransferStatus }) {
  const { color } = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
