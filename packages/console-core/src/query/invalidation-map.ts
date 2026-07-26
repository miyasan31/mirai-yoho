import { getGetPricePlansQueryKey } from "@mirai-yoho/api-client/api/booking/booking";
import {
  getGetConsoleAccountsQueryKey,
  getGetConsoleBookingSettingsQueryKey,
  getGetConsoleBookingsQueryKey,
  getGetConsoleConsultantStatusesQueryKey,
  getGetConsoleConsultantsQueryKey,
  getGetConsoleCouponsQueryKey,
  getGetConsoleDashboardQueryKey,
  getGetConsolePaymentsQueryKey,
  getGetConsolePolicyRevisionQueryKey,
  getGetConsolePolicyRevisionsQueryKey,
  getGetConsoleRolesQueryKey,
  getGetConsoleSlotsQueryKey,
  getGetPolicyRevisionDiffQueryKey,
} from "@mirai-yoho/api-client/api/console/console";
import {
  getGetConsultantBookingsQueryKey,
  getGetConsultantProfileQueryKey,
  getGetConsultantsQueryKey,
  getListPricePlansQueryKey,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import {
  getGetAvailableCouponsQueryKey,
  getGetCustomerCouponsQueryKey,
  getGetCustomerPolicyAgreementStatusQueryKey,
  getGetMyBookingsQueryKey,
} from "@mirai-yoho/api-client/api/customer/customer";
import { getGetLatestPublishedPolicyQueryKey } from "@mirai-yoho/api-client/api/public/public";
import { getGetPublicSettingsQueryKey } from "@mirai-yoho/api-client/api/settings/settings";
import { getGetSlotsQueryKey } from "@mirai-yoho/api-client/api/slot/slot";
import type { PolicyType } from "@mirai-yoho/api-client/schemas";
import type { QueryClient } from "@tanstack/react-query";

/**
 * 業務アクション別に「無効化すべき関連クエリ集合」を一括で invalidate する。
 * すべて params を渡さない prefix 一致で呼び、一覧・ページネーション・フィルタ違いを横断的に古くする。
 */
export const invalidateAfter = {
  bookingCreate: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: getGetMyBookingsQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetSlotsQueryKey(organizationId) }),
      qc.invalidateQueries({
        queryKey: getGetAvailableCouponsQueryKey(organizationId),
      }),
      qc.invalidateQueries({ queryKey: getGetCustomerCouponsQueryKey() }),
      qc.invalidateQueries({
        queryKey: getGetConsoleBookingsQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetConsultantBookingsQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetConsoleDashboardQueryKey(organizationId),
      }),
    ]),

  bookingCancel: (qc: QueryClient, organizationId: string) =>
    invalidateAfter.bookingCreate(qc, organizationId),

  slotMutation: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: getGetSlotsQueryKey(organizationId) }),
      qc.invalidateQueries({
        queryKey: getGetConsoleSlotsQueryKey(organizationId),
      }),
    ]),

  consultantMutation: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getGetConsoleConsultantsQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetConsultantsQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetConsultantProfileQueryKey(organizationId),
      }),
    ]),

  couponMutation: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getGetConsoleCouponsQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetAvailableCouponsQueryKey(organizationId),
      }),
      qc.invalidateQueries({ queryKey: getGetCustomerCouponsQueryKey() }),
    ]),

  couponReceive: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getGetAvailableCouponsQueryKey(organizationId),
      }),
      qc.invalidateQueries({ queryKey: getGetCustomerCouponsQueryKey() }),
    ]),

  pricePlanMutation: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getListPricePlansQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetPricePlansQueryKey(organizationId),
      }),
    ]),

  bookingSettingsMutation: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getGetConsoleBookingSettingsQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetPublicSettingsQueryKey(organizationId),
      }),
    ]),

  consultantStatusesMutation: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getGetConsoleConsultantStatusesQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetConsoleConsultantsQueryKey(organizationId),
      }),
    ]),

  roleMutation: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getGetConsoleRolesQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetConsoleAccountsQueryKey(organizationId),
      }),
    ]),

  accountMutation: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getGetConsoleAccountsQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetConsoleRolesQueryKey(organizationId),
      }),
    ]),

  paymentChargeMutation: (qc: QueryClient, organizationId: string) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getGetConsoleBookingsQueryKey(organizationId),
      }),
      qc.invalidateQueries({
        queryKey: getGetConsolePaymentsQueryKey(organizationId),
      }),
    ]),

  consultantBookingMutation: (qc: QueryClient, organizationId: string) =>
    qc.invalidateQueries({
      queryKey: getGetConsultantBookingsQueryKey(organizationId),
    }),

  policyRevisionMutation: (
    qc: QueryClient,
    organizationId: string,
    type: PolicyType,
  ) =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: getGetConsolePolicyRevisionsQueryKey(organizationId, type),
      }),
      // 差分クエリと詳細クエリは params/revisionId をキー末尾に持つため prefix で一括
      qc.invalidateQueries({
        queryKey: getGetConsolePolicyRevisionQueryKey(
          organizationId,
          type,
          "",
        ).slice(0, -1),
      }),
      qc.invalidateQueries({
        queryKey: getGetPolicyRevisionDiffQueryKey(organizationId, type, {
          to: "",
        }).slice(0, -1),
      }),
      qc.invalidateQueries({
        queryKey: getGetLatestPublishedPolicyQueryKey(organizationId, type),
      }),
      qc.invalidateQueries({
        queryKey: getGetCustomerPolicyAgreementStatusQueryKey(organizationId),
      }),
    ]),
} as const;
