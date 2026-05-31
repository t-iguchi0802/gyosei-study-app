# AGENTS.md — 行政書士厳選・高効率学習アプリ

Cursor エージェントが本リポジトリを編集する際の専用ガイド。

## 最終原則

行政書士試験は満点試験ではない。

本アプリは **300点を目指さない**。

180点を最短で超えるために、

- **学ぶこと**
- **学ばないこと**

を明確に区別する。

迷った場合は、

> **「その論点は180点達成に必要か？」**

を判断基準とする。

詳細: [LOSING_STRATEGY.md](./LOSING_STRATEGY.md)

## プロダクトビジョン

**合格に必要な論点を厳選し、最小の問題数で最大の得点効率を実現する** スマホ専用学習アプリ。

- 180点ミニマム合格（法令等122+ / 基礎24+ / 計180+）を設計の中心に置く
- 完成形は **~212問（上限220）**。問題数の拡大は目的ではない
- 1問1得点源。低頻出・低配点論点は意図的に捨てる
- 本試験3形式（5肢択一・多肢選択・記述式）の **形式再現** は必須
- 定着は **間隔反復＋180点ルート** で担保する

### やらないこと

- 300点満点・1000問規模の問題バンク化
- 網羅的・教科書的全範囲カバー
- 似た問題の量産・捨て論点への作問
- 得点ROIが低い論点の「とりあえず1問」

## 関連ドキュメント

| ファイル | 用途 |
|----------|------|
| [README.md](./README.md) | 利用者向け概要 |
| [HANDOFF.md](./HANDOFF.md) | 引き継ぎ・方針・履歴 |
| [ROADMAP.md](./ROADMAP.md) | Version 1〜3 計画 |
| [QUESTION_QUALITY_RULES.md](./QUESTION_QUALITY_RULES.md) | 作問・追加判断ルール |
| [SUBJECT_STRATEGY.md](./SUBJECT_STRATEGY.md) | 科目別厳選・論点管理 |
| [LOSING_STRATEGY.md](./LOSING_STRATEGY.md) | 捨て論点・180点判断基準 |
| [PAST_EXAM_ANALYSIS.md](./PAST_EXAM_ANALYSIS.md) | 過去問分析（R1–R7・公式PDF/正解例ベース）・Tier根拠 |
| [QUESTION_MASTER.md](./QUESTION_MASTER.md) | 全123問のTierマッピング・論点カバー率・ギャップ |
| [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) | 合格ギャップ分析・統合/置換優先順位 |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | 実装優先順位・フェーズ計画 |
| [PHASE1_SPEC.md](./PHASE1_SPEC.md) | Phase1 実装仕様書 |
| [PHASE2_SPEC.md](./PHASE2_SPEC.md) | Phase2 実装仕様書（コンテンツ設計） |

引き継ぎの **正式版は [HANDOFF.md](./HANDOFF.md)**。旧開発履歴は [GYOUSEI_APP_HANDOFF.md](./GYOUSEI_APP_HANDOFF.md)（履歴保管・削除しない）を参照。

## リポジトリ情報

| 項目 | 値 |
|------|-----|
| メインファイル | `index.html`（HTML+CSS+JS+全データ、約2,600行） |
| GitHub | `t-iguchi0802/gyosei-study-app` |
| 本番 | `https://gyosei-study-app-wheat.vercel.app` |
| 状態保存 | `localStorage` キー `gyosei-admin-mobile-v3` |
| ローカル確認 | `node server.js` → `http://localhost:3000` |

## 本試験前提（公式）

出典: [行政書士試験研究センター](https://www.gyosei-shiken.or.jp/doc/guide/guide.html)

| 項目 | 内容 |
|------|------|
| 試験 | 60問300点 / 11月第2日曜 13:00–16:00 |
| 合格 | 法令等122+ / 基礎24+ / 計180+ |
| 法令等 | 5肢40 + 多肢3 + 記述3（40字×3、60点） |
| 基礎知識 | 5肢14（一般/諸法令/情通/文章理解） |
| 記述配分 | 例年・R7: **行政法1・民法2**（年度で変動あり） |
| 法令範囲 | 試験年4/1現在施行 / R8: 改正行政書士法対象 |

### `scorePlan180` との区別

`scorePlan180` は **180点到達シミュレーション用の学習目標配点**。本試験の厳密配点（行政法112等）とは異なる。

| 科目 | アプリ目標 | 本試験目安 |
|------|-----------|-----------|
| 行政法 | 76 | 112 |
| 民法 | 40 | 76 |
| 基礎知識 | 32 | 56 |
| 憲法 | 16 | 28 |
| 記述式 | 24 | 60 |
| 商法 | 8 | 20 |
| 基礎法学 | 4 | 8 |

## 問題数計画

| カテゴリ | 現状 | V1 | V2完成 | 上限 |
|----------|------|-----|--------|------|
| 行政法 | 47 | 62 | 78 | 80 |
| 民法 | 16 | 26 | 36 | 38 |
| 憲法 | 5 | 10 | 12 | 12 |
| 基礎知識 | 16 | 30 | 38 | 40 |
| 商法・会社法 | 4 | 8 | 10 | 10 |
| 基礎法学 | 4 | 6 | 8 | 8 |
| 記述式訓練 | 31 | ~32 | ~20 | 20 |
| 多肢選択 | 2 | 8 | 10 | 10 |
| **合計** | **123** | **~182** | **~212** | **220** |

**問題追加の許可条件:** 180点達成に必要な未カバー論点 / 致命ギャップ / 法改正 / 置換のみ。詳細は `QUESTION_QUALITY_RULES.md`・`LOSING_STRATEGY.md`。

## 記述式訓練の扱い（重要）

### 現状（31問）

- **すべてMC**。採点語・40字答案の解説はあるが、本試験の **自由記述** 形式ではない
- 重複型・簡易MCが混在

### V1（移行期 ~32問）

- 自由入力UI（40字・部分点）を導入
- 既存MC31問は **維持し並行**（移行完了まで削除しない）

### V2（完成 ~20問）

- **問題数削減方針ではない**
- 低品質・重複MCを整理・統合し、**本試験型の自由入力＋採点基準付き ~20問** へ再編
- 行政法型 ~7 / 民法型 ~13

### エージェント向けルール

- 記述の「削減」= MC整理＋自由入力への置換。単純な問数削減禁止
- V2完成後のMC新規追加禁止

## 現状スナップショット

- 問題123 / 講義125 / 要点132 / 体系テキスト6 / 重要条文35
- 記述31問=MCのみ / 文章理解0 / 多肢2 / 本試験型36 / 2026予測11 / 足切り9
- 基礎知識 b26–b34, b37（**b35/b36未実装**）
- h1「行政法スマホ学習」≠ title「行政書士スマホ学習」

## リポジトリ構成

```
gyosei-admin-law-app/
├── index.html              # ★ 行政書士メイン
├── manifest.webmanifest, icon.svg
├── server.js, vercel.json
├── exam-app.js, fp3.html, it-passport.html, business-law3.html, boki3.html
├── app.js, styles.css      # index.html では未使用
├── README.md, HANDOFF.md, AGENTS.md
├── ROADMAP.md, QUESTION_QUALITY_RULES.md, SUBJECT_STRATEGY.md, LOSING_STRATEGY.md
├── PAST_EXAM_ANALYSIS.md, QUESTION_MASTER.md, GAP_ANALYSIS.md, IMPLEMENTATION_PLAN.md, PHASE1_SPEC.md, PHASE2_SPEC.md
└── GYOUSEI_APP_HANDOFF.md  # 旧版（履歴保管・削除しない）
```

## index.html 主要領域

| 領域 | 内容 |
|------|------|
| データ | `scorePlan180`, `questions[]`, `lectures[]`, `cards[]`, `guideText[]`, `importantStatutes[]` |
| 出題 | 7モード、間隔反復、選択肢シャッフル |
| 180点 | `renderExam180`, `todayRoutes180` |

## 出題モード（7種）

`due` 復習 / `first` 一周 / `weak` 苦手 / `new` 未学習 / `exam` 本試験型 / `score180` 180点 / `all` 全範囲

## 編集ルール

### 必ず守ること

1. スマホ専用・`index.html` 単体完結
2. `localStorage` 互換（`storeKey` 変更は破壊的）
3. 選択肢シャッフル維持
4. **180点達成に必要か** で作問判断。捨て論点への追加禁止
5. 追加より厳選。上限220超の追加禁止（置換のみ）
6. 行政法・民法は判例ベース優先（`QUESTION_QUALITY_RULES.md`）
7. 記述式は部分点設計

### 問題形式

```javascript
q("id", "カテゴリ", "問題文", ["選択肢..."], 正解index, "解説")
```

記述式MC: 解説に `出題意図：` `採点語：` `40字答案：` を必須。出典（判例/条文/過去問）を記録。

### 触ってはいけない挙動

- 二段階リセット / 分野選択時の自動ジャンプ抑制
- 右スワイプ＝前へ、次へはボタンのみ / 履歴80件

## 検証

```powershell
node -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');const match=html.match(/<script>([\s\S]*)<\/script>/);if(!match) throw new Error('script not found');new Function(match[1]);console.log('syntax ok')"
```

変更後: スマホ幅で起動 → 出題 → 180点ルート → リセットを確認。

## 優先ギャップ（V1）

| ギャップ | 対応 |
|----------|------|
| 記述自由入力なし | UI追加 |
| 文章理解0 | 追加 |
| 多肢2 | 8問へ |
| 60問模擬 | V2 |

詳細: `ROADMAP.md` / `HANDOFF.md`
