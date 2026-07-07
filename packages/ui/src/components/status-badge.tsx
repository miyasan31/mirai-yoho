import { Badge } from "./ui/badge";

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
  setup_pending: { label: "決済設定待ち", colorPalette: "yellow" },
  setup_complete: { label: "決済準備完了", colorPalette: "blue" },
  charged: { label: "決済済", colorPalette: "green" },
  refunded: { label: "返金済", colorPalette: "gray" },
  cancelled: { label: "キャンセル", colorPalette: "red" },
  failed: { label: "失敗", colorPalette: "red" },
  // Legacy aliases kept for backward compatibility.
  pending: { label: "保留中", colorPalette: "yellow" },
  captured: { label: "決済済", colorPalette: "green" },
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

const ACCOUNT_STATUS_MAP: Record<
  string,
  { label: string; colorPalette: string }
> = {
  pending: { label: "招待中", colorPalette: "yellow" },
  registered: { label: "登録済み", colorPalette: "green" },
};

export function AccountStatusBadge({ status }: { status: string }) {
  const config = ACCOUNT_STATUS_MAP[status] ?? {
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
