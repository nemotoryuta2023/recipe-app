import { YoutubeTranscript } from "youtube-transcript";
import type { VideoInfo } from "./types";

const API = "https://www.googleapis.com/youtube/v3";

/** youtube.com/watch?v=, youtu.be/, /shorts/, /embed/, /live/ から動画IDを取り出す */
export function extractVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  if (host === "youtu.be") return url.pathname.slice(1, 12) || null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v) return v;
    const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
    if (m) return m[2];
  }
  return null;
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY が設定されていません");
  return key;
}

export async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  const params = new URLSearchParams({ part: "snippet", id: videoId, key: apiKey() });
  const res = await fetch(`${API}/videos?${params}`);
  if (!res.ok) throw new Error(`YouTube API エラー (${res.status})`);
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error("動画が見つかりませんでした（非公開・削除済みの可能性）");
  const sn = item.snippet;
  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: sn.title ?? "",
    description: sn.description ?? "",
    channelId: sn.channelId ?? "",
    channelTitle: sn.channelTitle ?? "",
    thumbnailUrl:
      sn.thumbnails?.high?.url ?? sn.thumbnails?.medium?.url ?? sn.thumbnails?.default?.url ?? "",
  };
}

export type CommentText = { text: string; byUploader: boolean; likes: number };

/** 評価順のトップコメント（投稿者本人のコメントと返信を優先） */
export async function fetchTopComments(videoId: string, channelId?: string): Promise<CommentText[]> {
  const params = new URLSearchParams({
    part: "snippet,replies",
    videoId,
    order: "relevance",
    maxResults: "50",
    textFormat: "plainText",
    key: apiKey(),
  });
  const res = await fetch(`${API}/commentThreads?${params}`);
  // コメント無効の動画は 403 になるので空で返す
  if (!res.ok) return [];
  const data = await res.json();
  const out: CommentText[] = [];
  for (const t of data.items ?? []) {
    const top = t.snippet?.topLevelComment?.snippet;
    if (!top) continue;
    const uploaderId = channelId ?? t.snippet?.channelId;
    out.push({
      text: top.textOriginal ?? top.textDisplay ?? "",
      byUploader: top.authorChannelId?.value === uploaderId,
      likes: top.likeCount ?? 0,
    });
    for (const r of t.replies?.comments ?? []) {
      if (r.snippet?.authorChannelId?.value === uploaderId) {
        out.push({ text: r.snippet.textOriginal ?? "", byUploader: true, likes: r.snippet.likeCount ?? 0 });
      }
    }
  }
  return out.sort((a, b) => Number(b.byUploader) - Number(a.byUploader) || b.likes - a.likes);
}

/**
 * 字幕（自動字幕含む）を取得。非公式の方法のため、取れなくても処理は続ける。
 */
export async function fetchTranscript(videoId: string): Promise<string> {
  for (const lang of ["ja", undefined]) {
    try {
      const parts = await YoutubeTranscript.fetchTranscript(videoId, lang ? { lang } : undefined);
      const text = parts.map((p) => p.text).join(" ").replace(/\s+/g, " ").trim();
      if (text) return text;
    } catch {
      // 次の言語を試す
    }
  }
  return "";
}
