"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Ingredient, RecipeDraft, VideoInfo } from "@/lib/types";

type ExtractResponse = {
  video: VideoInfo;
  draft: RecipeDraft;
  sources: { description: boolean; comments: number; transcript: boolean };
};

const CONFIDENCE: Record<string, string> = { high: "確度 高", medium: "確度 中", low: "確度 低" };

export default function ImportPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState("");

  async function extract(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const r = data as ExtractResponse;
      setResult(r);
      setTitle(r.draft.title);
      setServings(r.draft.servings);
      setIngredients(r.draft.ingredients);
      setSteps(r.draft.steps.join("\n"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function updateIng(i: number, patch: Partial<Ingredient>) {
    setIngredients((prev) => prev.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  function addIng() {
    setIngredients((prev) => [
      ...prev,
      { name: "", normalized: "", aliases: [], amount: "", grams: null, grams_estimated: false, pantry: false },
    ]);
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    setError("");
    try {
      const cleaned = ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ ...i, normalized: i.normalized || i.name }));
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || result.video.title,
          video_url: result.video.url,
          video_id: result.video.videoId,
          channel_title: result.video.channelTitle || null,
          thumbnail_url: result.video.thumbnailUrl || null,
          servings: servings || null,
          ingredients: cleaned,
          steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
          source_note: result.draft.source_note || null,
          confidence: result.draft.confidence,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/recipes/${data.recipe.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <>
      <h1>動画からレシピを作る</h1>
      <form className="card row" onSubmit={extract}>
        <input
          className="grow"
          type="url"
          inputMode="url"
          placeholder="YouTube の動画URL（Shorts も可）"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>{loading ? "読み取り中…" : "レシピを作る"}</button>
      </form>
      {loading && <p className="muted">概要欄・コメント・字幕を読み取り、Claude がレシピを作っています（30秒ほど）。</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="card">
          {!result.draft.is_recipe && (
            <p className="error">料理動画ではない可能性があります。内容を確認してから保存してください。</p>
          )}
          <div className="video">
            <iframe src={`https://www.youtube.com/embed/${result.video.videoId}`} title={result.video.title} allowFullScreen />
          </div>
          <p className="muted">
            <span className="badge">{CONFIDENCE[result.draft.confidence]}</span>{" "}
            {result.draft.source_note}
            <br />
            読み取り元: 概要欄{result.sources.description ? "あり" : "なし"} ／ コメント{result.sources.comments}件 ／ 字幕
            {result.sources.transcript ? "あり" : "なし"}
          </p>
          {result.draft.missing_info && <p className="error">分からなかった点: {result.draft.missing_info}</p>}

          <h2>料理名</h2>
          <div className="row">
            <input className="grow" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input style={{ maxWidth: 140 }} placeholder="何人分" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>

          <h2>材料</h2>
          <table className="ing-table">
            <thead>
              <tr><th>材料</th><th>分量</th><th>g</th><th /></tr>
            </thead>
            <tbody>
              {ingredients.map((ing, i) => (
                <tr key={i}>
                  <td><input value={ing.name} onChange={(e) => updateIng(i, { name: e.target.value, normalized: "" })} /></td>
                  <td><input value={ing.amount} onChange={(e) => updateIng(i, { amount: e.target.value })} /></td>
                  <td style={{ width: 90 }}>
                    <input
                      inputMode="decimal"
                      value={ing.grams ?? ""}
                      title={ing.grams_estimated ? "推定値" : ""}
                      style={ing.grams_estimated ? { fontStyle: "italic" } : undefined}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        updateIng(i, { grams: Number.isFinite(v) ? v : null, grams_estimated: false });
                      }}
                    />
                  </td>
                  <td style={{ width: 40 }}>
                    <button type="button" className="secondary" aria-label="削除" onClick={() => setIngredients((p) => p.filter((_, j) => j !== i))}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">斜体のグラム数は推定値です。</p>
          <button type="button" className="secondary" onClick={addIng}>材料を追加</button>

          <h2>手順（1行に1ステップ）</h2>
          <textarea rows={8} value={steps} onChange={(e) => setSteps(e.target.value)} />

          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" onClick={save} disabled={saving}>{saving ? "保存中…" : "このレシピを保存"}</button>
          </div>
        </div>
      )}
    </>
  );
}
