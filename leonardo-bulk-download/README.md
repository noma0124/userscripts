# Leonardo.ai 本日分 一括ダウンロード

Leonardo.ai の「Today」セクションに表示されている画像だけをまとめてダウンロードするTampermonkeyスクリプトです。

## 特徴
- 「今日」生成した画像だけを対象に一括ダウンロード
- 仮想スクロール対策済み（画面外の画像も取りこぼさず収集）
- 可能な限り高画質URLを優先して取得（失敗時は自動フォールバック）

## インストール方法
1. [Tampermonkey](https://www.tampermonkey.net/) をブラウザに導入
2. このリポジトリの `leonardo_bulk_download.user.js` を開き、Tampermonkeyにインストール
3. Leonardo.aiの生成画面を開くと、右上に「📥 今日の画像を一括DL」ボタンが表示されます

## 使い方
ボタンを押すと画像を自動収集し、件数を確認したうえでダウンロードを開始します。
