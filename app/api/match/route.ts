import { NextResponse } from "next/server";
import { matchRecipes } from "@/lib/claude";
import { listRecipes } from "@/lib/db";
import { coverage, splitIngredients } from "@/lib/normalize";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { ingredients, wish } = (await req.json()) as { ingredients?: string; wish?: string };
    const have = splitIngredients(ingredients ?? "");
    if (!have.length) return NextResponse.json({ error: "材料を1つ以上入力してください" }, { status: 400 });

    const recipes = await listRecipes();
    if (!recipes.length) return NextResponse.json({ error: "保存されたレシピがまだありません" }, { status: 400 });

    // 1段階目: 手持ち材料との一致度で候補を20件に絞る（一致がなくても新しい順で補う）
    const candidates = recipes
      .map((r) => ({ r, s: coverage(have, r.ingredients).score }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 20)
      .map(({ r }) => r);

    // 2段階目: Claude が最終判断
    const result = await matchRecipes(have, candidates, wish?.trim() || undefined);
    const byId = new Map(candidates.map((r) => [r.id, r]));
    return NextResponse.json({
      comment: result.comment,
      picks: result.picks.map((p) => ({ ...p, recipe: byId.get(p.recipe_id)! })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
