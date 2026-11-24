import { z } from "zod/v4";

export const IngredientSchema = z.object({
  name: z.string().describe("動画で使われている材料名（例: 玉ねぎ）"),
  normalized: z
    .string()
    .describe("検索用の代表名。ひらがな中心の一般名（例: たまねぎ、ぶたばらにく、しょうゆ）"),
  aliases: z
    .array(z.string())
    .describe("表記ゆれ・別名（漢字/カタカナ/ひらがな/英語など。例: 玉ねぎ, 玉葱, タマネギ, オニオン）"),
  amount: z.string().describe("動画や概要欄にある元の分量表記（例: 大さじ1、1/2個）。不明なら空文字"),
  grams: z.number().nullable().describe("グラム換算。換算できなければ null"),
  grams_estimated: z.boolean().describe("grams が推定値なら true、元から g 表記なら false"),
  pantry: z.boolean().describe("塩・こしょう・砂糖・醤油・油・水などの基本調味料なら true"),
});

export const RecipeDraftSchema = z.object({
  is_recipe: z.boolean().describe("料理レシピの動画と判断できれば true"),
  title: z.string().describe("料理名（推測を含む）"),
  servings: z.string().describe("何人分か（例: 2人分）。不明なら空文字"),
  ingredients: z.array(IngredientSchema),
  steps: z.array(z.string()).describe("手順。自分の言葉で簡潔に要約する"),
  source_note: z
    .string()
    .describe("どこから情報を得たか（例: 概要欄に材料と分量あり、手順は字幕から推測）"),
  confidence: z.enum(["high", "medium", "low"]).describe("内容の確からしさ"),
  missing_info: z.string().describe("分からなかったこと。なければ空文字"),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type RecipeDraft = z.infer<typeof RecipeDraftSchema>;

export type VideoInfo = {
  videoId: string;
  url: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export type Recipe = {
  id: string;
  title: string;
  video_url: string;
  video_id: string;
  channel_title: string | null;
  thumbnail_url: string | null;
  servings: string | null;
  ingredients: Ingredient[];
  steps: string[];
  source_note: string | null;
  confidence: string | null;
  created_at: string;
};

export const MatchResultSchema = z.object({
  picks: z
    .array(
      z.object({
        recipe_id: z.string(),
        reason: z.string().describe("このレシピを選んだ理由（1〜2文）"),
        missing: z.array(z.string()).describe("手持ちにない材料（基本調味料は除く）"),
        substitutions: z.array(z.string()).describe("代用案（例: 豚バラ→豚こま）"),
      }),
    )
    .describe("おすすめ順に最大3件"),
  comment: z.string().describe("全体へのひとこと。候補が合わない場合はその旨"),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;
