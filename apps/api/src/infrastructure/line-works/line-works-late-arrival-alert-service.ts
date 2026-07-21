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
    "占い師の入室確認がまだ押されていません。",
    "",
    `対象の占い師: ${params.consultantName}`,
    `占い師メールアドレス: ${params.consultantEmail}`,
    `占い師電話番号: ${params.consultantPhone}`,
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
        title: "占い師入室遅延アラート",
        body: {
          text: buildAlertText(params),
        },
        button: {
          label: "予約管理を開く",
          url: params.consoleBookingsUrl,
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
