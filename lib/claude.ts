import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  MatchResultSchema,
  RecipeDraftSchema,
  type MatchResult,
  type Recipe,
  type RecipeDraft,
  type VideoInfo,
} from "./types";
import type { CommentText } from "./youtube";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

const EXTRACT_SYSTEM = `あなたは料理動画からレシピを書き起こすアシスタントです。
与えられた「動画タイトル・概要欄・コメント・字幕」だけを根拠に、料理名とレシピを日本語で作ります。

ルール:
- 概要欄や投稿者コメントに材料・分量があれば最優先で使う。視聴者コメントは補助情報として扱う。
- 分量が書かれていない材料は、料理として一般的な量を推定し grams_estimated を true にする。
- 「大さじ1」「1/2個」などは一般的な換算でグラムにする（例: 醤油大さじ1≒18g、砂糖大さじ1≒9g、玉ねぎ1個≒200g）。換算できないもの（少々・適量）は grams を null にする。
- 手順は原文をそのまま写さず、自分の言葉で簡潔にまとめる。
- 根拠が乏しい部分は missing_info に正直に書き、confidence を下げる。でっち上げない。
- 料理動画でなければ is_recipe を false にし、他の項目は空でよい。`;

export async function generateRecipe(
  video: VideoInfo,
  comments: CommentText[],
  transcript: string,
): Promise<RecipeDraft> {
  const commentBlock = comments
    .slice(0, 50)
    .map((c) => `${c.byUploader ? "[投稿者]" : "[視聴者]"} ${c.text.slice(0, 600)}`)
    .join("\n");

  const userContent = `## 動画タイトル
${video.title}

## チャンネル
${video.channelTitle}

## 概要欄
${video.description || "（なし）"}

## コメント（評価順）
${commentBlock || "（取得できず）"}

## 字幕
${transcript ? transcript.slice(0, 30000) : "（取得できず）"}`;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(RecipeDraftSchema) },
    system: EXTRACT_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  });

  if (response.stop_reason === "refusal") throw new Error("Claude がこの内容の処理を断りました");
  if (!response.parsed_output) throw new Error("レシピの生成結果を読み取れませんでした");
  return response.parsed_output;
}

const MATCH_SYSTEM = `あなたは家庭料理のアドバイザーです。
ユーザーの手持ち材料と、保存済みレシピの候補一覧から、今作るのに一番合うレシピを最大3件選びます。

ルール:
- 手持ち材料で多く作れるもの、足りない材料が少ないものを優先する。
- 塩・こしょう・砂糖・醤油・油などの基本調味料は家にある前提で、missing に入れない。
- 足りない材料に手持ちで代用できるものがあれば substitutions に書く。
- recipe_id は必ず候補一覧にある id をそのまま使う。
- 合う候補がなければ picks を空にし、comment でその旨を伝える。`;

export async function matchRecipes(have: string[], candidates: Recipe[], wish?: string): Promise<MatchResult> {
  const list = candidates.map((r) => ({
    id: r.id,
    title: r.title,
    ingredients: r.ingredients.map((i) => `${i.name}${i.amount ? ` ${i.amount}` : ""}${i.pantry ? "(調味料)" : ""}`),
  }));

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: zodOutputFormat(MatchResultSchema) },
    system: MATCH_SYSTEM,
    messages: [
      {
        role: "user",
        content: `## 手持ちの材料\n${have.join("、")}\n\n${wish ? `## 希望\n${wish}\n\n` : ""}## 候補レシピ(JSON)\n${JSON.stringify(list)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Claude がこの内容の処理を断りました");
  if (!response.parsed_output) throw new Error("マッチング結果を読み取れませんでした");
  const ids = new Set(candidates.map((c) => c.id));
  return { ...response.parsed_output, picks: response.parsed_output.picks.filter((p) => ids.has(p.recipe_id)) };
}
