# PHASE1_SPEC.md — Phase1 実装仕様書

## 目的

[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) Phase 1 のうち **1.1 / 1.2 / 1.4** の設計正本。コード実装前の合意用。

| # | 機能 | IMPLEMENTATION_PLAN |
|---|------|---------------------|
| 1.1 | 記述自由入力UI | A1 |
| 1.2 | 採点語自動判定 | A1 と一体 |
| 1.4 | 180点ルート改善 | A4 |

**スコープ外（Phase 1 後半）:** 多肢選択UI（1.3）、形式タグ基盤の全問展開（1.5）、記述MC統合（Phase 2）

**参照:** [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) / [QUESTION_QUALITY_RULES.md](./QUESTION_QUALITY_RULES.md) / [HANDOFF.md](./HANDOFF.md)

---

## 0. Phase 1 ゴール

| 完了基準 | 内容 |
|----------|------|
| C1 | w100–w105 で **40字自由入力 → 採点語部分点表示** が動作 |
| C2 | 採点語判定が解説 `採点語：` パースに基づく |
| C3 | 180点パネルに **記述 floor 14・基礎 floor 24** を可視化 |
| C4 | `localStorage` キー `gyosei-admin-mobile-v3` 後方互換 |
| C5 | 問題数 **123のまま**（w100–w105 は UI 転換のみ） |

---

## 1. 記述自由入力UI

### 1.1 画面仕様

#### 対象問題（Phase 1 先行6問）

| ID | ラベル | 備考 |
|----|--------|------|
| w100–w105 | `【本試験型・記述採点語】` | 採点語・40字答案・部分点が解説に整備済み |

**移行期:** 上記以外の記述式25問は **従来MCのまま**（非表示・削除しない）。

#### 問題画面（自由入力モード）

```
┌─────────────────────────────────────┐
│ [記述式]  正解 N / ミス M            │
├─────────────────────────────────────┤
│ 問題文（#questionText）              │
├─────────────────────────────────────┤
│ ┌ 40字答案（自由入力）────────────┐ │
│ │ [textarea 2–3行]               │ │
│ └────────────────────────────────┘ │
│ 字数: 32 / 40  （句読点含む）        │
│ [答案を提出する]                     │
├─────────────────────────────────────┤
│ MC予習モードに切替（任意・Phase1）   │
└─────────────────────────────────────┘
```

| 要素 | 仕様 |
|------|------|
| 入力欄 | `#choices` 内に JS 生成。MC ボタンは非表示 |
| 字数 | 40字目安。**句読点含む**。超過は警告色のみ、提出は可 |
| 空提出 | ブロック。「答案を入力してください」 |
| 提出後 | 既存 `#answerPanel` を表示 |
| 次へ | 既存 `#nextButton` |

#### 解答後パネル

| ブロック | 内容 |
|----------|------|
| 結果行 | `部分点: 3/5 語一致（60%）` |
| 採点詳細 | ✓ 一致語 / ✗ 不足語 |
| 解説 | 既存 `writingStepsHtml()` |
| 模範 | `40字答案：` から抽出 |

#### スマホUI

- `textarea` `font-size: 16px` 以上（iOS ズーム防止）
- 提出ボタンは `.primary`
- 横スクロール禁止

#### CSS 追加（概要）

| クラス | 用途 |
|--------|------|
| `.writing-input-wrap` | 入力コンテナ |
| `.writing-textarea` | 自由入力欄 |
| `.writing-char-count` / `.warn` | 字数表示・40超警告 |
| `.writing-submit` | 提出ボタン |
| `.keyword-hit` / `.keyword-miss` | 採点結果 |

---

### 1.2 データ構造

#### 問題判定（Phase 1: allowlist）

```javascript
const WRITING_FREE_INPUT_IDS = new Set([
  "w100", "w101", "w102", "w103", "w104", "w105"
]);

function isWritingFreeInput(question) {
  return WRITING_FREE_INPUT_IDS.has(question.id);
}
```

将来（Phase 1.5）: `question.format === "writing_free"` に移行。

#### 解説フィールド（既存・変更なし）

`explainPart()` がパースするラベル:

```
予測理由：…
出題意図：…
採点語：語句1、語句2、…
40字答案：…
部分点：…
```

#### localStorage — `state.questions[id]` 拡張

既存: `{ attempts, correct, wrong, level, dueAt }`

Phase 1 追加（オプショナル）:

```javascript
{
  writingAttempts: 0,
  writingBestRatio: 0,
  writingLastRatio: 0,
  writingLastAnswer: "",
  writingLastMissing: []
}
```

`qs()` 初期化は変更せず、読取時 `?? 0` / `?? ""` でフォールバック。

---

### 1.3 ロジック仕様

#### 画面分岐

```
renderQuestion()
  ├─ isWritingFreeInput(currentQuestion)?
  │    └─ renderWritingQuestion()
  └─ else
       └─ 既存 MC
```

#### 提出フロー

```
submitWritingAnswer(text)
  1. keywords ← parseScoringKeywords(explain)
  2. result   ← scoreWritingAnswer(text, keywords)
  3. qs(id)   ← writing* + attempts/level/dueAt/correct/wrong
  4. explain  ← renderWritingResult + writingStepsHtml()
  5. save() + renderStats()
```

#### 採点語パース

```javascript
function parseScoringKeywords(explain) {
  return explainPart(explain, "採点語")
    .split(/[、,，・／\/]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}
```

#### 採点語自動判定

| ステップ | 処理 |
|----------|------|
| 正規化 | 連続空白統一。句読点は **除去しない** |
| 一致 | `normalizedAnswer.includes(keyword)`（部分文字列） |
| 比率 | `matchedCount / keywords.length` |
| 空採点語 | `keywords.length === 0` → grade `unscorable` |

#### 正誤・level

| 一致率 | 判定 | level | streak / correct |
|--------|------|-------|------------------|
| ≥ 0.8 | 合格 | +1 (max 5) | `correct++`, streak+1 |
| ≥ 0.5 | 部分点 | ±0 | streak リセット |
| < 0.5 | 不足 | -1 (min 0) | `wrong++`, streak=0 |

**dueAt:** 既存 `interval(level)` を流用。

#### MC 併存（移行期）

- w100–w105 の `choices` データは **残す**
- デフォルト UI は自由入力
- 任意: 「MC予習に切替」で既存 `answer(i)` フロー

---

### 1.4 localStorage 影響

| 項目 | 方針 |
|------|------|
| `storeKey` | **`gyosei-admin-mobile-v3` 変更禁止** |
| マイグレーション | 不要（読取フォールバック） |
| リセット | 既存二段階リセットで新フィールドも消去 |

---

### 1.5 既存コード変更箇所

| 箇所 | 変更 |
|------|------|
| CSS ~447 | 入力UI・採点結果スタイル |
| `#choices` ~820 | JS 生成で textarea |
| `WRITING_FREE_INPUT_IDS` | 新規定数 |
| `renderQuestion()` ~1991 | 分岐（Step 2 以降） |
| `parseScoringKeywords()` | 新規（Step 1） |
| `scoreWritingAnswer()` | 新規（Step 1） |
| `renderWritingQuestion()` 等 | Step 2 以降 |
| `renderExam180()` | Step 4 |

**変更しない:** `q()` シグネチャ、`storeKey`、MC シャッフル、二段階リセット。

---

### 1.6 テスト項目

| # | 項目 | 期待 |
|---|------|------|
| T1-1 | 構文チェック | `syntax ok` |
| T1-2 | w100 表示 | textarea、MC 非表示 |
| T1-3 | j01 表示 | 従来 MC |
| T1-4 | 空提出 | state 不更新 |
| T1-5 | 全採点語一致 | ratio≥0.8, grade pass |
| T1-6 | 1語のみ一致 | ratio<0.5, grade fail |
| T1-7 | 41字入力 | 警告色、提出可 |
| T1-8 | リロード | writingBestRatio 保持 |
| T1-9 | 既存 localStorage | エラーなし |
| T1-10 | 375px 幅 | レイアウト崩れなし |

---

## 2. 採点語自動判定（詳細）

エントリポイント: **`scoreWritingAnswer(text, keywords)`**

### 2.1 戻り値

```javascript
{
  keywords: string[],
  matched: string[],
  missing: string[],
  ratio: number,       // 0.0–1.0
  grade: "pass" | "partial" | "fail" | "unscorable"
}
```

### 2.2 w100–w105 検証用採点語

| ID | 採点語 |
|----|--------|
| w100 | 拒否処分取消訴訟、申請型義務付け訴訟、併合提起 |
| w101 | 差止訴訟、重大な損害、補充性 |
| w102 | 時効完成後、債務承認、信義則、援用権喪失 |
| w103 | 詐欺、意思表示、取消し、善意無過失の第三者 |
| w104 | 公の営造物、設置管理の瑕疵、国賠法2条、損害 |
| w105 | 催告、相当期間、不履行、解除、明渡し |

---

## 3. 180点ルート改善

### 3.1 画面仕様

`renderExam180()` に **足切りチェック** ブロックを追加。

| 行 | 本試験要件 | データソース |
|----|-----------|-------------|
| 法令等 | 122点+ | `law` |
| 基礎知識 | 24点+ | `basic` |
| 記述式 | 14点+ | `writingReadinessScore()` |

### 3.2 記述推定得点

```javascript
function writingReadinessScore() {
  const ids = [...WRITING_FREE_INPUT_IDS];
  const ratios = ids.map(id => qs(id).writingBestRatio ?? 0);
  const avg = ratios.reduce((a, b) => a + b, 0) / ids.length;
  return Math.round(24 * avg);
}
```

### 3.3 ロジック変更

- `renderCutoffBlock()` 新規
- `todayRoutes180()` に writingScore 引数
- `nextMission()` に記述 floor 文言
- `routePriority()` 記述未達ボーナス調整

### 3.4 テスト項目

| # | 項目 | 期待 |
|---|------|------|
| T3-1 | 初回起動 | 記述推定0、危険表示 |
| T3-2 | w101 ratio 0.8 | 記述推定上昇 |
| T3-3 | basic=20 | 基礎赤 |
| T3-5 | writingScore=15 | 記述足切り OK |

---

## 4. 推奨実装順序

```
Step 1: parseScoringKeywords + scoreWritingAnswer（純関数）  ← 完了目標
Step 2: renderWritingQuestion + submitWritingAnswer + localStorage 拡張
Step 3: w100–w105 allowlist 接続 + 結果UI
Step 4: writingReadinessScore + renderCutoffBlock + renderExam180 改修
Step 5: T1 / T3 全項目の手動テスト
```

---

## 5. 関連ドキュメント

- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- [GAP_ANALYSIS.md](./GAP_ANALYSIS.md)
- [QUESTION_QUALITY_RULES.md](./QUESTION_QUALITY_RULES.md)
- [AGENTS.md](./AGENTS.md)
