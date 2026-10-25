/* Original validated SI dispatcher for E101-E160; no external solver. */
import {toSI} from './units.js';
import {evaluateModel as a} from './models-101-110.js';
import {evaluateModel as b} from './models-111-120.js';
import {evaluateModel as c} from './models-121-130.js';
import {evaluateModel as d} from './models-131-140.js';
import {evaluateModel as e} from './models-141-150.js';
import {evaluateModel as f} from './models-151-160.js';
export const constants=Object.freeze({G:6.67430e-11,R:8.31446261815324,kB:1.380649e-23,h:6.62607015e-34,hbar:6.62607015e-34/(2*Math.PI),c:299792458,e:1.602176634e-19,NA:6.02214076e23,F:96485.33212331002,epsilon0:8.8541878188e-12,mu0:1.25663706127e-6,u:1.66053906892e-27,g0:9.80665});
const hints={positive:'0보다 커야 합니다.',nonnegative:'0 이상이어야 합니다.',nonzero:'0일 수 없습니다.',integer:'양의 안전한 정수여야 합니다.',nonnegativeInteger:'0 이상의 안전한 정수여야 합니다.',unitInterval:'0~1 범위여야 합니다.',openInterval:'0보다 크고 1보다 작아야 합니다.',quarterTurn:'각도는 0~90° 범위여야 합니다.'};
function parse(field,raw,prefix=''){
 const label=prefix+field.label;
 if(!raw||typeof raw!=='object')throw Error(label+': 값이 필요합니다.');
 let value;
 try{value=toSI(raw.value,field.dimension,raw.unit);}catch(error){throw Error(label+': '+error.message);}
 const rule=field.constraint;
 const valid=rule==='positive'?value>0:rule==='nonnegative'?value>=0:rule==='nonzero'?value!==0:rule==='integer'?Number.isSafeInteger(value)&&value>0:rule==='nonnegativeInteger'?Number.isSafeInteger(value)&&value>=0:rule==='unitInterval'?value>=0&&value<=1:rule==='openInterval'?value>0&&value<1:rule==='quarterTurn'?value>=0&&value<=Math.PI/2:rule==='signed';
 if(!valid)throw Error(label+': '+(hints[rule]||'입력 조건을 확인하세요.'));
 return value;
}
export function evaluate(tool,raw,confirmed=false){
 if(!raw||typeof raw!=='object')throw Error('입력값이 필요합니다.');
 const x={};
 for(const field of tool.fields)x[field.key]=parse(field,raw[field.key]);
 for(const group of tool.groups||[]){
  const rows=raw[group.key];
  if(!Array.isArray(rows)||rows.length<(group.minRows||1)||rows.length>(group.maxRows||100))throw Error(group.label+': 항목 수가 허용 범위를 벗어났습니다.');
  x[group.key]=rows.map((row,i)=>Object.fromEntries(group.fields.map(field=>[field.key,parse(field,row?.[field.key],group.label+' '+(i+1)+' · ')])));
 }
 if(tool.condition&&!confirmed)throw Error('적용 조건 확인란에 체크하세요.');
 const number=Number(tool.id.slice(1));
 if(!/^E\d{3}$/.test(tool.id)||number<101||number>160)throw Error('계산 모델을 찾을 수 없습니다.');
 const model=[a,b,c,d,e,f][Math.floor((number-101)/10)];
 const result=model(tool.id,x,constants);
 if(result&&typeof result==='object'){
  if(result.kind==='no-result'&&typeof result.message==='string')return result;
  throw Error('계산 결과 형식이 올바르지 않습니다.');
 }
 if(!Number.isFinite(result))throw Error('계산값이 브라우저 수치 표현 범위를 벗어났습니다. 입력 크기와 단위를 확인하세요.');
 return {kind:'number',value:Object.is(result,-0)?0:result};
}
