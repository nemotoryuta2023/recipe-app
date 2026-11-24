"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Recipe } from "@/lib/types";

type Row = Recipe & { matched?: string[]; missing?: string[] };

export default function RecipesPage() {
  const [q, setQ] = useState("");
  const [recipes, setRecipes] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  async function load(query: string) {
    setError("");
    try {
      const res = await fetch(`/api/recipes?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecipes(data.recipes);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load("");
  }, []);

  return (
    <>
      <h1>保存したレシピ</h1>
      <form
        className="card row"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <input className="grow" placeholder="材料で検索（例: 玉ねぎ 豚肉）" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit">検索</button>
      </form>
      {error && <p className="error">{error}</p>}
      {recipes === null && !error && <p className="muted">読み込み中…</p>}
      {recipes?.length === 0 && <p className="muted">該当するレシピがありません。</p>}
      {recipes?.map((r) => (
        <div className="card" key={r.id}>
          <Link href={`/recipes/${r.id}`} className="recipe-item">
            {r.thumbnail_url && <img src={r.thumbnail_url} alt="" />}
            <div>
              <div className="title">{r.title}</div>
              <div className="muted">{r.channel_title}</div>
            </div>
          </Link>
          {r.matched && (
            <div style={{ marginTop: 8 }}>
              {r.matched.map((m) => <span key={m} className="tag ok">{m}</span>)}
              {r.missing?.map((m) => <span key={m} className="tag missing">{m}</span>)}
            </div>
          )}
          <div className="muted" style={{ marginTop: 4 }}>
            <a href={r.video_url} target="_blank" rel="noreferrer">動画を見る</a>
          </div>
        </div>
      ))}
    </>
  );
}
