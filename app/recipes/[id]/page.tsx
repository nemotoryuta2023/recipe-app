import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/db";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRecipe(id);
  if (!r) notFound();

  return (
    <>
      <h1>{r.title}</h1>
      <div className="video">
        <iframe src={`https://www.youtube.com/embed/${r.video_id}`} title={r.title} allowFullScreen />
      </div>
      <p className="muted">
        出典: <a href={r.video_url} target="_blank" rel="noreferrer">{r.channel_title || "YouTube"}</a>
        {r.source_note && <><br />{r.source_note}</>}
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>材料{r.servings && <span className="muted">（{r.servings}）</span>}</h2>
        <table className="ing-table">
          <tbody>
            {r.ingredients.map((i, n) => (
              <tr key={n}>
                <td>{i.name}</td>
                <td>{i.amount}</td>
                <td className="muted" style={{ textAlign: "right" }}>
                  {i.grams != null && `${i.grams_estimated ? "約" : ""}${i.grams}g`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>作り方</h2>
        <ol className="steps">
          {r.steps.map((s, n) => <li key={n}>{s}</li>)}
        </ol>
      </div>

      <DeleteButton id={r.id} />
    </>
  );
}
