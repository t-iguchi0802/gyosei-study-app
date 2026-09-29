"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={window:{}};vm.createContext(context);
for(const file of ['data.js','question-revisions.js','question-revisions-b.js','question-revisions-c.js','question-revisions-d.js','reference-data.js','transfer-content.js','legal-basis-data.js','legal-basis.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const w=context.window,basis=w.GYOSEI_LEGAL_BASIS,corpus=w.GYOSEI_LEGAL_TEXT;
assert.equal(corpus.lawDate,'2026-04-01');assert.equal(w.EXAM_DATA.questions.length,60);assert.equal(w.GYOSEI_TRANSFER_DATA.questions.length,24);
assert.equal(Object.keys(basis.exam).length,60);assert.equal(Object.keys(basis.transfer).length,24);
for(const refs of [...Object.values(basis.exam),...Object.values(basis.transfer)])for(const ref of refs){
  const [key,num,partList]=ref.split(':'),law=corpus.laws[key],article=law?.articles[num];
  assert(article,ref);assert(article.title&&article.paragraphs.length,ref);
  for(const p of article.paragraphs)assert(p.text.length>0,ref);
  if(partList)for(const num of partList.split(','))assert(article.paragraphs.some(p=>p.num===num),`Missing paragraph ${ref}: ${num}`);
  assert(law.url.endsWith(law.revision),ref);
}
const paragraph=(law,article,num)=>corpus.laws[law].articles[article].paragraphs.find(p=>p.num===num).text;
assert.match(paragraph('procedure','5','1'),/審査基準を定めるものとする/);
assert.match(paragraph('procedure','6','1'),/定めるよう努める/);assert.match(paragraph('procedure','6','1'),/公にしておかなければならない/);
assert.match(paragraph('procedure','12','1'),/定め、かつ、これを公にしておくよう努め/);
assert.match(paragraph('litigation','10','2'),/処分の違法を理由として取消しを求めることができない/);
assert.match(paragraph('civil','704','1'),/利息を付して/);
assert.match(paragraph('litigation','37_2','1'),/重大な損害/);assert.match(paragraph('litigation','37_4','1'),/重大な損害/);
assert.match(paragraph('scrivener','1_4','1'),/作成することができる/);
console.log('PASS: all 84 question mappings, 20 dated official law sources, every selected paragraph exists, critical rule distinctions preserved');
