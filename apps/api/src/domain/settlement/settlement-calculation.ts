import { DomainError } from "@mirai-yoho/shared/domain-error";

/** 事務所を住所として利用する場合に控除する月額利用料 */
export const OFFICE_ADDRESS_FEE_JPY = 500;

/** システム利用料に外税で上乗せする消費税率 */
export const SETTLEMENT_TAX_RATE = 0.1;

export interface SettlementAmounts {
  /** 借受金合計（顧客が支払った税込額の合計） */
  grossJPY: number;
  systemFeeRatePercent: number;
  /** システム利用料（借受金 × 料率） */
  systemFeeJPY: number;
  /** システム利用料にかかる消費税（外税） */
  systemFeeTaxJPY: number;
  /** 事務所利用料（利用しない場合は 0） */
  officeFeeJPY: number;
  /** 占い師へ支払われる精算料 */
  settlementAmountJPY: number;
}

export interface SettlementCalculationInput {
  grossJPY: number;
  systemFeeRatePercent: number;
  usesOfficeAddress: boolean;
}

/**
 * 借受金からシステム利用料（外税）と事務所利用料を控除して精算料を求める。
 * 端数はすべて切り捨て（Money と同じ扱い）。
 */
export function calculateSettlement(
  input: SettlementCalculationInput,
): SettlementAmounts {
  const { grossJPY, systemFeeRatePercent, usesOfficeAddress } = input;

  if (!Number.isInteger(grossJPY) || grossJPY < 0) {
    throw new DomainError(
      "INVALID_SETTLEMENT_AMOUNT",
      "Gross amount must be a non-negative integer",
    );
  }
  if (
    !Number.isInteger(systemFeeRatePercent) ||
    systemFeeRatePercent < 0 ||
    systemFeeRatePercent > 100
  ) {
    throw new DomainError(
      "INVALID_SETTLEMENT_RATE",
      "Settlement rate must be an integer between 0 and 100",
    );
  }

  const systemFeeJPY = Math.floor((grossJPY * systemFeeRatePercent) / 100);
  const systemFeeTaxJPY = Math.floor(systemFeeJPY * SETTLEMENT_TAX_RATE);
  const officeFeeJPY = usesOfficeAddress ? OFFICE_ADDRESS_FEE_JPY : 0;

  return {
    grossJPY,
    systemFeeRatePercent,
    systemFeeJPY,
    systemFeeTaxJPY,
    officeFeeJPY,
    settlementAmountJPY:
      grossJPY - systemFeeJPY - systemFeeTaxJPY - officeFeeJPY,
  };
}
