# ドラレコ録画ファイル結合ツール Dashcam-Joiner - 1-GOP単位のカット、ロスレス結合

## はじめに
このツールミツバサンコーワ(MITSUBA)の バイク用ドラレコ EDR シリーズの30秒ごとの録画ファイルをつなげて１つのファイルにするためのツールです。公式プレイヤーでも同じことができますが、サクサクやりたかったのでツールにしました。

もしかしたら別のドラレコにも使えるかもしれませんが、使えなくてもサポートできません。
使えたよ、使えなかったよ、の情報は issues に書いてもらえると参考になります。

* MITSUBA  EDR-22G の録画ファイルでテスト済
* 単純結合だと重複してしまう各ファイルの重複部分をカットして結合
* 再エンコードなしで、高速、ロスレス結合。

## 1) インストール方法

* Windows インストーラー版をダウンロードして起動してください。
* [Dashcam-Joiner-Setup-0.3.4.exe](https://github.com/daig0rian/dashcam-joiner/releases/download/v0.3.4/Dashcam-Joiner-Setup-0.3.4.exe)
* インストーラーを使わないポータブル版はReleasesのページにあります。
* いずれも最初の起動は少し時間がかかるので注意。FFMpegの展開に時間がかかるようです。

## 2) 使い方

1. Dashcam-Joinerを起動
2. SDカードをPCにさす。
3. **Choose Folder…**　で、つなげたい録画ファイルがあるフォルダを選択。
4. **Groups**に表示された録画のグループを選択。
5. **GOP seconds:** で重複部分の秒数を設定（デフォルト0.500秒）。EDRシリーズの場合先頭1GOP分が重複しその長さは 0.500 s となります。ほかのドラレコの場合はAuto-Detectボタンを押すことで自動的に1GOP分が設定されます。
6. **Save As...** で保存先を指定
7. **Start Merge** で動画結合開始。
8. **Logs** に進捗と結果が表示されます。

このプログラムはChatGPT5によりすべて書かれました

---

# "Dashcam-Joiner" Dashcam Recording File Merge Tool  - 1-GOP Unit Cutting, Lossless Merging

## Introduction
This tool merges the 30-second recording files from MITSUBA EDR series motorcycle dashcams into a single file. While the official player can do the same, I made this tool for faster, smoother processing.

It might work with other dashcams, but I can't provide support if it doesn't.
Please report whether it worked or didn't work in the issues section—it helps.

* Tested with MITSUBA EDR-22G recording files
* Cut out duplicate sections from each file that would otherwise be duplicated when simply combined
* Fast, lossless joining without re-encoding.

## 1) Installation Method

* Download and run the Windows installer version.
* [Dashcam-Joiner-Setup-0.3.4.exe](https://github.com/daig0rian/dashcam-joiner/releases/download/v0.3.4/Dashcam-Joiner-Setup-0.3.4.exe)
* The portable version without an installer is available on the Releases page.
* Note that the first launch may take a while for both versions. It seems FFMpeg takes time to expand.

## 2) Usage

1. Launch Dashcam-Joiner
2. Insert the SD card into your PC.
3. Select the folder containing the recording files you want to join via **Choose Folder…**.
4. Select the recording group displayed under **Groups**.
5. Set the duplicate section duration in **GOP seconds:** (default 0.500 seconds). For EDR series, the first 1 GOP overlaps, with a length of 0.500 s. For other dashcams, press the Auto-Detect button to automatically set 1 GOP.
6. Specify the save location using **Save As...**
7. Start video merging with **Start Merge**.
8. Progress and results are displayed in **Logs**.

This program was written entirely by ChatGPT5.