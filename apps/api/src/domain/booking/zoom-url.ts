import { DomainError } from "@mirai-yoho/shared/domain-error";

export class ZoomUrl {
  private constructor(private readonly value: string) {}

  static create(url: string): ZoomUrl {
    if (!url || url.trim().length === 0) {
      throw new DomainError("INVALID_ZOOM_URL", "Zoom URL must not be empty");
    }
    return new ZoomUrl(url);
  }

  static reconstruct(url: string): ZoomUrl {
    return new ZoomUrl(url);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ZoomUrl): boolean {
    return this.value === other.value;
  }
}
