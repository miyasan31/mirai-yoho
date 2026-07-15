import type { Coupon } from "@/domain/coupon/coupon";

export interface ICouponRepository {
  findById(organizationId: string, couponId: string): Promise<Coupon | null>;
  findByOrganizationId(organizationId: string): Promise<Coupon[]>;
  save(coupon: Coupon): Promise<void>;
}
