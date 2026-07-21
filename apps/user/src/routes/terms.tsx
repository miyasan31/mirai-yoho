import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
import { styled } from "styled-system/jsx";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

interface TermsSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

const TERMS_SECTIONS: TermsSection[] = [
  {
    title: "第1条（適用）",
    paragraphs: [
      "本規約は、みらい予報（以下「本サービス」といいます）が提供するオンライン相談の予約および利用に関する条件を、本サービスを利用するお客様（以下「利用者」といいます）と本サービス運営者（以下「当社」といいます）との間で定めるものです。",
      "利用者は、本サービスを利用することにより、本規約に同意したものとみなされます。",
    ],
  },
  {
    title: "第2条（予約の成立）",
    paragraphs: [
      "予約は、利用者が本サービス上で必要事項を入力し、所定の決済手続きが完了した時点で成立します。",
      "予約の成立後、当社は利用者が入力したメールアドレス宛に予約確認の通知を送信します。",
    ],
  },
  {
    title: "第3条（料金および支払方法）",
    paragraphs: [
      "利用者は、本サービスの利用にあたり、予約時に表示される料金を、当社が指定する決済方法により支払うものとします。",
      "表示される料金は、特段の記載がない限り消費税を含みます。",
    ],
  },
  {
    title: "第4条（キャンセルおよび変更）",
    paragraphs: [
      "予約のキャンセルは、本サービス上の所定の手続きにより行うものとします。",
      "キャンセルの時期に応じて、当社が別途定めるキャンセル料が発生する場合があります。",
    ],
  },
  {
    title: "第5条（禁止事項）",
    paragraphs: [
      "利用者は、本サービスの利用にあたり、以下の行為を行ってはなりません。",
    ],
    items: [
      "法令または公序良俗に違反する行為",
      "虚偽の情報を登録または入力する行為",
      "占い師その他の第三者に対する誹謗中傷、嫌がらせ、迷惑行為",
      "本サービスの運営を妨害する行為",
      "相談内容の無断での録音、録画、または第三者への公開",
      "その他、当社が不適切と判断する行為",
    ],
  },
  {
    title: "第6条（サービスの提供停止）",
    paragraphs: [
      "当社は、システムの保守、天災、通信障害その他やむを得ない事由がある場合、利用者に事前に通知することなく、本サービスの全部または一部の提供を停止することがあります。",
      "当社は、前項によるサービスの提供停止により利用者に生じた損害について、当社に故意または重大な過失がある場合を除き、責任を負いません。",
    ],
  },
  {
    title: "第7条（免責事項）",
    paragraphs: [
      "本サービスで提供される相談内容は、利用者の意思決定を支援するための参考情報であり、その結果を保証するものではありません。",
      "通信環境の不具合など、利用者側の事情により相談が実施できなかった場合、当社は責任を負いません。",
    ],
  },
  {
    title: "第8条（個人情報の取扱い）",
    paragraphs: [
      "当社は、利用者から取得した個人情報を、予約の管理、相談の実施、連絡、および本サービスの改善の目的にのみ利用し、法令に基づく場合を除き、本人の同意なく第三者に提供しません。",
    ],
  },
  {
    title: "第9条（本規約の変更）",
    paragraphs: [
      "当社は、必要と判断した場合、利用者に通知することなく本規約を変更できるものとします。変更後の規約は、本サービス上に掲示した時点から効力を生じます。",
    ],
  },
  {
    title: "第10条（準拠法および管轄裁判所）",
    paragraphs: [
      "本規約の解釈にあたっては、日本法を準拠法とします。",
      "本サービスに関して紛争が生じた場合、当社所在地を管轄する裁判所を専属的合意管轄裁判所とします。",
    ],
  },
];

function TermsPage() {
  return (
    <styled.div maxW="2xl" mx="auto" px="8" py="12">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="2">
        利用規約
      </Text>
      <Text textStyle="sm" color="fg.muted" mb="8">
        本サービスのご予約・ご利用の前に、以下の利用規約をお読みください。
      </Text>

      <styled.div display="flex" flexDirection="column" gap="8">
        {TERMS_SECTIONS.map((section) => (
          <styled.section key={section.title}>
            <Text as="h2" textStyle="lg" fontWeight="semibold" mb="2">
              {section.title}
            </Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} textStyle="sm" color="fg.muted" mb="2">
                {paragraph}
              </Text>
            ))}
            {section.items && (
              <styled.ul pl="5" listStyleType="disc">
                {section.items.map((item) => (
                  <styled.li key={item} mb="1">
                    <Text as="span" textStyle="sm" color="fg.muted">
                      {item}
                    </Text>
                  </styled.li>
                ))}
              </styled.ul>
            )}
          </styled.section>
        ))}
      </styled.div>
    </styled.div>
  );
}
