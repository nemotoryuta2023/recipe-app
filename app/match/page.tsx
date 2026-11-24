"use client";

import Link from "next/link";
import { useState } from "react";
import type { Recipe } from "@/lib/types";

type Pick = { recipe_id: string; reason: string; missing: string[]; substitutions: string[]; recipe: Recipe };

export default function MatchPage() {
  const [ingredients, setIngredients] = useState("");
  const [wish, setWish] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ comment: string; picks: Pick[] } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, wish }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>今ある材料でおすすめ</h1>
      <form className="card" onSubmit={submit}>
        <label className="muted">手持ちの材料（スペースや読点で区切る）</label>
        <textarea
          rows={3}
          placeholder="例: 玉ねぎ、豚こま、卵、キャベツ"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          required
        />
        <label className="muted">希望（任意）</label>
        <input placeholder="例: 15分以内、あっさり系" value={wish} onChange={(e) => setWish(e.target.value)} />
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={loading}>{loading ? "考え中…" : "Claude に選んでもらう"}</button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}
      {result && (
        <>
          {result.comment && <p>{result.comment}</p>}
          {result.picks.map((p, n) => (
            <div className="card" key={p.recipe_id}>
              <Link href={`/recipes/${p.recipe.id}`} className="recipe-item">
                {p.recipe.thumbnail_url && <img src={p.recipe.thumbnail_url} alt="" />}
                <div>
                  <span className="badge">{n + 1}位</span>
                  <div className="title">{p.recipe.title}</div>
                </div>
              </Link>
              <p>{p.reason}</p>
              {p.missing.length > 0 && (
                <div>足りない材料: {p.missing.map((m) => <span key={m} className="tag missing">{m}</span>)}</div>
              )}
              {p.substitutions.length > 0 && <p className="muted">代用案: {p.substitutions.join(" ／ ")}</p>}
              <a href={p.recipe.video_url} target="_blank" rel="noreferrer">動画を見る</a>
            </div>
          ))}
        </>
      )}
    </>
  );
}
