import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "yyyy/MM/dd (E) HH:mm", { locale: ja });
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm", { locale: ja });
}

export function formatDateTimeRange(startIso: string, endIso: string): string {
  return `${formatDateTime(startIso)}〜${formatTime(endIso)}`;
}

export function formatYen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}
