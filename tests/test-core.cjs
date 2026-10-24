const fs=require('fs'), vm=require('vm'), assert=require('assert');
const source=JSON.parse(fs.readFileSync(__dirname+'/../tools/text-door/workflow-source.json','utf8'));
const html=source.WFWorkflowActions.find(x=>x.WFWorkflowActionIdentifier==='is.workflow.actions.gettext').WFWorkflowActionParameters.WFTextActionText;
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script); let checks=1;
function fn(name){const start=script.indexOf('function '+name+'(');assert(start>=0);const end=script.indexOf('\n}',start)+2;return script.slice(start,end);}
const context={TextDecoder,Uint8Array,atob,Intl,Set,Array,JSON, document:{querySelectorAll:()=>[]}};
vm.createContext(context);
vm.runInContext(['decodeInput','preserveText','sanitizeText','segment','getSelectedText','getOutputText','buildPayload','getTextForEdit','backToSelectMode','doCopy'].map(fn).join('\n'),context);
const cases=['双引号"反斜杠\\\n第二行', '</script><script>alert("x")</script>', '验证码\n123456\n19:30\nAI\n¥99.00', '👨‍👩‍👧‍👦 🇨🇳 👍🏽 e\u0301', 'https://example.com/?q=a&b=1 你好', '正常中文\r\n第二行', '\u2028\u2029', ''];
for(const text of cases){
 assert.equal(context.decodeInput(Buffer.from(text).toString('base64')),text);
 assert.equal(context.segment(text).join(''),text);
 assert.equal(context.sanitizeText(text),text.replace(/\r\n?/g,'\n'));
 const injected=script.replace('__TEXT_DOOR_INPUT_BASE64__',Buffer.from(text).toString('base64'));
 new vm.Script(injected); checks+=4;
}
for(const emoji of ['👨‍👩‍👧‍👦','🇨🇳','👍🏽','e\u0301']) {assert.equal(context.segment(emoji).length,1);checks++;}
context.isEditMode=false;context.editedText=null;context.segments=['测','试'];context.baseSelected=new Set([0,1]);
let payload=JSON.parse(context.buildPayload());assert.equal(payload.text,'测试');assert.equal(payload.source,'text-door-v2');assert.deepEqual(payload.platforms,[]);checks+=3;
context.document.querySelectorAll=()=>[{dataset:{platform:'谷歌'}},{dataset:{platform:'备忘录'}}];
payload=JSON.parse(context.buildPayload());assert.deepEqual(payload.platforms,['谷歌','备忘录']);checks++;
// Edit -> return preserves changed text and reselects it.
context.isEditMode=true;context.searchTextarea={value:'编辑后 "123" 👨‍👩‍👧‍👦',style:{display:'block'}};
context.preEditText='测试';context.rawText='测试';context.savedSelection=new Set([0,1]);
context.searchText={style:{}};context.document.body={classList:{remove(){}}};
for(const name of ['renderWords','renderSelection','updateSearchText','doCopy','mountCopyStatusForSelect','refreshCopyHintUI'])context[name]=()=>{};
context.backToSelectMode();assert.equal(context.rawText,'编辑后 "123" 👨‍👩‍👧‍👦');assert.equal(context.getSelectedText(),context.rawText);checks+=2;
// Empty selection invalidates previous committed payload.
vm.runInContext(fn('doCopy'),context); context.getOutputText=()=>null;let copied;
context.syncClipboard=x=>{copied=x;return true};context.clearPending=()=>{};
context.doCopy();assert.equal(copied,'TEXT_DOOR_V2_PENDING');checks++;
// Original text is no longer implicitly cleaned.
assert(!script.includes('rawText = prepareSharedText(rawText)'));checks++;
const long='中文测试 👨‍👩‍👧‍👦 https://example.com/ 123 '.repeat(600);
const before=Date.now();assert.equal(context.segment(long).join(''),long);checks++;
console.log(JSON.stringify({passed:checks,longTextChars:long.length,longTextSegmentationMs:Date.now()-before,scope:'Node V8 syntax and pure/state logic; no iOS runtime, DOM layout or clipboard permissions tested'},null,2));
