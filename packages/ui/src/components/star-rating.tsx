import { Star } from "lucide-react";
import { styled } from "styled-system/jsx";
import * as RatingGroup from "./ui/rating-group";

export interface StarRatingProps {
  value: number;
  onValueChange?: (value: number) => void;
  /** 読み取り専用表示（console の平均点・評価履歴など） */
  readOnly?: boolean;
  /** 0.5 刻みの表示を許可する。平均点の表示に使う */
  allowHalf?: boolean;
  count?: number;
  size?: "sm" | "md" | "lg";
  /** 指定すると form 送信用の hidden input を出す */
  name?: string;
  label?: string;
  ariaLabel?: string;
}

/**
 * 星評価。入力（user の評価フォーム）と読み取り専用表示（console）の両方に使う。
 */
export function StarRating({
  value,
  onValueChange,
  readOnly,
  allowHalf,
  count = 5,
  size = "md",
  name,
  label,
  ariaLabel,
}: StarRatingProps) {
  return (
    <RatingGroup.Root
      allowHalf={allowHalf}
      aria-label={ariaLabel ?? label ?? "評価"}
      count={count}
      name={name}
      onValueChange={(details) => onValueChange?.(details.value)}
      readOnly={readOnly}
      size={size}
      value={value}
    >
      {label && <RatingGroup.Label>{label}</RatingGroup.Label>}
      <RatingGroup.Control>
        <RatingGroup.Context>
          {(api) =>
            api.items.map((index) => (
              <RatingGroup.Item index={index} key={index}>
                <RatingGroup.ItemContext>
                  {(item) => (
                    <StarGlyph
                      half={item.half}
                      highlighted={item.highlighted}
                    />
                  )}
                </RatingGroup.ItemContext>
              </RatingGroup.Item>
            ))
          }
        </RatingGroup.Context>
      </RatingGroup.Control>
      {name && <RatingGroup.HiddenInput />}
    </RatingGroup.Root>
  );
}

function StarGlyph({
  highlighted,
  half,
}: {
  highlighted: boolean;
  half: boolean;
}) {
  if (half) {
    // 枠線の星の上に 50% だけ切り取った塗りの星を重ねる
    return (
      <styled.span display="inline-flex" position="relative">
        <Star fill="none" />
        <styled.span
          display="inline-flex"
          inset="0"
          overflow="hidden"
          position="absolute"
          width="50%"
        >
          <Star fill="currentColor" />
        </styled.span>
      </styled.span>
    );
  }

  return <Star fill={highlighted ? "currentColor" : "none"} />;
}
