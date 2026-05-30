const categories = [
  "行政手続法",
  "行政不服審査法",
  "行政事件訴訟法",
  "国家賠償法",
  "地方自治法",
  "行政法総論",
  "記述式"
];

const questions = [
  {
    id: "tetsuzuki-001",
    category: "行政手続法",
    prompt: "審査基準が使われる場面として正しいものはどれか。",
    choices: ["不利益処分", "申請に対する処分", "行政指導", "住民訴訟"],
    answer: 1,
    explain: "審査基準は申請に対する処分で使う。処分基準は不利益処分で使う。"
  },
  {
    id: "tetsuzuki-002",
    category: "行政手続法",
    prompt: "標準処理期間を定めた場合の扱いとして正しいものはどれか。",
    choices: ["必ず官報で公示する", "公にしておくよう努める", "申請者だけに口頭で伝える", "不利益処分にだけ適用する"],
    answer: 1,
    explain: "標準処理期間を定めた場合は、公にしておくよう努める。"
  },
  {
    id: "tetsuzuki-003",
    category: "行政手続法",
    prompt: "行政指導について正しいものはどれか。",
    choices: ["相手方は必ず従う義務がある", "従わないことを理由に不利益取扱いできる", "任意の協力を求める行為である", "必ず聴聞を経る"],
    answer: 2,
    explain: "行政指導は任意。従わないことを理由とする不利益取扱いは禁止される。"
  },
  {
    id: "tetsuzuki-004",
    category: "行政手続法",
    prompt: "届出について、手続上の義務が履行されたといえる時点はどれか。",
    choices: ["行政庁が受理印を押した時", "行政庁が審査を終えた時", "形式上の要件を満たした届出が行政庁に到達した時", "許可通知が出た時"],
    answer: 2,
    explain: "届出は、形式上の要件を満たして行政庁に到達した時に手続上の義務が履行される。"
  },
  {
    id: "tetsuzuki-005",
    category: "行政手続法",
    prompt: "許認可の取消しなど重大な不利益処分で原則必要となる手続はどれか。",
    choices: ["聴聞", "住民監査請求", "再審査請求", "事情判決"],
    answer: 0,
    explain: "許認可取消しなど重大な不利益処分では、原則として聴聞手続が必要。"
  },
  {
    id: "tetsuzuki-006",
    category: "行政手続法",
    prompt: "処分基準の公表について正しいものはどれか。",
    choices: ["必ず公にしなければならない", "公にするよう努める", "申請者だけに通知する", "行政指導にだけ適用される"],
    answer: 1,
    explain: "処分基準は、不利益処分の基準。公にするよう努める。審査基準は原則として公にする。"
  },
  {
    id: "tetsuzuki-007",
    category: "行政手続法",
    prompt: "弁明の機会の付与が主に問題となる場面はどれか。",
    choices: ["申請に対する許可処分", "聴聞を要しない不利益処分", "住民訴訟", "国家賠償請求"],
    answer: 1,
    explain: "不利益処分では、重大なものは聴聞、それ以外は弁明の機会付与が原則。"
  },
  {
    id: "tetsuzuki-008",
    category: "行政手続法",
    prompt: "意見公募手続が問題となる場面として正しいものはどれか。",
    choices: ["行政庁が命令等を定める場合", "住民が損害賠償を請求する場合", "取消訴訟を提起する場合", "公務員個人を訴える場合"],
    answer: 0,
    explain: "意見公募手続は、命令等を定める場合に国民の意見提出機会を設ける制度。"
  },
  {
    id: "fufuku-001",
    category: "行政不服審査法",
    prompt: "審査請求期間として正しいものはどれか。",
    choices: ["処分を知った日から6か月", "処分を知った日の翌日から3か月", "処分の日から3年", "処分を知った日の翌日から1年のみ"],
    answer: 1,
    explain: "審査請求は、処分を知った日の翌日から3か月以内。客観的には処分日の翌日から1年以内。"
  },
  {
    id: "fufuku-002",
    category: "行政不服審査法",
    prompt: "審査請求と処分の効力の関係として正しいものはどれか。",
    choices: ["審査請求すると当然に効力が止まる", "審査請求しても原則として効力は止まらない", "必ず裁判所が効力を止める", "処分庁の同意がない限り審査請求できない"],
    answer: 1,
    explain: "審査請求をしても、処分の効力・執行・手続続行は原則として妨げられない。"
  },
  {
    id: "fufuku-003",
    category: "行政不服審査法",
    prompt: "裁決で、審査請求が不適法な場合の結論はどれか。",
    choices: ["認容", "棄却", "却下", "事情判決"],
    answer: 2,
    explain: "不適法なら却下。理由がなければ棄却、理由があれば認容。"
  },
  {
    id: "fufuku-004",
    category: "行政不服審査法",
    prompt: "不作為について正しいものはどれか。",
    choices: ["審査請求の対象にならない", "審査請求できる", "必ず住民訴訟で争う", "国家賠償でしか争えない"],
    answer: 1,
    explain: "行政庁の不作為についても審査請求できる。"
  },
  {
    id: "fufuku-005",
    category: "行政不服審査法",
    prompt: "再調査の請求について正しいものはどれか。",
    choices: ["常に審査請求より先に必要", "法律に定めがある場合にできる", "裁判所に対して行う", "行政事件訴訟法上の訴訟である"],
    answer: 1,
    explain: "再調査の請求は、法律に定めがある場合に限って認められる。"
  },
  {
    id: "fufuku-006",
    category: "行政不服審査法",
    prompt: "審理員について正しいものはどれか。",
    choices: ["原則として審理手続を行う", "必ず裁判官である", "処分の取消判決をする", "住民訴訟の原告である"],
    answer: 0,
    explain: "行政不服審査法では、原則として審理員が審理手続を行う。"
  },
  {
    id: "fufuku-007",
    category: "行政不服審査法",
    prompt: "行政不服審査会の役割として近いものはどれか。",
    choices: ["第三者機関として審査庁の判断をチェックする", "国家賠償を命じる", "条例を制定する", "裁判所として判決する"],
    answer: 0,
    explain: "行政不服審査会は、第三者的立場から審査庁の判断過程をチェックする。"
  },
  {
    id: "jiken-001",
    category: "行政事件訴訟法",
    prompt: "取消訴訟の出訴期間として正しいものはどれか。",
    choices: ["処分を知った日から6か月、処分の日から1年", "処分を知った日の翌日から3か月のみ", "処分の日から5年", "期間制限はない"],
    answer: 0,
    explain: "取消訴訟は、処分または裁決を知った日から6か月以内、処分または裁決の日から1年以内。"
  },
  {
    id: "jiken-002",
    category: "行政事件訴訟法",
    prompt: "取消訴訟の被告として原則正しいものはどれか。",
    choices: ["処分をした公務員個人", "処分庁の所属する国または公共団体", "審理員", "行政不服審査会"],
    answer: 1,
    explain: "取消訴訟の被告は、原則として処分庁または裁決庁の所属する国または公共団体。"
  },
  {
    id: "jiken-003",
    category: "行政事件訴訟法",
    prompt: "裁決取消訴訟で原則として主張できる違法はどれか。",
    choices: ["原処分のすべての違法", "裁決固有の瑕疵", "民法上の契約不適合", "行政指導の不当性のみ"],
    answer: 1,
    explain: "裁決取消訴訟では、原則として裁決固有の瑕疵だけを主張できる。"
  },
  {
    id: "jiken-004",
    category: "行政事件訴訟法",
    prompt: "差止訴訟の要件として重要なものはどれか。",
    choices: ["軽微な不便があること", "重大な損害を生ずるおそれがあること", "処分後10年が経過したこと", "住民監査請求をしたこと"],
    answer: 1,
    explain: "差止訴訟では、重大な損害を生ずるおそれ、補充性などが重要。"
  },
  {
    id: "jiken-005",
    category: "行政事件訴訟法",
    prompt: "執行停止について正しいものはどれか。",
    choices: ["取消訴訟を提起すれば当然に認められる", "重大な損害を避けるため緊急の必要がある場合に問題となる", "行政庁だけが申し立てる", "公共の福祉に重大な影響があっても必ず認められる"],
    answer: 1,
    explain: "執行停止は、重大な損害を避けるため緊急の必要がある場合に認められ得る。"
  },
  {
    id: "jiken-006",
    category: "行政事件訴訟法",
    prompt: "取消訴訟で最初に問題となりやすい要件はどれか。",
    choices: ["処分性", "契約不適合", "相続分", "株式併合"],
    answer: 0,
    explain: "取消訴訟は、行政庁の処分その他公権力の行使にあたる行為であること、つまり処分性が出発点。"
  },
  {
    id: "jiken-007",
    category: "行政事件訴訟法",
    prompt: "原告適格の判断で中心となる考え方はどれか。",
    choices: ["法律上の利益を有する者か", "政治的意見が強い者か", "納税額が多い者か", "行政指導を受けた者なら常に認める"],
    answer: 0,
    explain: "取消訴訟の原告適格は、法律上の利益を有する者かどうかで判断する。"
  },
  {
    id: "jiken-008",
    category: "行政事件訴訟法",
    prompt: "取消判決の効力として正しいものはどれか。",
    choices: ["拘束力がある", "行政庁は無視できる", "第三者には一切効力がない", "必ず損害賠償を命じる"],
    answer: 0,
    explain: "取消判決には拘束力がある。第三者効も重要論点。"
  },
  {
    id: "jiken-009",
    category: "行政事件訴訟法",
    prompt: "事情判決が問題となる場面はどれか。",
    choices: ["処分は違法だが、取消しが公共の福祉に適合しない場合", "審査請求が不適法な場合", "行政指導に従わない場合", "条例制定請求をする場合"],
    answer: 0,
    explain: "事情判決は、処分は違法だが取消しが公共の福祉に適合しない場合に請求を棄却する制度。"
  },
  {
    id: "jiken-010",
    category: "行政事件訴訟法",
    prompt: "不作為の違法確認訴訟が使われる場面はどれか。",
    choices: ["申請に対して相当期間内に処分がされない場合", "処分後に損害賠償だけを求める場合", "議会解散を求める場合", "行政指導に任意で従う場合"],
    answer: 0,
    explain: "不作為の違法確認訴訟は、法令に基づく申請に対して相当期間内に応答がない場合に使う。"
  },
  {
    id: "jiken-011",
    category: "行政事件訴訟法",
    prompt: "義務付け訴訟の目的として正しいものはどれか。",
    choices: ["行政庁に一定の処分をすべきことを命じる", "処分の効力を当然に止める", "公務員個人を処罰する", "条例案を住民が可決する"],
    answer: 0,
    explain: "義務付け訴訟は、行政庁が一定の処分または裁決をすべき旨を命ずることを求める訴訟。"
  },
  {
    id: "kokubai-001",
    category: "国家賠償法",
    prompt: "国家賠償法1条の要件として不要なものはどれか。",
    choices: ["公務員", "公権力の行使", "故意または過失", "契約の成立"],
    answer: 3,
    explain: "国賠1条は、公務員・公権力の行使・職務上・故意過失・違法・損害が軸。契約成立は不要。"
  },
  {
    id: "kokubai-002",
    category: "国家賠償法",
    prompt: "国賠法2条の中心テーマはどれか。",
    choices: ["公の営造物の設置管理の瑕疵", "審査請求期間", "条例制定請求", "聴聞手続"],
    answer: 0,
    explain: "国賠2条は、道路・河川など公の営造物の設置または管理の瑕疵による損害。"
  },
  {
    id: "kokubai-003",
    category: "国家賠償法",
    prompt: "国賠1条について判例上の扱いとして正しいものはどれか。",
    choices: ["公務員個人が常に被害者へ直接責任を負う", "国または公共団体が賠償責任を負う", "損害がなくても責任が成立する", "故意過失は一切不要である"],
    answer: 1,
    explain: "国賠1条では国または公共団体が賠償責任を負う。公務員個人の被害者への直接責任は否定されるのが判例。"
  },
  {
    id: "kokubai-004",
    category: "国家賠償法",
    prompt: "国または公共団体が公務員に求償できる場面として正しいものはどれか。",
    choices: ["公務員に故意または重大な過失がある場合", "公務員が軽過失でも常に全額", "被害者に損害がない場合", "行政指導をしただけの場合は常に"],
    answer: 0,
    explain: "国または公共団体は、公務員に故意または重大な過失があったとき求償できる。"
  },
  {
    id: "kokubai-005",
    category: "国家賠償法",
    prompt: "国賠法2条の「瑕疵」の意味として最も近いものはどれか。",
    choices: ["通常有すべき安全性を欠くこと", "行政庁が審査請求を却下すること", "条例が制定されること", "申請者が不満を持つこと"],
    answer: 0,
    explain: "公の営造物の瑕疵とは、通常有すべき安全性を欠いている状態をいう。"
  },
  {
    id: "jichi-001",
    category: "地方自治法",
    prompt: "条例制定改廃請求に必要な署名数として正しいものはどれか。",
    choices: ["有権者の50分の1以上", "有権者の10分の1以上", "有権者の3分の1以上", "議員全員"],
    answer: 0,
    explain: "条例制定改廃請求と監査請求は、有権者の50分の1以上。"
  },
  {
    id: "jichi-002",
    category: "地方自治法",
    prompt: "住民訴訟の前に必要となるものはどれか。",
    choices: ["審査請求", "住民監査請求", "聴聞", "行政指導"],
    answer: 1,
    explain: "住民訴訟には住民監査請求の前置が必要。"
  },
  {
    id: "jichi-003",
    category: "地方自治法",
    prompt: "住民訴訟の対象として正しいものはどれか。",
    choices: ["あらゆる行政活動", "違法な財務会計行為", "民間企業の契約全般", "刑事事件"],
    answer: 1,
    explain: "住民訴訟は違法な財務会計行為を対象とする民衆訴訟。"
  },
  {
    id: "jichi-004",
    category: "地方自治法",
    prompt: "地方公共団体の長が制定するものとして正しいものはどれか。",
    choices: ["規則", "法律", "最高裁判例", "国会議事規則"],
    answer: 0,
    explain: "地方公共団体の長は規則を制定する。条例は議会の議決を経る。"
  },
  {
    id: "jichi-005",
    category: "地方自治法",
    prompt: "条例について正しいものはどれか。",
    choices: ["法令に違反しない限り制定できる", "法律に常に優先する", "長が単独で制定する", "住民訴訟で必ず制定される"],
    answer: 0,
    explain: "普通地方公共団体は、法令に違反しない限り条例を制定できる。"
  },
  {
    id: "jichi-006",
    category: "地方自治法",
    prompt: "住民監査請求の対象として正しいものはどれか。",
    choices: ["違法または不当な財務会計行為", "刑事裁判の量刑", "民間企業の人事", "国会議員の資格争訟"],
    answer: 0,
    explain: "住民監査請求は、違法または不当な財務会計行為を対象にする。"
  },
  {
    id: "souron-001",
    category: "行政法総論",
    prompt: "公定力の説明として正しいものはどれか。",
    choices: ["行政行為は取り消されるまで有効に扱われる", "行政庁は常に裁判なしで強制執行できる", "私人は永久に争える", "行政指導に強制力がある"],
    answer: 0,
    explain: "公定力とは、違法な行政行為でも取り消されるまでは有効に扱われる効力。"
  },
  {
    id: "souron-002",
    category: "行政法総論",
    prompt: "行政上の強制執行に含まれるものはどれか。",
    choices: ["代執行", "裁決取消訴訟", "事情判決", "行政指導"],
    answer: 0,
    explain: "行政上の強制執行には、代執行、執行罰、直接強制、強制徴収がある。"
  },
  {
    id: "souron-003",
    category: "行政法総論",
    prompt: "不可争力の説明として正しいものはどれか。",
    choices: ["争える期間を過ぎると私人から争えなくなる", "行政庁が常に自由に変更できる", "行政行為は必ず無効になる", "行政指導が強制になる"],
    answer: 0,
    explain: "不可争力とは、不服申立てや出訴期間の経過により私人から争えなくなる効力。"
  },
  {
    id: "souron-004",
    category: "行政法総論",
    prompt: "裁量の逸脱・濫用について正しいものはどれか。",
    choices: ["裁量があっても限界を超えれば違法になる", "裁量行為は絶対に裁判で争えない", "裁量行為は常に無効", "裁量は民法だけの概念"],
    answer: 0,
    explain: "行政庁に裁量があっても、その逸脱・濫用があれば違法となる。"
  },
  {
    id: "souron-005",
    category: "行政法総論",
    prompt: "即時強制の特徴として正しいものはどれか。",
    choices: ["義務の存在を前提とせず目前の障害を除去する", "必ず審査請求後に行う", "住民訴訟の一種である", "行政指導の別名である"],
    answer: 0,
    explain: "即時強制は、義務の存在を前提とせず、目前の急迫した障害を除去するために行われる。"
  },
  {
    id: "kijutsu-001",
    category: "記述式",
    prompt: "裁決にだけ手続上の瑕疵がある場合、提起すべき訴訟として最も適切なものはどれか。",
    choices: ["裁決取消訴訟を提起し、裁決固有の瑕疵を主張する", "住民訴訟を提起する", "民事訴訟で契約解除を主張する", "審査基準の公表を求める"],
    answer: 0,
    explain: "裁決固有の瑕疵を争う場面では、裁決取消訴訟が記述式の定番。"
  },
  {
    id: "kijutsu-002",
    category: "記述式",
    prompt: "処分の効力を一時的に止めたい場合、取消訴訟とあわせて検討する手段はどれか。",
    choices: ["執行停止の申立て", "直接請求", "戒告処分", "再調査の請求だけ"],
    answer: 0,
    explain: "処分の効力を止めるには、重大な損害を避けるため緊急の必要があるとして執行停止を申し立てる。"
  }
];

const cards = [
  ["行政手続法", "審査基準は何に使う？", "申請に対する処分。"],
  ["行政手続法", "処分基準は何に使う？", "不利益処分。"],
  ["行政手続法", "申請拒否処分で原則必要なものは？", "理由提示。"],
  ["行政手続法", "許認可取消など重大な不利益処分で必要な手続は？", "聴聞。"],
  ["行政手続法", "行政指導の本質は？", "任意。従わないことを理由に不利益取扱いしてはならない。"],
  ["行政手続法", "届出はいつ手続上の義務履行となる？", "形式上の要件を満たした届出が行政庁に到達した時。"],
  ["行政不服審査法", "審査請求期間は？", "処分を知った日の翌日から3か月以内、処分日の翌日から1年以内。"],
  ["行政不服審査法", "審査請求すると処分の効力は止まる？", "原則止まらない。必要があれば執行停止。"],
  ["行政不服審査法", "不適法な審査請求への裁決は？", "却下。"],
  ["行政不服審査法", "理由がない審査請求への裁決は？", "棄却。"],
  ["行政不服審査法", "理由がある審査請求への裁決は？", "認容。"],
  ["行政事件訴訟法", "取消訴訟の出訴期間は？", "処分を知った日から6か月以内、処分の日から1年以内。"],
  ["行政事件訴訟法", "取消訴訟の被告は原則誰？", "処分庁または裁決庁の所属する国または公共団体。"],
  ["行政事件訴訟法", "裁決取消訴訟で主張できる違法は？", "原則として裁決固有の瑕疵。"],
  ["行政事件訴訟法", "差止訴訟の重要要件は？", "重大な損害を生ずるおそれ、補充性など。"],
  ["行政事件訴訟法", "執行停止のキーワードは？", "重大な損害を避けるため緊急の必要。"],
  ["国家賠償法", "国賠1条の軸は？", "公務員の違法な公権力行使による損害。"],
  ["国家賠償法", "国賠2条の軸は？", "公の営造物の設置または管理の瑕疵。"],
  ["国家賠償法", "公務員個人は被害者に直接責任を負う？", "判例上、直接責任は負わない。"],
  ["地方自治法", "条例制定改廃請求の署名数は？", "有権者の50分の1以上。"],
  ["地方自治法", "議会解散・長の解職請求の署名数は？", "原則、有権者の3分の1以上。"],
  ["地方自治法", "住民訴訟の前置は？", "住民監査請求。"],
  ["行政法総論", "公定力とは？", "行政行為は取り消されるまで有効に扱われること。"],
  ["行政法総論", "行政上の強制執行の種類は？", "代執行、執行罰、直接強制、強制徴収。"],
  ["記述式", "取消訴訟型の基本文は？", "Xは、Yを被告として、〇〇処分の取消訴訟を提起し、△△の違法を主張する。"],
  ["記述式", "裁決取消訴訟型の基本文は？", "Xは、Yを被告として、裁決取消訴訟を提起し、裁決固有の瑕疵を主張する。"],
  ["記述式", "執行停止型の基本文は？", "重大な損害を避けるため緊急の必要があるとして、執行停止を申し立てる。"]
].map((item, index) => ({ id: `card-${index}`, category: item[0], front: item[1], back: item[2] }));

const storageKey = "gyosei-admin-law-progress-v1";
const state = loadState();
let currentQuestion = null;
let currentCardIndex = 0;

const els = {
  masteryText: document.querySelector("#masteryText"),
  dueText: document.querySelector("#dueText"),
  streakText: document.querySelector("#streakText"),
  coachText: document.querySelector("#coachText"),
  categoryFilter: document.querySelector("#categoryFilter"),
  modeFilter: document.querySelector("#modeFilter"),
  questionCategory: document.querySelector("#questionCategory"),
  questionStats: document.querySelector("#questionStats"),
  questionText: document.querySelector("#questionText"),
  choices: document.querySelector("#choices"),
  answerPanel: document.querySelector("#answerPanel"),
  answerResult: document.querySelector("#answerResult"),
  answerExplain: document.querySelector("#answerExplain"),
  nextButton: document.querySelector("#nextButton"),
  cardCategoryFilter: document.querySelector("#cardCategoryFilter"),
  flashCategory: document.querySelector("#flashCategory"),
  flashFront: document.querySelector("#flashFront"),
  flashBack: document.querySelector("#flashBack"),
  showBackButton: document.querySelector("#showBackButton"),
  prevCardButton: document.querySelector("#prevCardButton"),
  nextCardButton: document.querySelector("#nextCardButton"),
  progressList: document.querySelector("#progressList"),
  resetButton: document.querySelector("#resetButton")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) return JSON.parse(saved);
  return {
    streak: 0,
    answered: 0,
    correct: 0,
    questions: {}
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function initialQuestionState() {
  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    level: 0,
    dueAt: 0,
    lastAnsweredAt: 0
  };
}

function setupFilters() {
  const options = ["全分野", ...categories];
  for (const select of [els.categoryFilter, els.cardCategoryFilter]) {
    select.innerHTML = options.map((category) => `<option value="${category}">${category}</option>`).join("");
  }
}

function questionState(id) {
  if (!state.questions[id]) state.questions[id] = initialQuestionState();
  return state.questions[id];
}

function isDue(question) {
  return questionState(question.id).dueAt <= Date.now();
}

function getFilteredQuestions() {
  const category = els.categoryFilter.value;
  const mode = els.modeFilter.value;
  let pool = questions.filter((question) => category === "全分野" || question.category === category);

  if (mode === "due") pool = pool.filter(isDue);
  if (mode === "weak") pool = pool.filter((question) => questionState(question.id).wrong > 0 || questionState(question.id).level < 2);
  if (mode === "new") pool = pool.filter((question) => questionState(question.id).attempts === 0);

  if (pool.length === 0) {
    pool = questions.filter((question) => category === "全分野" || question.category === category);
  }

  return pool.sort((a, b) => {
    const sa = questionState(a.id);
    const sb = questionState(b.id);
    return sa.dueAt - sb.dueAt || sa.level - sb.level || sa.correct - sb.correct;
  });
}

function pickQuestion() {
  const pool = getFilteredQuestions();
  currentQuestion = pool[0];
  renderQuestion();
}

function renderQuestion() {
  const qState = questionState(currentQuestion.id);
  els.questionCategory.textContent = currentQuestion.category;
  els.questionStats.textContent = `正解 ${qState.correct} / ミス ${qState.wrong}`;
  els.questionText.textContent = currentQuestion.prompt;
  els.choices.innerHTML = "";
  els.answerPanel.classList.add("hidden");

  currentQuestion.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.textContent = choice;
    button.addEventListener("click", () => answerQuestion(index));
    els.choices.appendChild(button);
  });
}

function answerQuestion(index) {
  const buttons = [...els.choices.querySelectorAll(".choice")];
  buttons.forEach((button) => {
    button.disabled = true;
  });

  const correct = index === currentQuestion.answer;
  buttons[currentQuestion.answer].classList.add("correct");
  if (!correct) buttons[index].classList.add("wrong");

  const qState = questionState(currentQuestion.id);
  qState.attempts += 1;
  qState.lastAnsweredAt = Date.now();
  state.answered += 1;

  if (correct) {
    qState.correct += 1;
    qState.level = Math.min(5, qState.level + 1);
    state.correct += 1;
    state.streak += 1;
    qState.dueAt = Date.now() + nextInterval(qState.level);
  } else {
    qState.wrong += 1;
    qState.level = Math.max(0, qState.level - 1);
    state.streak = 0;
    qState.dueAt = Date.now() + 5 * 60 * 1000;
  }

  els.answerResult.textContent = correct ? "正解。ここは本試験でも取りたいところです。" : "不正解。5分後以降に優先して再出題します。";
  els.answerExplain.textContent = currentQuestion.explain;
  els.answerPanel.classList.remove("hidden");
  saveState();
  renderStats();
}

function nextInterval(level) {
  const minutes = [5, 30, 180, 24 * 60, 3 * 24 * 60, 7 * 24 * 60];
  return minutes[level] * 60 * 1000;
}

function renderStats() {
  const learnedLevels = questions.reduce((sum, question) => sum + questionState(question.id).level, 0);
  const mastery = Math.round((learnedLevels / (questions.length * 5)) * 100);
  const due = questions.filter(isDue).length;
  els.masteryText.textContent = `${mastery}%`;
  els.dueText.textContent = due;
  els.streakText.textContent = state.streak;
  els.coachText.textContent = coachComment(mastery, due);
  renderProgress();
}

function coachComment(mastery, due) {
  if (state.answered === 0) return "まずは復習優先で10問。行政法は、申請・不利益処分・取消訴訟の軸が見えると一気に楽になります。";
  if (due >= 8) return `今日の復習が${due}問あります。新しい範囲より、今はミスした問題の再出題を片付ける方が得点に直結します。`;
  if (mastery < 35) return "土台作り中です。行政手続法と行政不服審査法の短い知識を落とさない状態にしましょう。";
  if (mastery < 70) return "いい進み方です。ここからは行政事件訴訟法の要件と記述式テンプレを増やすと伸びます。";
  return "かなり仕上がっています。弱点優先モードで、ミスした肢だけを本試験前の得点源に変えていきましょう。";
}

function filteredCards() {
  const category = els.cardCategoryFilter.value;
  return cards.filter((card) => category === "全分野" || card.category === category);
}

function renderCard() {
  const pool = filteredCards();
  if (currentCardIndex >= pool.length) currentCardIndex = 0;
  if (currentCardIndex < 0) currentCardIndex = pool.length - 1;
  const card = pool[currentCardIndex];
  els.flashCategory.textContent = card.category;
  els.flashFront.textContent = card.front;
  els.flashBack.textContent = card.back;
  els.flashBack.classList.add("hidden");
}

function renderProgress() {
  const grouped = categories.map((category) => {
    const qs = questions.filter((question) => question.category === category);
    if (!qs.length) return null;
    const levelSum = qs.reduce((sum, question) => sum + questionState(question.id).level, 0);
    const attempts = qs.reduce((sum, question) => sum + questionState(question.id).attempts, 0);
    const wrong = qs.reduce((sum, question) => sum + questionState(question.id).wrong, 0);
    return { category, mastery: Math.round((levelSum / (qs.length * 5)) * 100), attempts, wrong };
  }).filter(Boolean);

  els.progressList.innerHTML = grouped.map((item) => `
    <article class="progress-item">
      <div class="progress-head">
        <strong>${item.category}</strong>
        <span>${item.mastery}%</span>
      </div>
      <div class="bar" aria-hidden="true"><span style="width: ${item.mastery}%"></span></div>
      <p>解答 ${item.attempts}回 / ミス ${item.wrong}回</p>
    </article>
  `).join("");
}

function switchView(viewName) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${viewName}View`).classList.add("active");
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });
  els.categoryFilter.addEventListener("change", pickQuestion);
  els.modeFilter.addEventListener("change", pickQuestion);
  els.nextButton.addEventListener("click", pickQuestion);
  els.cardCategoryFilter.addEventListener("change", () => {
    currentCardIndex = 0;
    renderCard();
  });
  els.showBackButton.addEventListener("click", () => els.flashBack.classList.remove("hidden"));
  els.prevCardButton.addEventListener("click", () => {
    currentCardIndex -= 1;
    renderCard();
  });
  els.nextCardButton.addEventListener("click", () => {
    currentCardIndex += 1;
    renderCard();
  });
  els.resetButton.addEventListener("click", () => {
    if (!confirm("学習記録を初期化しますか？")) return;
    localStorage.removeItem(storageKey);
    location.reload();
  });
}

setupFilters();
bindEvents();
pickQuestion();
renderCard();
renderStats();
