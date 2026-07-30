import { valibotResolver } from "@hookform/resolvers/valibot";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Textarea } from "@mirai-yoho/ui/components/ui/textarea";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import {
  useConsultantAppraisalReport,
  usePublishConsultantAppraisalReport,
  useSaveConsultantAppraisalReportDraft,
} from "@/hooks/use-consultant-appraisal-reports";
import {
  APPRAISAL_REPORT_EMPTY_VALUES,
  APPRAISAL_REPORT_SECTIONS,
  type AppraisalReportFormValues,
  appraisalReportFormSchema,
} from "./appraisal-report-form-schema";

const PAGE_TITLE = "鑑定書";
const PAGE_DESCRIPTION =
  "鑑定テーマ・現状・鑑定結果・開運アクション・総括を入力し、お客様に発行する画面です。発行すると内容は編集できなくなります。";

export default function ConsultantAppraisalReportEditPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { buildPath, organizationId } = useOrganizationRouting();
  const bookingId = params.id ?? "";
  const [publishOpen, setPublishOpen] = useState(false);

  const { data, isLoading } = useConsultantAppraisalReport(bookingId);
  const saveDraft = useSaveConsultantAppraisalReportDraft();
  const publish = usePublishConsultantAppraisalReport();

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<AppraisalReportFormValues>({
    resolver: valibotResolver(appraisalReportFormSchema),
    defaultValues: APPRAISAL_REPORT_EMPTY_VALUES,
  });

  const report = data?.data?.report ?? null;
  const memoDefaults = data?.data?.memoDefaults;
  const editable = data?.data?.editable ?? false;
  const isPublished = report?.status === "published";

  useEffect(() => {
    if (!data) return;
    if (report) {
      reset({
        title: report.title,
        customerName: report.customerName,
        birthDate: report.birthDate,
        appraisalDate: report.appraisalDate,
        theme: report.theme,
        currentSituation: report.currentSituation,
        result: report.result,
        luckyAction: report.luckyAction,
        summary: report.summary,
      });
      return;
    }
    // 未作成のときは鑑定メモの内容をヘッダの初期値として引き継ぐ
    reset({
      ...APPRAISAL_REPORT_EMPTY_VALUES,
      customerName: memoDefaults?.customerName ?? "",
      birthDate: memoDefaults?.birthDate ?? "",
      appraisalDate: memoDefaults?.appraisalDate ?? "",
    });
  }, [data, report, memoDefaults, reset]);

  const backToBookings = () => navigate({ to: buildPath("/bookings") });

  const persistDraft = async (values: AppraisalReportFormValues) => {
    await saveDraft.mutateAsync({
      organizationId: organizationId ?? "",
      bookingId,
      data: {
        title: values.title.trim(),
        customerName: values.customerName.trim(),
        birthDate: values.birthDate,
        appraisalDate: values.appraisalDate,
        theme: values.theme.trim(),
        currentSituation: values.currentSituation.trim(),
        result: values.result.trim(),
        luckyAction: values.luckyAction.trim(),
        summary: values.summary.trim(),
      },
    });
    if (organizationId) {
      await invalidateAfter.appraisalReportMutation(
        queryClient,
        organizationId,
      );
    }
  };

  const onSubmit = async (values: AppraisalReportFormValues) => {
    try {
      await persistDraft(values);
      toaster.create({ type: "success", title: "鑑定書を保存しました" });
      void backToBookings();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const onPublish = async () => {
    try {
      // 発行前に画面の内容を確定させる
      await persistDraft(getValues());
      await publish.mutateAsync({
        organizationId: organizationId ?? "",
        bookingId,
      });
      if (organizationId) {
        await invalidateAfter.appraisalReportMutation(
          queryClient,
          organizationId,
        );
      }
      setPublishOpen(false);
      toaster.create({ type: "success", title: "鑑定書を発行しました" });
      void backToBookings();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  if (isLoading) {
    return (
      <styled.div maxW="720px">
        <PageHeader buildPath={buildPath} />
        <styled.div
          display="flex"
          flexDir="column"
          gap="4"
          shadow="xs"
          rounded="l2"
          p="6"
        >
          <Skeleton height="4" width="120px" />
          <Skeleton height="10" />
          <Skeleton height="32" />
          <Skeleton height="10" width="180px" />
        </styled.div>
      </styled.div>
    );
  }

  return (
    <styled.div maxW="720px">
      <PageHeader buildPath={buildPath} status={report?.status} />
      <styled.div shadow="xs" rounded="l2" p="6">
        <styled.form
          onSubmit={handleSubmit(onSubmit)}
          display="flex"
          flexDir="column"
          gap="4"
        >
          <Field.Root invalid={!!errors.title}>
            <Field.Label>タイトル</Field.Label>
            <Input id="title" readOnly={isPublished} {...register("title")} />
            <Field.HelperText>
              例: 2026年下半期の運勢と仕事運について
            </Field.HelperText>
            {errors.title && (
              <Field.ErrorText>{errors.title.message}</Field.ErrorText>
            )}
          </Field.Root>

          <Field.Root invalid={!!errors.customerName}>
            <Field.Label>お名前</Field.Label>
            <Input
              id="customerName"
              readOnly={isPublished}
              {...register("customerName")}
            />
            {errors.customerName && (
              <Field.ErrorText>{errors.customerName.message}</Field.ErrorText>
            )}
          </Field.Root>

          <Field.Root>
            <Field.Label>生年月日</Field.Label>
            <Input
              id="birthDate"
              type="date"
              readOnly={isPublished}
              {...register("birthDate")}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>鑑定日</Field.Label>
            <Input
              id="appraisalDate"
              type="date"
              readOnly={isPublished}
              {...register("appraisalDate")}
            />
          </Field.Root>

          {APPRAISAL_REPORT_SECTIONS.map((section) => (
            <Field.Root key={section.name} invalid={!!errors[section.name]}>
              <Field.Label>{section.label}</Field.Label>
              <Textarea
                id={section.name}
                rows={section.rows}
                readOnly={isPublished}
                {...register(section.name)}
              />
              <Field.HelperText>{section.helper}</Field.HelperText>
              {errors[section.name] && (
                <Field.ErrorText>
                  {errors[section.name]?.message}
                </Field.ErrorText>
              )}
            </Field.Root>
          ))}

          {isPublished ? (
            <styled.div display="flex" gap="2">
              <Button type="button" variant="outline" onClick={backToBookings}>
                予約一覧に戻る
              </Button>
            </styled.div>
          ) : (
            <styled.div display="flex" gap="2" flexWrap="wrap">
              <Button
                type="submit"
                loading={saveDraft.isPending}
                loadingText="保存中..."
                disabled={!editable}
              >
                下書きを保存
              </Button>
              <PublishButton
                editable={editable}
                open={publishOpen}
                onOpenChange={setPublishOpen}
                onPublish={onPublish}
                isPending={publish.isPending || saveDraft.isPending}
              />
              <Button type="button" variant="outline" onClick={backToBookings}>
                キャンセル
              </Button>
            </styled.div>
          )}

          {!editable && !isPublished && (
            <Text textStyle="sm" color="fg.muted">
              鑑定の終了時刻を過ぎた予約でのみ鑑定書を作成できます。
            </Text>
          )}
        </styled.form>
      </styled.div>
    </styled.div>
  );
}

function PageHeader({
  buildPath,
  status,
}: {
  buildPath: (path: string) => string;
  status?: "draft" | "published";
}) {
  return (
    <>
      <styled.div display="flex" alignItems="center" gap="2" mb="6">
        <Tooltip content="予約一覧に戻る" showArrow>
          <IconButton variant="subtle" size="sm" asChild>
            <Link to={buildPath("/bookings")}>
              <ArrowLeft size={18} />
            </Link>
          </IconButton>
        </Tooltip>
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          {PAGE_TITLE}
        </Text>
        {status === "published" && <Badge colorPalette="green">発行済み</Badge>}
        {status === "draft" && <Badge colorPalette="yellow">下書き</Badge>}
      </styled.div>
      <Text textStyle="sm" color="fg.muted" mb="4">
        {PAGE_DESCRIPTION}
      </Text>
    </>
  );
}

function PublishButton({
  editable,
  open,
  onOpenChange,
  onPublish,
  isPending,
}: {
  editable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: () => Promise<void>;
  isPending: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
    >
      <Dialog.Trigger asChild>
        <Button type="button" colorPalette="green" disabled={!editable}>
          発行する
        </Button>
      </Dialog.Trigger>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>鑑定書を発行しますか？</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Text color="fg.muted">
              発行するとお客様のマイページに表示され、内容は編集できなくなります。
            </Text>
          </Dialog.Body>
          <Dialog.Footer display="flex" justifyContent="flex-end" gap="3">
            <Dialog.CloseTrigger asChild>
              <Button variant="outline">戻る</Button>
            </Dialog.CloseTrigger>
            <Button
              colorPalette="green"
              onClick={() => void onPublish()}
              loading={isPending}
              loadingText="発行中..."
            >
              発行する
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
