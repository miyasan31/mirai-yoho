import type {
  ILateArrivalAlertService,
  LateArrivalAlertParams,
} from "@/application/shared/late-arrival-alert-service";
import { envServer } from "@/config/env.server";

function formatDatetime(datetime: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(datetime);
}

function buildAlertText(params: LateArrivalAlertParams): string {
  return [
    "相談員の入室確認がまだ押されていません。",
    "",
    `対象の相談員: ${params.consultantName}`,
    `相談員メールアドレス: ${params.consultantEmail}`,
    `相談員電話番号: ${params.consultantPhone}`,
    `相談されるユーザー名: ${params.customerName}`,
    `予約時間: ${formatDatetime(params.startsAt)}`,
    `開始からの経過分数: ${params.elapsedMinutes}分`,
    `予約ID: ${params.bookingId}`,
    `組織ID: ${params.organizationId}`,
  ].join("\n");
}

export class LineWorksLateArrivalAlertService
  implements ILateArrivalAlertService
{
  async sendLateArrivalAlert(params: LateArrivalAlertParams): Promise<void> {
    const response = await fetch(envServer.lineWorksLateArrivalWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "相談員入室遅延アラート",
        body: {
          text: buildAlertText(params),
        },
        button: {
          label: "予約管理を開く",
          url: params.adminBookingsUrl,
        },
      }),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new Error(
        `LINE WORKS webhook failed: ${response.status} ${responseText}`,
      );
    }
  }
}
