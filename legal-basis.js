(function () {
  "use strict";
  // The final segment, where present, selects paragraphs. Other paragraphs remain readable.
  const laws = {
    constitution:"321CONSTITUTION", procedure:"405AC0000000088", appeal:"426AC0000000068",
    litigation:"337AC0000000139", civil:"129AC0000000089", company:"417AC0000000086",
    civilProcedure:"408AC0000000109", state:"322AC0000000125", courts:"322AC0000000059",
    criminal:"140AC0000000045", criminalProcedure:"323AC0000000131", local:"322AC0000000067",
    lease:"403AC0000000090", commercial:"132AC0000000048", education:"418AC0000000120",
    welfare:"325AC0000000144", statistics:"419AC0000000053", bank:"409AC0000000089",
    scrivener:"326AC1000000004", privacy:"415AC0000000057"
  };
  const exam = {
    1:["constitution:31"], 2:["civilProcedure:246","civilProcedure:261:1,2","civilProcedure:266:1"],
    3:["constitution:14:1","constitution:22:1","state:1:1"],
    4:["constitution:20:1,3","constitution:89"], 5:["constitution:21"],
    6:["constitution:51","state:1"], 7:["constitution:76:1","constitution:81","courts:3:1"],
    8:["litigation:3:2"], 9:[], 10:["criminal:9","criminal:17","criminalProcedure:160","criminalProcedure:161","constitution:39"],
    11:["procedure:5","procedure:6","procedure:12"], 12:["procedure:2","procedure:13"],
    13:["procedure:38:1","procedure:39","procedure:40","procedure:42","procedure:43:1"],
    14:["procedure:8"],15:["appeal:25"],16:["appeal:18:1,2","appeal:22:1,3,5","appeal:82:1","appeal:83:1"],
    17:["appeal:9:1,2","appeal:17","appeal:42:1,2","appeal:50:1"],
    18:["litigation:9","litigation:10:1"],19:["litigation:3:2"],20:["litigation:9:1"],
    21:["litigation:3:2,3","litigation:10:2","litigation:19:1"],22:["state:2:1"],23:["state:1:1"],
    24:["local:242:1,2","local:242_2:1"],25:["constitution:94","local:14:1"],
    26:["local:245_2","local:245_3:1","local:245_4:1","local:245_5:1,5","local:245_7:1"],
    27:["civil:145","civil:147:1,2","civil:150","civil:166:1"],
    28:["civil:113","civil:117","civil:896"],29:["civil:251:1","civil:252:1,3,5"],
    30:["civil:20"],31:["civil:96"],32:["civil:446:2,3","civil:465_2"],
    33:["civil:605_2","civil:622_2","lease:31:1"],34:["civil:715:1,3"],
    35:["civil:1046:1","civil:1047:5","civil:1048"],36:["commercial:526"],
    37:["company:830:2","company:831","company:838"],
    38:["company:356:1","company:365","company:369:2","company:423:3","company:428"],
    39:["company:52"],40:["company:136","company:137:1","company:138:1","company:139:1,2","company:145"],
    41:["constitution:23","constitution:26","education:16"],
    42:["welfare:3","welfare:8","litigation:30","state:1:1"],
    43:["constitution:15:1","constitution:79:2,3","litigation:4","courts:3:1"],
    44:["litigation:3:6","litigation:37_2:1,2,3,5","litigation:37_4:1,2","litigation:37_5:1,2"],
    45:["civil:304:1","civil:372"],46:["civil:466:2,3,4","civil:466_2:1","civil:466_5:1","civil:467"],
    47:["local:14:1","local:74:1,2,3"],48:["statistics:5:1,2","statistics:13:1,2"],
    49:["bank:2","bank:3","bank:4","bank:15:1","bank:19"],50:[],51:[],
    52:["scrivener:1_3:1","scrivener:1_4:1,2","scrivener:19:1"],
    53:["scrivener:1_4:1,2","scrivener:1_5"],54:[],55:[],56:["privacy:27:1,2,5"],57:[],58:[],59:[],60:[]
  };
  const transfer = {
    T01:["procedure:5","procedure:6","procedure:7","procedure:12"],T02:["procedure:13","procedure:14"],
    T03:["procedure:7","procedure:8","procedure:32","procedure:33"],
    T04:["procedure:32","procedure:35","procedure:39:1,3","procedure:40:1","procedure:43:1"],
    T05:["appeal:25"],T06:["appeal:45","appeal:46:1","appeal:48"],
    T07:["litigation:14"],T08:["litigation:10:2"],T09:["civil:703","civil:704"],
    T10:["civil:705","civil:706","civil:708"],T11:["civil:697","civil:700","civil:702"],
    T12:["civil:697","civil:698","civil:702"],T13:["civil:782","civil:783","civil:784","civil:785","civil:786"],
    T14:["civil:113","civil:114","civil:115","civil:116","civil:117"],T15:["civil:192","civil:193","civil:194"],
    T16:["civil:304:1","civil:372"],T17:["company:327:1,2,3,4,5","company:335:2,3","company:336:1,2","company:389:1,7"],
    T18:["company:390"],T19:["litigation:25:1,2,3","litigation:37_2:1,2","litigation:37_3:1,3","litigation:37_4:1,2","litigation:37_5:1,2"],
    T20:["civil:697","civil:698","civil:700","civil:702","civil:703","civil:704"],
    T21:["litigation:37_2:1,2"],T22:["litigation:31"],T23:["civil:704"],T24:["civil:782","civil:784"]
  };
  const plan = Object.fromEntries(Object.entries(laws).map(([key,id])=>[key,{id,articles:[]} ]));
  for(const refs of [...Object.values(exam),...Object.values(transfer)]) for(const ref of refs) {
    const [law,num]=ref.split(":");if(!plan[law].articles.includes(num))plan[law].articles.push(num);
  }
  function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text)n.textContent=text;return n;}
  function link(title,url){const a=node("a","basis-source",title);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;}
  function render(question,family="exam") {
    const refs=(family==="transfer"?transfer:exam)[question.id]||[];
    const section=node("section","legal-basis");
    section.append(node("h2","",refs.length?"根拠条文：内容と読み方":"この問題の判断根拠"));
    const grounds=question.sections?.["根拠条文"]||question.sections?.["関連条文"];
    if(grounds)section.append(node("p","basis-reading",grounds));
    if(family==="exam")section.append(node("p","basis-reading",`読み方：${question.core||"本文と各肢の理由を対応させて確認してください。"}`));
    if(family==="transfer"&&question.type==="single")section.append(node("p","basis-reading",`この問題との関係：${question.reasons[question.answer-1]}`));
    if(family==="exam"&&question.id===51){
      const charter=node("article","basis-article");charter.append(node("h3","","国連憲章27条（内容の要約）"));
      charter.append(node("p","basis-text","1項：安全保障理事会の各理事国は1票を持ちます。\n2項：手続事項は9理事国の賛成で決定します。\n3項：その他の事項では、常任理事国の同意を含む9理事国の賛成を要求しています。第6章と52条3項の決定では、紛争当事国が棄権する特則があります。"));
      charter.append(node("p","basis-reading","条文と運用の区別：常任理事国の自発的な棄権は、実務上、反対投票による拒否権とは区別されています。9か国の賛成という票数の条件は残ります。"));
      charter.append(link("国連広報センターの憲章本文", "https://www.unic.or.jp/info/un/charter/text_japanese/"));section.append(charter);
    }
    if(refs.length){
      section.append(node("p","basis-date","条文本文は2026年4月1日時点。以下の条文は原文、読み方・各肢の理由は学習用の説明です。"));
      for(const ref of refs){
        const [key,num,partList]=ref.split(":"),law=window.GYOSEI_LEGAL_TEXT?.laws[key],article=law?.articles[num];
        if(!article)throw new Error(`Missing legal text: ${ref}`);
        const block=node("article","basis-article");block.append(node("h3","",`${law.title} ${article.title}${article.caption?` ${article.caption}`:""}`));
        const chosen=partList?partList.split(","):article.paragraphs.map(p=>p.num);
        const appendParagraph=(parent,p)=>parent.append(node("p","basis-text",`第${p.num}項　${p.text}`));
        article.paragraphs.filter(p=>chosen.includes(p.num)).forEach(p=>appendParagraph(block,p));
        const rest=article.paragraphs.filter(p=>!chosen.includes(p.num));
        if(rest.length){const detail=node("details","basis-more");detail.append(node("summary","","この条の他の項も読む"));rest.forEach(p=>appendParagraph(detail,p));block.append(detail);}
        block.append(link("e-Govで条文を確認",law.url));section.append(block);
      }
    }
    const precedent=question.sections?.["関連判例"];
    if(precedent&&/最高裁|大法廷|小法廷|判決|事件/.test(precedent)&&! /^(条文中心|特定判例|一般理論|制度・|制定法律|法務省|統計定義)/.test(precedent)){
      const cases=node("section","basis-precedent");cases.append(node("h2","","判例：事案・判断理由・この問題との関係"));
      precedent.split(/\n+/).forEach(line=>cases.append(node("p","basis-text",line)));section.append(cases);
    }
    const urls=family==="transfer"?(question.refs||[]).map(r=>({title:`${r.title} ${r.articles}`,url:r.url})):
      [...new Set((question.sections?.["一次資料"]||"").match(/https?:\/\/[^\s]+/g)||[])].map(url=>({title:url.includes("courts.go.jp")?"裁判所の判決・一次資料":url.includes("laws.e-gov.go.jp")?"e-Govの法令本文":"公式資料を確認",url}));
    if(!refs.length&&family==="exam"&&question.id>=58)section.append(node("p","","この問題は文章理解です。根拠は問題文の前後関係・指示語・論理のつながりで、条文や判例は用いません。"));
    const sources=node("div","basis-links");urls.forEach(r=>sources.append(link(r.title,r.url)));section.append(sources);
    return section;
  }
  window.GYOSEI_LEGAL_BASIS={plan,exam,transfer,render};
})();
