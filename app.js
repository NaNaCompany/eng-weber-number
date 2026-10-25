/* Original browser UI for scalar and repeated engineering inputs. */
import {units,fromSI,toSI,unitFor} from './units.js';
import {evaluate} from './engine.js';
const {tool,messages,numberLocale}=await import(new URL(document.documentElement.dataset.config,import.meta.url));
const ordered=Object.entries(messages).sort((a,b)=>b[0].length-a[0].length);
function tr(text){for(const [source,target] of ordered)text=String(text).replaceAll(source,target);return text;}
const form=document.getElementById('calculator'),result=document.getElementById('result'),valueNode=document.getElementById('result-value'),status=document.getElementById('status'),outputUnit=document.getElementById('output-unit'),outputLabel=document.getElementById('output-unit-label');
const scalarFields=tool.fields||[],groupFields=tool.groups||[];
// IDs avoid HTMLFormControlsCollection native-name collisions, such as `length`.
const scalarInput=key=>document.getElementById('field-'+key),scalarUnit=key=>document.getElementById('unit-'+key),conditions=document.getElementById('conditions');
let last=null,rowSequence=0;
const formatter=new Intl.NumberFormat(numberLocale,{maximumSignificantDigits:9});
const decimal=new Intl.NumberFormat(numberLocale).formatToParts(1.5).find(p=>p.type==='decimal')?.value||'.';
const constraintNotes={positive:'SI 변환 후 0보다 큰 값',nonnegative:'0 이상',signed:'음수·0·양수 가능',nonzero:'0 이외의 값',integer:'양의 정수',nonnegativeInteger:'0 이상의 정수',unitInterval:'비율 0~1',openInterval:'비율 0 초과 1 미만',quarterTurn:'각도 0~90°'};
function numberText(value){const a=Math.abs(value);return a!==0&&(a<1e-4||a>=1e9)?value.toExponential(8).replace(/\.?0+e/,'e').replace('.',decimal):formatter.format(value);}
function numericInput(value){const s=String(value).trim().replaceAll('−','-');return ['es','de'].includes(tool.locale)&&/^[+-]?(?:\d+,\d*|,\d+)(?:e[+-]?\d+)?$/i.test(s)?s.replace(',','.'):s;}
function clearFieldErrors(){form.querySelectorAll('[aria-invalid]').forEach(node=>node.removeAttribute('aria-invalid'));form.querySelectorAll('[data-field-error]').forEach(node=>node.textContent='');}
function clearResult(message=tr('입력 후 계산하기를 누르세요.')){last=null;result.removeAttribute('data-value-si');valueNode.textContent='—';outputLabel.textContent='';status.textContent=message;status.className='status';clearFieldErrors();}
function show(){
 if(!last)return;
 if(last.kind!=='number'){valueNode.textContent=tr('결과 없음');outputLabel.textContent='';status.textContent=tr(last.message);status.className='status notice';result.removeAttribute('data-value-si');return;}
 try{
  const shown=fromSI(last.value,tool.result_dimension,outputUnit.value);
  valueNode.textContent=numberText(shown);outputLabel.textContent=tr(unitFor(tool.result_dimension,outputUnit.value).label);
  result.dataset.valueSi=String(last.value);status.textContent=tr('계산 완료 · ').trim()+' '+tool.result_label;status.className='status success';
 }catch(e){valueNode.textContent=tr('표시 범위 초과');result.removeAttribute('data-value-si');outputLabel.textContent='';status.textContent=tr(e.message);status.className='status error';}
}
function node(tag,className,text){const value=document.createElement(tag);if(className)value.className=className;if(text!==undefined)value.textContent=text;return value;}
function limits(group){return {min:Math.max(1,Number(group.minRows)||1),max:Math.min(100,Number(group.maxRows)||100)};}
function groupRoot(group){return [...form.querySelectorAll('[data-group]')].find(root=>root.dataset.group===group.key);}
function groupRows(root){return [...root.querySelector('[data-group-rows]').children].filter(row=>row.hasAttribute('data-group-row'));}
function updateGroup(group,root){
 const rows=groupRows(root),bound=limits(group);
 rows.forEach((row,index)=>{row.querySelector('[data-row-label]').textContent=tr('항목')+' '+(index+1);const remove=row.querySelector('[data-group-remove]');remove.disabled=rows.length<=bound.min;remove.setAttribute('aria-label',tr('삭제')+' '+group.label+' '+(index+1));});
 root.querySelector('[data-group-add]').disabled=rows.length>=bound.max;
 root.querySelector('[data-group-count]').textContent=tr('항목 수: ')+rows.length;
}
function makeRow(group,example={}){
 const row=node('div','group-row');row.dataset.groupRow='';const head=node('div','group-row-heading');const title=node('strong');title.dataset.rowLabel='';head.append(title);const remove=node('button','group-remove',tr('삭제'));remove.type='button';remove.dataset.groupRemove='';head.append(remove);row.append(head);const columns=node('div','group-columns');row.append(columns);
 const serial=++rowSequence;
 for(const field of group.fields){
  const id='group-'+group.key+'-dynamic-'+serial+'-'+field.key,cell=node('div','group-field'),label=node('label','',field.label);label.htmlFor=id;cell.append(label);const pair=node('div','input-pair');const input=node('input');Object.assign(input,{id,name:id,type:'text',inputMode:'decimal',required:true,autocomplete:'off',spellcheck:false});input.dataset.groupField=field.key;input.setAttribute('aria-describedby',id+'-note '+id+'-error');const select=node('select');Object.assign(select,{id:id+'-unit',name:id+'-unit'});select.dataset.groupUnit=field.key;select.setAttribute('aria-label',field.label+tr(' 단위'));const choices=units[field.dimension],selected=field.display_unit||choices[0].id;
  for(const unit of choices){const option=node('option','',tr(unit.label));option.value=unit.id;select.append(option);}select.value=selected;
  if(Object.hasOwn(example,field.key)){const value=fromSI(example[field.key],field.dimension,selected);input.value=String(value);}
  pair.append(input,select);cell.append(pair);const note=node('p','field-note',tr(field.constraint_note||constraintNotes[field.constraint]||''));note.id=id+'-note';cell.append(note);const error=node('p','group-field-error');error.id=id+'-error';error.dataset.fieldError=field.key;error.setAttribute('role','alert');cell.append(error);columns.append(cell);
 }
 return row;
}
function setGroupRows(group,root,examples){const bound=limits(group),count=Math.max(bound.min,Math.min(bound.max,examples.length));const list=root.querySelector('[data-group-rows]');list.replaceChildren(...Array.from({length:count},(_,index)=>makeRow(group,examples[index]||{})));updateGroup(group,root);}
for(const group of groupFields){
 const root=groupRoot(group);if(!root)throw Error('Missing repeated-input group: '+group.key);
 updateGroup(group,root);
 root.addEventListener('click',event=>{
  const add=event.target.closest('[data-group-add]'),remove=event.target.closest('[data-group-remove]');if(!add&&!remove)return;
  const rows=groupRows(root),bound=limits(group);
  if(add){if(rows.length>=bound.max){clearResult(tr('항목 수가 최대값에 도달했습니다.'));return;}const row=makeRow(group);root.querySelector('[data-group-rows]').append(row);updateGroup(group,root);clearResult(tr('항목을 추가했습니다.'));row.querySelector('input').focus();}
  else {if(rows.length<=bound.min){clearResult(tr('최소 항목 수를 유지해야 합니다.'));return;}const row=remove.closest('[data-group-row]'),index=rows.indexOf(row);row.remove();updateGroup(group,root);clearResult(tr('항목을 삭제했습니다.'));const remaining=groupRows(root);remaining[Math.min(index,remaining.length-1)].querySelector('input').focus();}
 });
}
function errorSlot(input,key){
 let slot=input.closest('.group-field')?.querySelector('[data-field-error]');
 if(!slot){const parent=input.closest('.row')||input.parentElement;slot=parent.querySelector('[data-field-error]');if(!slot){slot=node('p','group-field-error');slot.dataset.fieldError=key;slot.id=input.id+'-error';slot.setAttribute('role','alert');parent.append(slot);input.setAttribute('aria-describedby',((input.getAttribute('aria-describedby')||'')+' '+slot.id).trim());}}
 return slot;
}
function readField(field,input,select,errors){
 const raw={value:numericInput(input.value),unit:select.value};
 try{toSI(raw.value,field.dimension,raw.unit);}catch(error){input.setAttribute('aria-invalid','true');errorSlot(input,field.key).textContent=tr(error.message);errors.push({input,error});}
 return raw;
}
function readInputs(){
 const raw={},errors=[];
 for(const field of scalarFields)raw[field.key]=readField(field,scalarInput(field.key),scalarUnit(field.key),errors);
 for(const group of groupFields){const root=groupRoot(group),rows=groupRows(root),bound=limits(group);if(rows.length<bound.min||rows.length>bound.max)throw Error('항목 수는 허용 범위 안이어야 합니다.');raw[group.key]=rows.map(row=>Object.fromEntries(group.fields.map(field=>[field.key,readField(field,row.querySelector('[data-group-field="'+field.key+'"]'),row.querySelector('[data-group-unit="'+field.key+'"]'),errors)])));}
 if(errors.length){errors[0].input.focus();throw errors[0].error;}
 return raw;
}
form.addEventListener('submit',event=>{event.preventDefault();clearResult();try{last=evaluate(tool,readInputs(),Boolean(conditions?.checked));show();}catch(e){status.textContent=tr(e.message);status.className='status error';}});
form.addEventListener('input',()=>clearResult(tr('입력이 변경되었습니다. 다시 계산하세요.')));
form.addEventListener('change',()=>clearResult(tr('입력이 변경되었습니다. 다시 계산하세요.')));
outputUnit.addEventListener('change',show);
document.getElementById('example').addEventListener('click',()=>{
 for(const field of scalarFields){scalarInput(field.key).value=field.display_value;scalarUnit(field.key).value=field.display_unit;}
 for(const group of groupFields)setGroupRows(group,groupRoot(group),group.examples||[]);
 if(conditions)conditions.checked=false;
 clearResult(tr(tool.condition?'예제를 넣었습니다. 적용 조건을 확인한 뒤 계산하세요.':'예제를 넣었습니다. 계산하기를 누르세요.'));
});
document.getElementById('reset').addEventListener('click',()=>{for(const field of scalarFields)scalarInput(field.key).value='';for(const group of groupFields)setGroupRows(group,groupRoot(group),[]);if(conditions)conditions.checked=false;clearResult();form.querySelector('input:not([type="checkbox"])')?.focus();});
document.getElementById('copy-result').addEventListener('click',async()=>{if(!last||last.kind!=='number'||!result.hasAttribute('data-value-si')){status.textContent=tr('먼저 유효한 계산을 완료하세요.');return;}try{await navigator.clipboard.writeText(tool.result_label+': '+valueNode.textContent+' '+outputLabel.textContent);status.textContent=tr('결과를 복사했습니다.');}catch{status.textContent=tr('복사하지 못했습니다. 표시된 결과를 선택해 복사하세요.');}});
document.querySelectorAll('[data-language]').forEach(a=>a.addEventListener('click',()=>{try{localStorage.setItem(tool.slug+'-language',a.dataset.language);}catch{}}));
document.documentElement.classList.add('app-ready');
