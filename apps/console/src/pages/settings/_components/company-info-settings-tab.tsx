import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { useQueryClient } from "@tanstack/react-query";
import type { FormEventHandler } from "react";
import { useEffect, useState } from "react";
import type { UseFormRegister } from "react-hook-form";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import {
  useConsoleCompanyInfo,
  useUpdateConsoleCompanyInfo,
} from "@/hooks/use-console-booking-settings";

export type CompanyInfoFormValues = {
  companyName: string;
  address: string;
  officeAddress: string;
};

const EMPTY_COMPANY_INFO: CompanyInfoFormValues = {
  companyName: "",
  address: "",
  officeAddress: "",
};

type CompanyInfoSettingsTabProps = {
  register: UseFormRegister<CompanyInfoFormValues>;
  isLoading: boolean;
  isPending: boolean;
  isReadOnly: boolean;
  isInitialized: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

function CompanyInfoSettingsTabView({
  register,
  isLoading,
  isPending,
  isReadOnly,
  isInitialized,
  onSubmit,
}: CompanyInfoSettingsTabProps) {
  const isDisabled = isLoading || isPending || isReadOnly;

  return (
    <styled.form
      onSubmit={onSubmit}
      display="flex"
      flexDirection="column"
      gap="4"
      maxW="480px"
    >
      <styled.div>
        <Text as="h2" textStyle="lg" fontWeight="semibold" mb="1">
          会社情報
        </Text>
        <Text color="fg.muted" textStyle="sm">
          占い師が発行する精算書の宛先と、事務所を住所として利用する場合の住所に使われます。
        </Text>
      </styled.div>
      <styled.div>
        <Text textStyle="sm" mb="1">
          会社名
        </Text>
        <Input
          {...register("companyName")}
          aria-label="会社名"
          disabled={isDisabled}
        />
      </styled.div>
      <styled.div>
        <Text textStyle="sm" mb="1">
          所在地
        </Text>
        <Input
          {...register("address")}
          aria-label="所在地"
          disabled={isDisabled}
        />
      </styled.div>
      <styled.div>
        <Text textStyle="sm" mb="1">
          事務所所在地
        </Text>
        <Input
          {...register("officeAddress")}
          aria-label="事務所所在地"
          disabled={isDisabled}
        />
        <Text textStyle="xs" color="fg.muted" mt="1">
          「事務所を住所として利用」にチェックした占い師の精算書に、発行者住所として記載されます。
        </Text>
      </styled.div>
      <styled.div display="flex">
        <Button
          type="submit"
          loading={isPending}
          loadingText="保存中..."
          disabled={isLoading || !isInitialized || isReadOnly}
        >
          保存
        </Button>
      </styled.div>
    </styled.form>
  );
}

type CompanyInfoSettingsTabContainerProps = {
  organizationId: string | undefined;
  isReadOnly: boolean;
};

export function CompanyInfoSettingsTab({
  organizationId,
  isReadOnly,
}: CompanyInfoSettingsTabContainerProps) {
  const { data, isLoading } = useConsoleCompanyInfo();
  const updateCompanyInfo = useUpdateConsoleCompanyInfo();
  const queryClient = useQueryClient();
  const form = useForm<CompanyInfoFormValues>({
    defaultValues: EMPTY_COMPANY_INFO,
  });
  const { reset } = form;
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || !data?.data) return;
    reset(data.data.companyInfo ?? EMPTY_COMPANY_INFO);
    setInitialized(true);
  }, [data, initialized, reset]);

  const save = async (values: CompanyInfoFormValues) => {
    if (!organizationId || isReadOnly) return;
    await updateCompanyInfo.mutateAsync({
      organizationId,
      data: {
        companyName: values.companyName.trim(),
        address: values.address.trim(),
        officeAddress: values.officeAddress.trim(),
      },
    });
    await invalidateAfter.companyInfoMutation(queryClient, organizationId);
  };

  return (
    <CompanyInfoSettingsTabView
      register={form.register}
      isLoading={isLoading}
      isPending={updateCompanyInfo.isPending}
      isReadOnly={isReadOnly}
      isInitialized={initialized}
      onSubmit={form.handleSubmit(save)}
    />
  );
}
