import { Badge } from "@/components/ui/badge";

const BOOKING_STATUS_MAP: Record<
  string,
  { label: string; colorPalette: string }
> = {
  pending: { label: "保留中", colorPalette: "yellow" },
  confirmed: { label: "確定", colorPalette: "blue" },
  completed: { label: "完了", colorPalette: "green" },
  cancelled: { label: "キャンセル", colorPalette: "red" },
};

const PAYMENT_STATUS_MAP: Record<
  string,
  { label: string; colorPalette: string }
> = {
  pending: { label: "保留中", colorPalette: "yellow" },
  captured: { label: "決済済", colorPalette: "green" },
  failed: { label: "失敗", colorPalette: "red" },
  refunded: { label: "返金済", colorPalette: "gray" },
};

export function BookingStatusBadge({ status }: { status: string }) {
  const config = BOOKING_STATUS_MAP[status] ?? {
    label: status,
    colorPalette: "gray",
  };
  return (
    <Badge variant="subtle" size="sm" colorPalette={config.colorPalette}>
      {config.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const config = PAYMENT_STATUS_MAP[status] ?? {
    label: status,
    colorPalette: "gray",
  };
  return (
    <Badge variant="subtle" size="sm" colorPalette={config.colorPalette}>
      {config.label}
    </Badge>
  );
}

const USER_STATUS_MAP: Record<string, { label: string; colorPalette: string }> =
  {
    pending: { label: "招待中", colorPalette: "yellow" },
    registered: { label: "登録済み", colorPalette: "green" },
  };

export function UserStatusBadge({ status }: { status: string }) {
  const config = USER_STATUS_MAP[status] ?? {
    label: status,
    colorPalette: "gray",
  };
  return (
    <Badge variant="subtle" size="sm" colorPalette={config.colorPalette}>
      {config.label}
    </Badge>
  );
}

export function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant="subtle" size="sm" colorPalette={isActive ? "green" : "red"}>
      {isActive ? "有効" : "無効"}
    </Badge>
  );
}
