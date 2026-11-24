import { NextResponse } from "next/server";
import { generateRecipe } from "@/lib/claude";
import { extractVideoId, fetchTopComments, fetchTranscript, fetchVideoInfo } from "@/lib/youtube";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    const videoId = url ? extractVideoId(url) : null;
    if (!videoId) {
      return NextResponse.json({ error: "YouTube の動画URLを入力してください" }, { status: 400 });
    }
    const video = await fetchVideoInfo(videoId);
    const [comments, transcript] = await Promise.all([
      fetchTopComments(videoId, video.channelId),
      fetchTranscript(videoId),
    ]);
    const draft = await generateRecipe(video, comments, transcript);
    return NextResponse.json({
      video,
      draft,
      sources: { description: video.description.length > 0, comments: comments.length, transcript: transcript.length > 0 },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
