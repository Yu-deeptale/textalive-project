# TextAlive React Karaoke App をポートフォリオサイトにデプロイする

## 🌐 推奨デプロイ方法: Netlify

### 1. ビルド設定ファイルの作成

プロジェクトルートに`netlify.toml`を配置します：

```toml
[build]
  base = "my-textalive-react"
  publish = "my-textalive-react/dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. デプロイ手順

#### A. Netlifyでの自動デプロイ（推奨）

1. **GitHubにプッシュ**：
   ```bash
   git add .
   git commit -m "準備完了: ポートフォリオ用デプロイ設定"
   git push origin main
   ```

2. **Netlifyでサイト作成**：
   - [Netlify](https://netlify.com)にログイン
   - "New site from Git" をクリック
   - GitHubリポジトリを選択
   - ビルド設定は自動で読み込まれます

3. **カスタムドメイン設定**（オプション）：
   - Site settings → Domain management
   - カスタムドメインを追加

#### B. 手動デプロイ

1. **ローカルでビルド**：
   ```bash
   cd my-textalive-react
   npm run build
   ```

2. **Netlify Drop**：
   - [Netlify Drop](https://app.netlify.com/drop)にアクセス
   - `dist` フォルダをドラッグ&ドロップ

### 3. 他のデプロイオプション

#### GitHub Pages
```bash
# ビルドとデプロイスクリプト追加
npm install --save-dev gh-pages
```

#### Vercel
```bash
# Vercel CLI使用
npm i -g vercel
vercel --prod
```

### 4. 本番環境での確認事項

- ✅ TextAlive API の動作確認
- ✅ 音楽ファイルの読み込み確認  
- ✅ レスポンシブデザインの動作確認
- ✅ 各ブラウザでの互換性確認

### 5. ポートフォリオサイトへの組み込み

デプロイ後のURLを使用して：

```html
<!-- ポートフォリオサイトに埋め込む場合 -->
<iframe 
  src="https://your-textalive-app.netlify.app" 
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>

<!-- または直接リンク -->
<a href="https://your-textalive-app.netlify.app" target="_blank">
  TextAlive Karaoke App を試す
</a>
```

## 🔗 完成後の利用方法

1. **デモンストレーション**: ポートフォリオ訪問者がすぐに体験可能
2. **技術力のアピール**: React + Web Audio API の実装例として
3. **インタラクティブ要素**: 静的なポートフォリオに動的コンテンツを追加

---

**デプロイ完了後のURL例**: `https://textalive-karaoke-portfolio.netlify.app`