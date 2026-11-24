"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/recipes");
  }

  return confirming ? (
    <div className="row">
      <button type="button" onClick={remove}>本当に削除する</button>
      <button type="button" className="secondary" onClick={() => setConfirming(false)}>やめる</button>
    </div>
  ) : (
    <button type="button" className="secondary" onClick={() => setConfirming(true)}>このレシピを削除</button>
  );
}
