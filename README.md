# TextAlive React Karaoke App

TextAlive APIを使用したリアルタイム音程可視化機能付きカラオケアプリケーション

## 🎵 概要

このプロジェクトは、TextAlive App APIとReactを使用して構築されたカラオケアプリケーションです。楽曲の再生と同期して歌詞を表示し、リアルタイムで音程を可視化する機能を備えています。

## ✨ 主な機能

- **リアルタイム歌詞表示**: 楽曲に同期して歌詞を1文字ずつハイライト表示
- **音程可視化**: 各文字に対応する音程を赤色のバーで視覚的に表示
- **インタラクティブなシークバー**: ドラッグ操作で楽曲の任意の位置にジャンプ
- **フレーズナビゲーション**: 右側パネルで全歌詞の一覧表示と現在位置の確認
- **音階表示**: 現在の音程を音階名（C4、D#5など）で表示
- **楽曲情報表示**: タイトルとアーティスト名の表示
- **レスポンシブデザイン**: PC・タブレット・スマートフォンに対応

## 🎯 音程可視化の特徴

- **広範囲対応**: 70Hz〜700Hzの範囲（約3オクターブ）をカバー
- **視覚的フィードバック**: 各文字の下に音程の高さに比例したバーを表示
- **色による識別**: 赤系統のグラデーションで音程バーを表現
- **リアルタイム更新**: 楽曲再生と完全同期した音程表示

## 🚀 技術スタック

- **React**: 19.1.0
- **Vite**: 7.0.0（ビルドツール）
- **TextAlive App API**: 0.4.0（音楽同期・歌詞・音程データ）
- **CSS3**: モダンなスタイリングとアニメーション

## 📁 プロジェクト構成

```
my-textalive-react/
├── src/
│   ├── App.jsx          # メインアプリケーションコンポーネント
│   ├── App.css          # スタイルシート
│   ├── main.jsx         # Reactエントリーポイント
│   └── assets/
│       ├── 10sBack.PNG  # 10秒戻るボタンアイコン
│       └── 10sSkip.PNG  # 10秒進むボタンアイコン
├── public/
├── package.json
└── README.md
```

## 🛠️ セットアップ

### 前提条件

- Node.js (v16以上)
- npm または yarn

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/Yu-deeptale/textalive-project.git
cd textalive-project/my-textalive-react
```

2. 依存関係をインストール
```bash
npm install
```

3. 開発サーバーを起動
```bash
npm run dev
```

4. ブラウザで `http://localhost:5173` を開く

## 📋 利用可能なスクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - プロダクション用にビルド
- `npm run preview` - ビルド結果をプレビュー
- `npm run lint` - ESLintでコードをチェック

## 🎮 使用方法

1. **楽曲再生**: 中央の再生ボタンで楽曲を開始/停止
2. **シーク操作**: シークバーをドラッグして好きな位置にジャンプ
3. **10秒スキップ**: ⏪/⏩ボタンで10秒戻る/進む
4. **フレーズ選択**: 右パネルの歌詞をクリックしてその位置にジャンプ
5. **音程確認**: 歌詞の下の赤いバーで音程の高さを視覚的に確認

## 🎨 UI構成

- **左上**: 楽曲タイトル・アーティスト名
- **中央**: 歌詞表示エリア（音程バー付き）
- **右下**: 現在の音階表示
- **下部**: 再生コントロール・シークバー・時間表示
- **右パネル**: フレーズナビゲーション

## 🎵 対応楽曲

現在は以下の楽曲に対応しています：
- **楽曲**: ピアプロより取得
- **URL**: https://piapro.jp/t/FDb1/20210213190029

## 🔧 カスタマイズ

### 楽曲の変更

`App.jsx`の`onAppReady`内の`createFromSongUrl`を変更：

```javascript
player.createFromSongUrl("新しい楽曲のURL", {
  video: {
    beatId: ビートID,
    repetitiveSegmentId: セグメントID,
    lyricId: 歌詞ID,
    lyricDiffId: 歌詞差分ID,
  },
});
```

### 音程表示範囲の調整

`normalizePitch`関数内の`minHz`と`maxHz`を変更：

```javascript
const minHz = 70;   // 最低周波数
const maxHz = 700;  // 最高周波数
```

### 色テーマの変更

`App.css`のカラー変数を変更して、音程バーや全体の色合いをカスタマイズできます。

## 📱 レスポンシブ対応

- **デスクトップ**: フル機能表示
- **タブレット**: 最適化されたレイアウト
- **スマートフォン**: 縦向きレイアウト・タッチ操作対応

## 🐛 トラブルシューティング

### よくある問題

1. **音程データが表示されない**
   - ブラウザのコンソールで音程データの取得状況を確認
   - TextAlive APIトークンが正しく設定されているか確認

2. **楽曲が再生されない**
   - インターネット接続を確認
   - ブラウザで音声の自動再生が許可されているか確認

3. **レイアウトが崩れる**
   - ブラウザのズーム設定を100%に設定
   - CSSが正しく読み込まれているか確認

## 🔗 関連リンク

- [TextAlive App API Documentation](https://developer.textalive.jp/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 👥 コントリビューション

プルリクエストやイシューの報告を歓迎します。改善提案がある場合は、お気軽にお知らせください。

---

**作成者**: Yu-deeptale  
**プロジェクト**: TextAlive React Karaoke App  
**ブランチ**: toneVision
