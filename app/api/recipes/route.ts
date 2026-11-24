import { NextResponse } from "next/server";
import { insertRecipe, listRecipes } from "@/lib/db";
import { coverage, splitIngredients } from "@/lib/normalize";
import { IngredientSchema } from "@/lib/types";
import { z } from "zod/v4";

const SaveSchema = z.object({
  title: z.string().min(1),
  video_url: z.string().url(),
  video_id: z.string(),
  channel_title: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  servings: z.string().nullable(),
  ingredients: z.array(IngredientSchema),
  steps: z.array(z.string()),
  source_note: z.string().nullable(),
  confidence: z.string().nullable(),
});

/** GET /api/recipes?q=たまねぎ,豚肉  … 材料で絞り込み（q なしは全件） */
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const have = splitIngredients(q);
    const recipes = await listRecipes();
    if (!have.length) return NextResponse.json({ recipes });
    const scored = recipes
      .map((r) => ({ r, c: coverage(have, r.ingredients) }))
      .filter(({ c }) => c.usedHaveCount > 0)
      .sort((a, b) => b.c.usedHaveCount - a.c.usedHaveCount || b.c.score - a.c.score)
      .map(({ r, c }) => ({ ...r, matched: c.matched, missing: c.missing }));
    return NextResponse.json({ recipes: scored });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = SaveSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "入力内容が正しくありません" }, { status: 400 });
    const recipe = await insertRecipe(parsed.data);
    return NextResponse.json({ recipe });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
