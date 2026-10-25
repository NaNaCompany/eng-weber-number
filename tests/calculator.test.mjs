import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluate,constants} from '../engine.js';
import {units,fromSI,toSI} from '../units.js';

const tool=JSON.parse(fs.readFileSync(new URL('../tool.json',import.meta.url),'utf8'));
const reference=JSON.parse(fs.readFileSync(new URL('./reference.json',import.meta.url),'utf8'));
const firstUnit=field=>units[field.dimension][0].id;
const quantity=(field,value,unit=firstUnit(field))=>({value:String(value),unit});
function raw(overrides={}){
 const values=Object.fromEntries(tool.fields.map(field=>[field.key,quantity(field,field.example)]));
 for(const group of tool.groups||[]){
  const rows=Object.hasOwn(overrides,group.key)?overrides[group.key]:group.examples;
  values[group.key]=rows.map(row=>Object.fromEntries(group.fields.map(field=>[field.key,quantity(field,row[field.key])])));
 }
 for(const field of tool.fields)if(Object.hasOwn(overrides,field.key))values[field.key]=quantity(field,overrides[field.key]);
 return values;
}
const run=(values=raw(),confirmed=true)=>evaluate(tool,values,confirmed);
function close(actual,expected){
 assert.ok(Number.isFinite(actual)&&Number.isFinite(expected),`${tool.id}: finite values required`);
 assert.ok(Math.abs(actual-expected)<=Math.max(Math.abs(expected)*2e-12,Number.MIN_VALUE*20),`${tool.id}: ${actual} != ${expected}`);
}
function leaves(){
 const result=tool.fields.map(field=>({field,path:[field.key],si:field.example}));
 for(const group of tool.groups||[])for(let row=0;row<group.examples.length;row++)for(const field of group.fields)result.push({field,path:[group.key,row,field.key],si:group.examples[row][field.key]});
 return result;
}
function set(values,path,value){let target=values;for(const key of path.slice(0,-1))target=target[key];target[path.at(-1)]=value;return values;}
function modified(leaf,value,unit=firstUnit(leaf.field)){return set(raw(),leaf.path,quantity(leaf.field,value,unit));}

test('independent high precision reference example matches the original SI model',()=>{
 assert.equal(reference.id,tool.id);assert.ok(reference.method.trim());assert.ok(reference.cases.length>=4);
 const result=run();assert.equal(result.kind,'number');close(result.value,reference.value);
});
test('every scalar and repeated input unit preserves the physical result',()=>{
 assert.ok(leaves().length);
 for(const leaf of leaves())for(const unit of units[leaf.field.dimension]){
  const values=modified(leaf,fromSI(leaf.si,leaf.field.dimension,unit.id),unit.id);
  const result=run(values);assert.equal(result.kind,'number');close(result.value,reference.value);
 }
});
test('every supported result unit round trips through SI',()=>{
 for(const unit of units[tool.result_dimension])close(toSI(String(fromSI(reference.value,tool.result_dimension,unit.id)),tool.result_dimension,unit.id),reference.value);
});
test('empty malformed nonfinite and silently underflowed numbers are rejected',()=>{
 for(const leaf of leaves())for(const value of ['', ' ', 'NaN', 'Infinity', '0x10', '1,000', '2foo', '1e999', '1e-999'])assert.throws(()=>run(modified(leaf,value)),leaf.path.join('.'));
});
test('all scalar and repeated field constraints are enforced after SI conversion',()=>{
 const invalid={positive:[0,-1],nonnegative:[-1],nonzero:[0],integer:[0,-1,1.5,9007199254740992],nonnegativeInteger:[-1,.5,9007199254740992],unitInterval:[-1,1.01],openInterval:[0,1,-1],quarterTurn:[-.01,1.58]};
 for(const leaf of leaves()){
  assert.ok(['signed',...Object.keys(invalid)].includes(leaf.field.constraint),'Unknown constraint '+leaf.field.constraint);
  for(const value of invalid[leaf.field.constraint]||[])assert.throws(()=>run(modified(leaf,value)),leaf.path.join('.'));
 }
});
test('unknown input units and missing individual quantities are rejected',()=>{
 for(const leaf of leaves()){
  assert.throws(()=>run(modified(leaf,leaf.si,'__unknown_unit__')));
  assert.throws(()=>run(set(raw(),leaf.path,undefined)));
  assert.throws(()=>run(set(raw(),leaf.path,null)));
 }
});
test('absolute temperatures and temperature differences use distinct conversions',()=>{
 close(toSI('0','temperature','C'),273.15);close(toSI('32','temperature','F'),273.15);
 close(toSI('18','deltaT','Fdiff'),10);close(toSI('0','deltaT','Cdiff'),0);
 for(const leaf of leaves().filter(item=>item.field.dimension==='temperature'&&item.field.constraint==='positive'))assert.throws(()=>run(modified(leaf,-273.15,'C')));
});
test('explicit model condition confirmation is required exactly when declared',()=>{
 if(tool.condition)assert.throws(()=>run(raw(),false));
 else{const result=run(raw(),false);assert.equal(result.kind,'number');close(result.value,reference.value);}
});
test('repeated groups enforce row bounds and complete row objects',()=>{
 for(const group of tool.groups||[]){
  for(const rows of [undefined,null,{},[],Array.from({length:(group.maxRows||100)+1},()=>raw()[group.key][0])]){const values=raw();values[group.key]=rows;assert.throws(()=>run(values));}
  if((group.minRows||1)>1){const values=raw();values[group.key]=values[group.key].slice(0,group.minRows-1);assert.throws(()=>run(values));}
  const values=raw();values[group.key][0]=undefined;assert.throws(()=>run(values));
 }
 if(!(tool.groups||[]).length){const values=raw();delete values[tool.fields[0].key];assert.throws(()=>run(values));}
});
test('extreme representable inputs return finite quantities or explicit model errors',()=>{
 for(const leaf of leaves()){
  const values=modified(leaf,1e308);
  let result;
  try{result=run(values);}
  catch(error){assert.ok(error instanceof Error&&error.message.trim());continue;}
  assert.ok(result.kind==='number'||result.kind==='no-result');
  if(result.kind==='number')assert.ok(Number.isFinite(result.value));else assert.ok(result.message.trim());
 }
});
test('invalid model identifiers and absent input objects fail explicitly',()=>{
 assert.throws(()=>evaluate(tool,null,true));assert.throws(()=>evaluate(tool,undefined,true));
 for(const id of ['E000','E100','E161','E999','E101x'])assert.throws(()=>evaluate({...tool,id},raw(),true));
});
test('four publisher tags original asset files and the exact More Apps link exist',()=>{
 const text=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const value of ['GTM-NV2WWQXB','G-2ZYSF0173P','ca-pub-9767176956440077','cloudflareinsights.com/beacon.min.js','More Apps','https://nanalab.kr/apps/','https://nanalab.kr/'+tool.slug+'/'])assert.ok(text.includes(value),value);
 for(const name of ['og.png','icon.svg','LICENSE','SOURCES.md'])assert.ok(fs.existsSync(new URL('../'+name,import.meta.url)),name);
 assert.equal(constants.G,6.67430e-11);assert.equal(constants.c,299792458);assert.equal(constants.h,6.62607015e-34);assert.equal(constants.kB,1.380649e-23);assert.equal(constants.e,1.602176634e-19);
});

for(const entry of reference.cases){
 test('independent physical boundary: '+entry.name,()=>{
  if(entry.throws){assert.throws(()=>run(raw(entry.values||{})));return;}
  const result=run(raw(entry.values||{}));
  if(entry.kind){assert.equal(result.kind,entry.kind);assert.ok(typeof result.message==='string'&&result.message.trim());return;}
  assert.equal(result.kind,'number');close(result.value,entry.expected);
 });
}
