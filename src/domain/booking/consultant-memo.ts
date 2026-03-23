export class ConsultantMemo {
  private constructor(private readonly value: string) {}

  static create(memo: string): ConsultantMemo {
    return new ConsultantMemo(memo);
  }

  static reconstruct(memo: string): ConsultantMemo {
    return new ConsultantMemo(memo);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ConsultantMemo): boolean {
    return this.value === other.value;
  }
}
