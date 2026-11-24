import { NextResponse, type NextRequest } from "next/server";

/** APP_PASSWORD を設定すると、ブラウザのBasic認証で自分だけが使えるようにする */
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();
  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = atob(encoded);
    const pass = decoded.slice(decoded.indexOf(":") + 1);
    if (pass === password) return NextResponse.next();
  }
  return new NextResponse("認証が必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="recipe-app", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|manifest.webmanifest|icon.svg).*)"] };
