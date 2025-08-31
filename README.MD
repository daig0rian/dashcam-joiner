# Dashcam Joiner (Electron + ffmpeg) — 1‑GOP cut, lossless concat
# ドラレコ結合ツール (Electron + ffmpeg) — 1-GOP 単位のカット、ロスレス結合

* Tested with MITSUBA EDR-22G
* Select a folder → auto‑group MP4s by prefix (e.g., `F_20250828184000`) → pick a group → cut 1 GOP from every file except the first → concat with ffmpeg **without re‑encode**.*
* The default setting is 1 GOP = 0.5 seconds, but you can use the Auto-detect button to determine how many seconds constitute 1 GOP.

* MITSUBA  EDR-22Gでテスト済
* フォルダを選択 → MP4ファイルをプレフィックスで自動グループ化 (例: `F_20250828184000`) → グループを選択 → 先頭ファイルを除く全ファイルから1 GOPをカット → ffmpegで**再エンコードなしで**結合*
* 初期設定では 1 GOP = 0.5 秒としていますが、Auto‑detectボタンで1 GOPが何秒であるか判定できます。

---

## 1) Project Layout

```
dashcam-joiner/
  package.json
  main.js
  preload.js
  renderer.html
  renderer.js
  styles.css
```

---

## 2) How it works

1. **Folder choose** → Main lists all `*.mp4` in the directory and groups by the first two tokens split by `_` (e.g., `F_20250828184000`).
2. Choose a **group** → Files are lexicographically sorted (your naming scheme keeps them chronological).
3. Set **GOP seconds** (default 0.500) → The app writes a `concat` list file where **first file is uncut**, and **2nd+ files** get `inpoint {GOP}` lines.
4. ffmpeg runs: `ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp4` → **no re-encode**, fast and lossless.


1. **フォルダ選択** → ディレクトリ内の全 `*.mp4` ファイルを表示し、`_` で区切られた最初の2つのトークン（例: `F_20250828184000`）でグループ分けします。
2. **グループ**を選択 → ファイルは辞書順でソートされます（命名規則により時系列順に保たれます）。
3. **GOP秒数**を設定（デフォルト0.500） → アプリは`concat`リストファイルを作成し、**最初のファイルは未編集のまま**、**2番目以降のファイル**には`inpoint {GOP}`行が追加されます。
4. ffmpeg実行: `ffmpeg -y -f concat -safe 0 -i list.txt -c copy output.mp4` → **再エンコード不要**、高速かつロスレス。

---

## 3) Install & Run

You can download the installer for windows from the release page.
リリースページからWindows用インストーラーがダウンロードできます。
https://github.com/daig0rian/dashcam-joiner/releases

To run from source code, execute the following on a PC with Node.js installed:
ソースコードから動かす場合はnode.js をインストールしたPCで以下を実行:

```bash
npm install
npm run start
```

---

## 4) Known limitations

* `concat` demuxer の `inpoint` は **GOP 境界（キーフレーム）で最も安定**します。MITSUBA EDRでは 各ファイル先頭 = I フレームなおで問題ありません。

---
