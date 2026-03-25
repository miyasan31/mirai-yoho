import type { TimeRange } from "@/domain/slot/time-range";

interface BlockedTimeProps {
  blockedTimeId: string;
  consultantId: string;
  timeRange: TimeRange;
}

export class BlockedTime {
  private constructor(
    private readonly blockedTimeId: string,
    private readonly consultantId: string,
    private readonly timeRange: TimeRange,
  ) {}

  static create(props: BlockedTimeProps): BlockedTime {
    return new BlockedTime(
      props.blockedTimeId,
      props.consultantId,
      props.timeRange,
    );
  }

  static reconstruct(props: BlockedTimeProps): BlockedTime {
    return new BlockedTime(
      props.blockedTimeId,
      props.consultantId,
      props.timeRange,
    );
  }

  getBlockedTimeId(): string {
    return this.blockedTimeId;
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getTimeRange(): TimeRange {
    return this.timeRange;
  }
}
