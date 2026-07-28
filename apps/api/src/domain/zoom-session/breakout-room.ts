import { DomainError } from "@mirai-yoho/shared/domain-error";

/**
 * Zoom はブレイクアウトルーム名の上限を API ドキュメントで公開していないため、
 * クライアント UI 側で確認されている 32 文字を上限として扱う。
 */
export const BREAKOUT_ROOM_NAME_MAX_LENGTH = 32;

/** 時間帯の区切り。全角のチルダ・波ダッシュは Zoom クライアントで化ける報告があるため半角を使う */
const TIME_RANGE_SEPARATOR = "-";

const TRUNCATION_MARK = "…";

interface BreakoutRoomProps {
  bookingId: string;
  consultantId: string;
  roomName: string;
  customerEmail: string;
}

interface ComposeRoomNameProps {
  consultantName: string;
  startsAt: Date;
  endsAt: Date;
}

function formatJstTime(instant: Date): string {
  return instant.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function truncate(value: string, maxLength: number): string {
  if (maxLength <= 0) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - TRUNCATION_MARK.length)}${TRUNCATION_MARK}`;
}

/**
 * 予約 1 件に対応するブレイクアウトルーム。
 * 顧客は自分専用のルームで待機し、相談員が開始時刻になってそのルームへ移動する運用のため、
 * 参加者は顧客 1 名のみで、相談員のメールアドレスは含めない。
 */
export class BreakoutRoom {
  private constructor(
    private readonly bookingId: string,
    private readonly consultantId: string,
    private readonly roomName: string,
    private readonly customerEmail: string,
  ) {}

  static create(props: BreakoutRoomProps): BreakoutRoom {
    if (props.roomName.length > BREAKOUT_ROOM_NAME_MAX_LENGTH) {
      throw new DomainError(
        "BREAKOUT_ROOM_NAME_TOO_LONG",
        `Breakout room name must be ${BREAKOUT_ROOM_NAME_MAX_LENGTH} characters or fewer`,
      );
    }
    return new BreakoutRoom(
      props.bookingId,
      props.consultantId,
      props.roomName,
      props.customerEmail,
    );
  }

  static reconstruct(props: BreakoutRoomProps): BreakoutRoom {
    return new BreakoutRoom(
      props.bookingId,
      props.consultantId,
      props.roomName,
      props.customerEmail,
    );
  }

  /**
   * `{相談員名} {開始}-{終了}`（JST）形式のルーム名を組み立てる。
   * 相談員名が長い場合は上限に収まるよう切り詰める。
   */
  static composeRoomName(props: ComposeRoomNameProps): string {
    const timeRange = `${formatJstTime(props.startsAt)}${TIME_RANGE_SEPARATOR}${formatJstTime(props.endsAt)}`;
    const consultantName = truncate(
      props.consultantName,
      BREAKOUT_ROOM_NAME_MAX_LENGTH - timeRange.length - 1,
    );
    return `${consultantName} ${timeRange}`;
  }

  getBookingId(): string {
    return this.bookingId;
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getRoomName(): string {
    return this.roomName;
  }

  getCustomerEmail(): string {
    return this.customerEmail;
  }
}
