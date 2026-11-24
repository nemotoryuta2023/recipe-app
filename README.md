# 動画レシピ帳

料理動画（YouTube）のURLを貼ると、概要欄・コメント・字幕から Claude が料理名とレシピ（材料・グラム数・手順）を作り、保存したレシピを手持ちの材料で探せる Web アプリです。スマホではホーム画面に追加するとアプリのように使えます（PWA）。

## できること

- **取り込み**（`/`）: URL を貼ると料理名・材料（元の分量表記とグラム換算）・手順を生成。確認・手直ししてから保存
- **レシピ一覧と材料検索**（`/recipes`）: 「玉ねぎ 豚肉」のように入れると、その材料を使うレシピと足りない材料を表示
- **おすすめ**（`/match`）: 手持ちの材料（と希望）を入れると、Claude が保存済みレシピからベスト3を理由・足りない材料・代用案つきで提案

## セットアップ

1. 依存関係をインストール
   ```bash
   npm install
   ```
2. Supabase でプロジェクトを作り、SQL Editor で `supabase/schema.sql` を実行
3. `.env.example` を `.env.local` にコピーして各キーを設定
   - `ANTHROPIC_API_KEY`: Anthropic Console で発行
   - `YOUTUBE_API_KEY`: Google Cloud Console で「YouTube Data API v3」を有効にして API キーを発行
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: Supabase の Project Settings > API
   - `APP_PASSWORD`: 自分だけが使うためのパスワード（ブラウザの Basic 認証、ユーザー名は何でも可）
4. 起動
   ```bash
   npm run dev
   ```
   http://localhost:3000 を開く

## Vercel への公開

リポジトリを Vercel にインポートし、上の環境変数を Vercel の Environment Variables に設定するだけで動きます。公開する場合は必ず `APP_PASSWORD` を設定してください（未設定だと誰でも API を使えて料金が発生します）。

## 仕組み

1. URL から動画ID を取り出す（watch / youtu.be / Shorts / embed / live に対応）
2. YouTube Data API で タイトル・概要欄・評価順コメント50件 を取得（投稿者のコメントを優先）
3. 字幕（自動字幕を含む）を取得できれば追加
4. Claude に渡し、構造化出力（JSON）で料理名・材料・手順・確度・情報源を受け取る
5. 材料には検索用の代表名と表記ゆれ（玉ねぎ／玉葱／タマネギ…）も一緒に保存し、検索で使う
6. おすすめは、まず材料の一致度で候補を20件に絞ってから Claude が最終判断する

## 注意点

- 字幕の取得は非公式の方法（`youtube-transcript`）のため、YouTube 側の変更で取れなくなることがあります。取れなくても概要欄とコメントだけで処理は続きます。
- 材料を画面のテロップだけで出している動画は、概要欄・字幕・コメントに情報がないと正確なレシピは作れません。確度「低」の場合は手で直してから保存してください。
- コメントや字幕の本文は保存せず、生成したレシピと動画URLだけを保存します。
- 自分用の利用を前提にしています。一般公開する場合は YouTube API の利用規約と著作権を改めて確認してください。
- 使用モデルは `CLAUDE_MODEL` で変更できます（既定は `claude-opus-5-5`）。
