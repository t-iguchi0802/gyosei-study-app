# 行政書士2026 第1回 学習アプリ

完成済みの第1回予想模試60問と解答解説を、PCとスマホで学習するためのWebアプリです。

## 公開環境

- Firebase Hosting：PC・スマホ共通URL
- Firebase Authentication：Googleログイン
- Cloud Firestore：5回分の解答・正誤・自信度・記述得点を端末間同期
- GitHub：`t-iguchi0802/gyosei-study-app`

PCとスマホで同じGoogleアカウントにログインすると、学習履歴が自動的に統合・同期されます。ログインしていない場合や一時的に通信できない場合も、各端末のブラウザ内には保存されます。

## モード

- 通し試験：全60問を解き終えてから一括採点します。解答中は正解・解説・過去成績を表示しません。
- 1問ずつ復習：1問だけを表示し、「解答・解説」を押した時だけ現在の問題の結果と解説を表示します。
- 5回履歴：各問題の正誤と自信度を5回分保存します。

記述式は、模範解答と必須キーワードを確認して自己採点します。

## ローカル確認

`start-app.ps1` を実行し、表示されたPC用URLを開きます。

```powershell
.\start-app.ps1
```

## Firebase

プロジェクト：`gyosei-study-2026-tiguchi`

```powershell
firebase deploy --only auth,firestore,hosting
```

Firestore規則では、ログインユーザーが自分のユーザーID配下だけを読み書きできます。

## データ更新

元Markdownから `data.js` を作り直す場合：

```powershell
python tools/build_data.py
```
