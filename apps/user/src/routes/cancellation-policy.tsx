import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
import { styled } from "styled-system/jsx";

export const Route = createFileRoute("/cancellation-policy")({
  component: CancellationPolicyPage,
});

interface PolicySubsection {
  title?: string;
  paragraphs?: string[];
  items?: Array<{ label: string; description?: string }>;
}

interface PolicySection {
  title: string;
  lead?: string;
  paragraphs?: string[];
  subsections?: PolicySubsection[];
}

const POLICY_SECTIONS: PolicySection[] = [
  {
    title: "1. 目的",
    paragraphs: [
      "本キャンセルポリシーは、本サービスにおける予約のキャンセル、変更、遅刻、欠席及び返金等の取扱いを定め、利用者及び占い師双方の公平性の確保並びに円滑なサービス運営を目的とするものです。",
    ],
  },
  {
    title: "2. 対象",
    subsections: [
      {
        paragraphs: [
          "本キャンセルポリシーは、本サービスを通じて予約されたすべての鑑定サービスに適用されます。",
          "利用者及び占い師は、鑑定サービスの利用又は提供にあたり、本キャンセルポリシーに従うものとします。",
          "本キャンセルポリシーに定めのない事項については、「あなたのみらい予報利用規約」その他当法人が定める個別規定等によるものとします。",
        ],
      },
    ],
  },
  {
    title: "3. 利用者都合によるキャンセル",
    subsections: [
      {
        paragraphs: [
          "利用者は、鑑定開始時刻前までに当法人所定の方法により予約をキャンセルすることができます。",
          "利用者都合によるキャンセルの場合、利用料金の支払いは次のとおりとします。",
        ],
        items: [
          {
            label: "鑑定開始日の前日までのキャンセル",
            description: "利用料金の支払いなし",
          },
          {
            label: "鑑定開始日当日のキャンセル",
            description: "利用料金の全額支払い",
          },
          {
            label:
              "無断欠席又は鑑定開始時刻から終了予定時間まで参加が確認できない場合",
            description: "利用料金の全額支払い",
          },
        ],
      },
      {
        paragraphs: [
          "利用者は、キャンセルに伴い発生する通信費その他の費用を自己の負担とするものとします。",
        ],
      },
    ],
  },
  {
    title: "4. 利用者の遅刻・欠席",
    paragraphs: [
      "利用者の遅刻、欠席及び無断欠席の取扱いについては、「あなたのみらい予報利用規約」第12条（遅刻・欠席）の定めによるものとします。",
    ],
  },
  {
    title: "5. 占い師都合によるキャンセル",
    subsections: [
      {
        title: "(1) 鑑定開始前のキャンセル",
        items: [
          {
            label:
              "占い師の都合により鑑定サービスを実施できない場合、利用者に対し利用料金の全額を返金するものとします。",
          },
          {
            label:
              "当法人は、利用者及び占い師と協議のうえ、別の日程への変更その他代替措置を提案することができます。",
          },
        ],
      },
      {
        title: "(2) 鑑定開始後の中断",
        items: [
          {
            label:
              "占い師の都合により鑑定サービスが途中で中断し、その後の継続が困難となった場合、当法人は中断時点までの鑑定実施状況を考慮し、全部又は一部の返金を行うことができます。",
          },
          {
            label:
              "前号の場合、当法人は、再実施その他適当と認める代替措置を講じることができます。",
          },
        ],
      },
      {
        title: "(3) 占い師の遅刻",
        items: [
          {
            label:
              "占い師が鑑定開始時刻に遅れた場合であっても、利用者が希望し、かつ後続の予約等に支障がない場合は、遅刻した時間を補うよう鑑定時間を延長するよう努めるものとします。",
          },
          {
            label:
              "前号による対応が困難な場合、当法人は利用者及び占い師と協議のうえ、再実施、一部返金その他適切な措置を講じることができます。",
          },
        ],
      },
      {
        title: "(4) 特別な事情がある場合",
        paragraphs: [
          "占い師の急病、事故その他やむを得ない事情により鑑定サービスを実施できない場合、当法人は個別の事情を考慮し、返金、再実施その他適切な措置を決定するものとします。",
        ],
      },
    ],
  },
  {
    title: "6. 通信障害",
    subsections: [
      {
        title: "(1) 利用者側の通信障害",
        items: [
          {
            label:
              "利用者の通信環境、通信回線、利用機器その他利用者の責めに帰すべき事由により鑑定サービスを利用できなかった場合、原則として返金は行いません。",
          },
          {
            label:
              "利用者側の通信障害により鑑定サービスが中断した場合であっても、占い師が待機又は鑑定を実施していた時間については、鑑定が実施されたものとして取り扱うことがあります。",
          },
        ],
      },
      {
        title: "(2) 占い師側の通信障害",
        items: [
          {
            label:
              "占い師の通信環境、通信回線、利用機器その他占い師の責めに帰すべき事由により鑑定サービスを正常に実施できなかった場合、当法人は全部又は一部の返金を行い、又は再実施その他の代替措置を講じることがあります。",
          },
          {
            label:
              "当法人は、鑑定の実施状況、中断時間その他の事情を考慮し、返金額その他の対応を決定するものとします。",
          },
        ],
      },
      {
        title: "(3) 第三者要因による通信障害",
        paragraphs: [
          "インターネット回線障害、オンライン会議システムの障害、停電、通信事業者の障害その他利用者及び占い師のいずれの責めにも帰することができない事由により鑑定サービスを実施できなかった場合、当法人は個別の事情を考慮し、返金、再実施その他適切な措置を講じるものとします。",
        ],
      },
      {
        title: "(4) 当法人による判断",
        paragraphs: [
          "通信障害が発生した場合の返金、再実施その他の対応については、本キャンセルポリシー及び利用規約に基づき、当法人が総合的に判断するものとします。",
        ],
      },
    ],
  },
  {
    title: "7. 返金方法",
    subsections: [
      {
        title: "(1) 返金の方法",
        items: [
          {
            label:
              "当法人が返金を行う場合、原則として利用者が利用した決済手段と同一の方法により返金を行います。",
          },
          {
            label:
              "前号による返金ができない場合又は当法人が必要と認める場合は、利用者が指定する口座への振込その他当法人が適当と認める方法により返金を行うことができます。",
          },
        ],
      },
      {
        title: "(2) 返金時期",
        items: [
          {
            label:
              "返金手続は、当法人による返金決定後、合理的な期間内に行うものとします。",
          },
          {
            label:
              "クレジットカード会社、決済事業者、金融機関その他第三者の処理状況により、利用者への返金反映までに時間を要する場合があります。",
          },
        ],
      },
      {
        title: "(3) 振込手数料等",
        items: [
          {
            label:
              "利用者都合によるキャンセルに伴う返金について、振込手数料その他返金に要する費用が発生する場合は、利用者の負担とすることがあります。",
          },
          {
            label:
              "当法人又は占い師の責めに帰すべき事由による返金については、返金に要する費用は当法人が負担するものとします。",
          },
        ],
      },
    ],
  },
  {
    title: "8. 返金できない場合",
    subsections: [
      {
        title: "(1) 利用者都合による返金対象外",
        items: [
          { label: "利用者が無断欠席した場合" },
          {
            label:
              "利用者の責めに帰すべき事由により鑑定サービスを利用できなかった場合",
          },
          { label: "利用者の遅刻により鑑定時間が短縮された場合" },
          { label: "利用者が鑑定開始後に自己都合で途中退出した場合" },
        ],
      },
      {
        title: "(2) 通信障害等による返金対象外",
        items: [
          {
            label:
              "利用者の通信環境、通信回線又は利用機器の不具合により鑑定サービスを利用できなかった場合",
          },
          {
            label:
              "利用者が当法人又は占い師から案内された接続方法その他必要な手続を行わなかった場合",
          },
        ],
      },
      {
        title: "(3) 規約違反等による返金対象外",
        items: [
          {
            label:
              "利用者が利用規約、キャンセルポリシーその他当法人が定める規定に違反したことにより、鑑定の中止、利用停止その他の措置を受けた場合",
          },
          {
            label:
              "利用者による迷惑行為、ハラスメントその他不適切な行為により鑑定サービスが終了した場合",
          },
        ],
      },
      {
        title: "(4) その他",
        paragraphs: [
          "前各号のほか、利用規約、本キャンセルポリシーその他当法人が定める規定において返金対象外と定められている場合は、返金を行いません。",
        ],
      },
    ],
  },
  {
    title: "9. 特別対応",
    subsections: [
      {
        title: "(1) 不可抗力による対応",
        paragraphs: [
          "地震、台風、豪雨、洪水、火災、停電、感染症の流行その他の不可抗力により鑑定サービスの実施が困難となった場合、当法人は利用者及び占い師の状況を考慮し、返金、日程変更、再実施その他適切な措置を講じることができるものとします。",
        ],
      },
      {
        title: "(2) システム障害等による対応",
        paragraphs: [
          "本サービス又はオンライン会議システムの障害その他当法人の管理するシステム上の不具合により鑑定サービスの実施が困難となった場合、当法人は返金、再実施その他適切な措置を講じるものとします。",
        ],
      },
      {
        title: "(3) 緊急事態への対応",
        paragraphs: [
          "利用者又は占い師の急病、事故その他やむを得ない事情により鑑定サービスを実施できない場合、当法人は個別の事情を考慮し、返金、日程変更、再実施その他適切な措置を講じることができるものとします。",
        ],
      },
      {
        title: "(4) 当法人による判断",
        paragraphs: [
          "前各号に定める場合のほか、当法人が、利用者及び占い師双方の事情その他の合理的な事情を考慮し、通常のキャンセルポリシーを適用することが適当でないと判断した場合は、返金、日程変更、再実施その他適切な措置を講じることができるものとします。",
        ],
      },
    ],
  },
  {
    title: "10. ポリシーの変更",
    subsections: [
      {
        paragraphs: [
          "当法人は、法令の改正、本サービスの内容変更、運営上の必要その他合理的な理由がある場合、本キャンセルポリシーを変更することができます。",
          "当法人は、変更後の内容及び適用開始日を本サービス上その他適切な方法により周知します。",
          "本キャンセルポリシーに定めのない事項については、「あなたのみらい予報利用規約」その他当法人が定める規定によるものとします。",
        ],
      },
    ],
  },
];

function CancellationPolicyPage() {
  return (
    <styled.div maxW="2xl" mx="auto" px="8" py="12">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="2">
        あなたのみらい予報 キャンセルポリシー
      </Text>
      <Text textStyle="sm" color="fg.muted" mb="8">
        ご予約のキャンセル・変更・返金等の取扱いについては、以下のポリシーをご確認ください。
      </Text>

      <styled.div display="flex" flexDirection="column" gap="8">
        {POLICY_SECTIONS.map((section) => (
          <styled.section key={section.title}>
            <Text as="h2" textStyle="lg" fontWeight="semibold" mb="3">
              {section.title}
            </Text>
            {section.lead && (
              <Text textStyle="sm" color="fg.muted" mb="2">
                {section.lead}
              </Text>
            )}
            {section.paragraphs?.map((paragraph) => (
              <Text key={paragraph} textStyle="sm" color="fg.muted" mb="2">
                {paragraph}
              </Text>
            ))}

            {section.subsections?.map((sub) => (
              <styled.div
                key={sub.title ?? sub.paragraphs?.[0] ?? sub.items?.[0]?.label}
                mt="3"
                display="flex"
                flexDirection="column"
                gap="2"
              >
                {sub.title && (
                  <Text textStyle="sm" fontWeight="semibold">
                    {sub.title}
                  </Text>
                )}
                {sub.paragraphs?.map((paragraph) => (
                  <Text key={paragraph} textStyle="sm" color="fg.muted">
                    {paragraph}
                  </Text>
                ))}
                {sub.items && (
                  <styled.ol pl="5" listStyleType="decimal">
                    {sub.items.map((item) => (
                      <styled.li key={item.label} mb="1">
                        <Text as="span" textStyle="sm" color="fg.muted">
                          {item.label}
                        </Text>
                        {item.description && (
                          <Text
                            as="span"
                            textStyle="sm"
                            color="fg.muted"
                            display="block"
                            pl="4"
                          >
                            {item.description}
                          </Text>
                        )}
                      </styled.li>
                    ))}
                  </styled.ol>
                )}
              </styled.div>
            ))}
          </styled.section>
        ))}

        <styled.section>
          <Text textStyle="sm" color="fg.muted">
            本キャンセルポリシーは、2026年8月1日から適用します。
          </Text>
          <Text textStyle="sm" color="fg.muted">
            制定日：2026年8月1日
          </Text>
          <Text textStyle="sm" color="fg.muted">
            一般社団法人JKK
          </Text>
        </styled.section>
      </styled.div>
    </styled.div>
  );
}
