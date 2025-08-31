# Dashcam Joiner (Electron + ffmpeg) — 1‑GOP cut, lossless concat

*Select a folder → auto‑group MP4s by prefix (e.g., `F_20250828184000`) → pick a group → cut 1 GOP from every file except the first → concat with ffmpeg **without re‑encode**.*

> 初期設定では 1 GOP = 0.5 秒。必要なら UI から変更できます。

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

> 要求：ファイル先頭が **I フレーム**であること（今回のドラレコは OK）。

---

## 3) Install & Run

```bash
npm install
npm run start
```

> Windows で SmartScreen が警告する場合、`electron-packager` の `pack` スクリプトでローカル配布用EXEを生成できます（コード署名は省略）。

---

## 4) Tweaks / Options

* **Grouping rule** を変えたい場合は `main.js:listMp4Groups()` のキー生成ロジックを書き換え。
* **GOP 秒数の自動推定**：

  * ffprobe を呼んで `avg_frame_rate` を取得し、I/P パターンから GOP フレーム数（例: 14）をかけて `gopSec = GOP / fps` を計算する実装も可能です（必要なら追記します）。
* **Progress**：stderr の進捗ログをパースしてプログレスバー表示も可能です。
* **Cross‑platform**：ffmpeg-static は macOS/Linux でも動作。UI はそのまま動きます。

---

## 5) Known limitations

* `concat` demuxer の `inpoint` は **GOP 境界（キーフレーム）で最も安定**します。今回の前提（各ファイル先頭 = I フレーム）では問題ありません。
* 一部機種で音声トラックが変動する場合は `-c copy` が失敗することがあります。その際は再エンコードモードを別途実装してください（ご希望なら追加します）。

---

## 6) Quick test without Electron

スクリプト無しで ffmpeg の動作を確認するには、手動で `list.txt` を作成：

```
file 'A.mp4'
file 'B.mp4'
inpoint 0.500
file 'C.mp4'
inpoint 0.500
```

実行：

```
ffmpeg -y -f concat -safe 0 -i list.txt -c copy out.mp4
```

---
