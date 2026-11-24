import type { Ingredient } from "./types";

/** 全角半角・カタカナ/ひらがな・空白の違いを吸収 */
export function norm(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・()（）「」]/g, "");
}

/** 手持ち材料1つが、レシピの材料1つに当てはまるか */
export function ingredientMatches(query: string, ing: Ingredient): boolean {
  const q = norm(query);
  if (!q) return false;
  const names = [ing.name, ing.normalized, ...(ing.aliases ?? [])].map(norm).filter(Boolean);
  return names.some((n) => n === q || (q.length >= 2 && n.includes(q)) || (n.length >= 2 && q.includes(n)));
}

/** 手持ち材料でどれだけ揃うか（基本調味料は除いて計算） */
export function coverage(have: string[], ingredients: Ingredient[]) {
  const main = ingredients.filter((i) => !i.pantry);
  const matched = main.filter((i) => have.some((h) => ingredientMatches(h, i)));
  const usedHave = have.filter((h) => ingredients.some((i) => ingredientMatches(h, i)));
  const ratio = main.length ? matched.length / main.length : 0;
  return {
    matched: matched.map((i) => i.name),
    missing: main.filter((i) => !matched.includes(i)).map((i) => i.name),
    usedHaveCount: usedHave.length,
    score: ratio * 0.7 + (have.length ? usedHave.length / have.length : 0) * 0.3,
  };
}

export function splitIngredients(input: string): string[] {
  return input
    .split(/[,、，\s\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
