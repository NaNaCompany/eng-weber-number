import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluate} from '../engine.js';
import {units} from '../units.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const languages=['ko','en','es','zh','ja','de'];
const codes={ko:'ko',en:'en',es:'es',zh:'zh-CN',ja:'ja',de:'de'};
const original=JSON.parse(fs.readFileSync(path.join(root,'tool.json'),'utf8'));
const reference=JSON.parse(fs.readFileSync(new URL('./reference.json',import.meta.url),'utf8'));
const config=Object.fromEntries(await Promise.all(languages.map(async lang=>[lang,await import('../locales/'+lang+'.js')])));
const html=lang=>fs.readFileSync(path.join(root,lang==='ko'?'index.html':lang+'/index.html'),'utf8');
const expectedUrl=lang=>original.site+(lang==='ko'?'':lang+'/');
test('all six static pages have reciprocal hreflang and their own canonical',()=>{
 for(const lang of languages){const text=html(lang);assert.ok(text.includes('<html lang="'+codes[lang]+'"'));assert.ok(text.includes('<link rel="canonical" href="'+expectedUrl(lang)+'">'));for(const target of languages)assert.ok(text.includes('hreflang="'+codes[target]+'" href="'+expectedUrl(target)+'"'));assert.ok(text.includes('hreflang="x-default" href="'+original.site+'"'));}
});
test('localized metadata and JSON-LD match the visible application',()=>{
 for(const lang of languages){const text=html(lang),{tool}=config[lang];const schema=JSON.parse(text.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(schema.inLanguage,codes[lang]);assert.equal(schema.name,tool.title);assert.equal(schema.url,expectedUrl(lang));assert.ok(text.includes('<h1>'+tool.title.replaceAll('&','&amp;').replaceAll("'",'&#x27;')+'</h1>'));assert.ok(text.includes('property="og:locale"'));assert.ok(text.includes('name="twitter:description"'));}
});
test('all six configurations preserve physical quantities and independent reference values',()=>{
 for(const lang of languages){const {tool}=config[lang];assert.equal(tool.id,original.id);assert.equal(tool.formula,original.formula);assert.equal(tool.result_dimension,original.result_dimension);for(let i=0;i<tool.fields.length;i++){const a={...tool.fields[i]},b={...original.fields[i]};delete a.label;delete b.label;assert.deepEqual(a,b);}const raw=Object.fromEntries(tool.fields.map(f=>[f.key,{value:String(f.example),unit:units[f.dimension][0].id}]));for(let i=0;i<(tool.groups||[]).length;i++){const group=tool.groups[i],source=original.groups[i];assert.equal(group.key,source.key);assert.equal(group.minRows,source.minRows);assert.equal(group.maxRows,source.maxRows);assert.deepEqual(group.examples,source.examples);for(let j=0;j<group.fields.length;j++){const a={...group.fields[j]},b={...source.fields[j]};delete a.label;delete b.label;assert.deepEqual(a,b);}raw[group.key]=group.examples.map(row=>Object.fromEntries(group.fields.map(f=>[f.key,{value:String(row[f.key]),unit:units[f.dimension][0].id}])));}const result=evaluate(tool,raw,true);assert.ok(Math.abs(result.value-reference.value)<=Math.max(Math.abs(reference.value)*2e-12,Number.MIN_VALUE*20));}
});
test('non-Korean pages do not fall back to Korean UI, field labels or assumptions',()=>{
 for(const lang of languages.filter(l=>l!=='ko')){const text=html(lang).replace(/<nav class="language-links".*?<\/nav>/s,'');assert.doesNotMatch(text,/[가-힣]/);const {tool,messages}=config[lang];for(const value of [tool.title,tool.purpose,tool.assumptions,tool.result_label,...tool.fields.map(f=>f.label),...(tool.groups||[]).flatMap(g=>[g.label,...g.fields.map(f=>f.label)]),...Object.values(messages)]){assert.ok(value.trim());assert.doesNotMatch(value,/[가-힣]/);}}
});
test('every locale keeps publisher integrations and the exact More Apps target',()=>{
 for(const lang of languages){const text=html(lang);for(const value of ['GTM-NV2WWQXB','G-2ZYSF0173P','ca-pub-9767176956440077','cloudflareinsights.com/beacon.min.js'])assert.ok(text.includes(value));assert.match(text,/<a class="more-apps" href="https:\/\/nanalab.kr\/apps\/">More Apps<\/a>/);assert.equal((text.match(/data-language=/g)||[]).length,6);assert.equal((text.match(/aria-current="page"/g)||[]).length,1);}
});
test('relative runtime, style, icon and source links resolve in every language directory',()=>{
 for(const lang of languages){const base=lang==='ko'?root:path.join(root,lang);for(const [,attribute,url] of html(lang).matchAll(/\b(src|href)="([^"]+)"/g)){if(/^(https?:|#)/.test(url))continue;const target=path.resolve(base,url),relative=path.relative(root,target);assert.ok(!relative.startsWith('..')&&!path.isAbsolute(relative),url);assert.ok(fs.existsSync(target),url);}assert.ok(fs.existsSync(path.join(base,'og.png')));}
});
test('sitemap lists exactly six languages with matching reciprocal alternatives',()=>{
 const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');assert.equal((xml.match(/<loc>/g)||[]).length,6);for(const lang of languages)assert.ok(xml.includes('<loc>'+expectedUrl(lang)+'</loc>'));assert.equal((xml.match(/hreflang="x-default"/g)||[]).length,6);
});
test('all runtime validation and unit messages have static translations',()=>{
 const files=fs.readdirSync(root).filter(name=>['engine.js','units.js','math.js','app.js'].includes(name)||/^models-.*\.js$/.test(name));const phrases=files.flatMap(name=>[...fs.readFileSync(path.join(root,name),'utf8').matchAll(/(['"])((?:(?!\1)[^\n])*?[가-힣](?:(?!\1)[^\n])*?)\1/g)].map(m=>m[2]));for(const lang of languages)for(const phrase of phrases)assert.ok(Object.hasOwn(config[lang].messages,phrase),lang+': '+phrase);
});
