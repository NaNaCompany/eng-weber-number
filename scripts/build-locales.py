"""Build crawlable localized HTML and runtime configuration from reviewed JSON.

Python standard library only. No network access or translation service is used.
Run from the repository root: python scripts/build-locales.py [--check]
"""
import argparse,copy,html,json,pathlib,re,sys
import xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
LANGUAGES=['ko','en','es','zh','ja','de']
NAMES={'ko':'한국어','en':'English','es':'Español','zh':'简体中文','ja':'日本語','de':'Deutsch'}
CODES={'ko':'ko','en':'en','es':'es','zh':'zh-CN','ja':'ja','de':'de'}
OG={'ko':'ko_KR','en':'en_US','es':'es_ES','zh':'zh_CN','ja':'ja_JP','de':'de_DE'}
def esc(value):return html.escape(str(value),quote=True)
def source():return json.loads((ROOT/'tool.json').read_text(encoding='utf-8'))
def localized(tool,data):
    result=copy.deepcopy(tool)
    for key in ['title','purpose','result_label','assumptions','condition','category']:result[key]=data[key]
    assert len(data['field_labels'])==len(tool['fields'])
    for field,label in zip(result['fields'],data['field_labels']):field['label']=label
    for group in result.get('groups',[]):
        key=group['key'];group['label']=data['group_labels'][key]
        labels=data['group_field_labels'][key]
        assert len(labels)==len(group['fields'])
        for field,label in zip(group['fields'],labels):field['label']=label
    result['locale']=data['locale']
    return result
def translated(text,messages):
    # One pass avoids translating generated text again, notably short unit labels.
    keys=sorted(messages,key=len,reverse=True)
    return re.sub('|'.join(re.escape(k) for k in keys),lambda m:messages[m.group()],text)
def render(tool,data):
    lang=data['locale'];prefix='' if lang=='ko' else '../';url=tool['site']+('' if lang=='ko' else lang+'/')
    text=(ROOT/'src/template.html').read_text(encoding='utf-8')
    messages={esc(k):esc(v) for k,v in data['messages'].items()}
    for key in ['title','purpose','result_label','assumptions','condition','category']:
        if tool[key]:messages[esc(tool[key])]=esc(data[key])
    for old,new in zip(tool['fields'],data['field_labels']):messages[esc(old['label'])]=esc(new)
    for group in tool.get('groups',[]):
        key=group['key'];messages[esc(group['label'])]=esc(data['group_labels'][key])
        for old,new in zip(group['fields'],data['group_field_labels'][key]):messages[esc(old['label'])]=esc(new)
    text=translated(text,messages)
    text=re.sub(r'<html lang="[^"]*">',f'<html lang="{CODES[lang]}" data-config="locales/{lang}.js">',text,count=1)
    text=re.sub(r'<title>.*?</title>',f'<title>{esc(data["title"])} · {esc(data["messages"]["단위 변환과 공식"])} | NaNa Lab</title>',text,count=1)
    description=data['purpose']+' '+data['messages']['입력 단위를 선택하고 조건에 맞는 한 값을 구하세요.']
    text=re.sub(r'<meta name="description" content="[^"]*">',f'<meta name="description" content="{esc(description)}">',text,count=1)
    text=re.sub(r'<h1>.*?</h1>',f'<h1>{esc(data["title"])}</h1>',text,count=1)
    text=re.sub(r'<p class="intro">.*?</p>',f'<p class="intro">{esc(description)}</p>',text,count=1)
    text=re.sub(r'<link rel="canonical" href="[^"]*">',f'<link rel="canonical" href="{url}">',text,count=1)
    for prop,value in [('locale',OG[lang]),('title',data['title']),('description',description),('url',url),('image',url+'og.png')]:
        text=re.sub(r'<meta property="og:'+prop+r'" content="[^"]*">',f'<meta property="og:{prop}" content="{esc(value)}">',text,count=1)
    schema={'@context':'https://schema.org','@type':'WebApplication','name':data['title'],'url':url,'description':description,'applicationCategory':'EducationalApplication','operatingSystem':'Any','inLanguage':CODES[lang],'isAccessibleForFree':True,'author':{'@type':'Organization','name':'NaNa Lab','url':'https://nanalab.kr/'}}
    text=re.sub(r'<script type="application/ld\+json">.*?</script>',lambda _: '<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>',text,count=1,flags=re.S)
    for file in ['style.css','icon.svg','app.js','SOURCES.md']:text=text.replace('"'+file+'"','"'+prefix+file+'"')
    alternates=''.join(f'<link rel="alternate" hreflang="{CODES[x]}" href="{tool["site"]+("" if x=="ko" else x+"/")}">' for x in LANGUAGES)
    alternates+=f'<link rel="alternate" hreflang="x-default" href="{tool["site"]}">'
    text=text.replace('</head>',alternates+f'<meta name="twitter:title" content="{esc(data["title"])}"><meta name="twitter:description" content="{esc(description)}"><meta name="twitter:image" content="{url}og.png"></head>')
    links=''.join(f'<a data-language="{x}" lang="{CODES[x]}" hreflang="{CODES[x]}" href="{prefix+("./" if x=="ko" else x+"/")}"'+(' aria-current="page"' if x==lang else '')+f'>{NAMES[x]}</a>' for x in LANGUAGES)
    text=text.replace('</header>','</header><nav class="language-links" aria-label="'+esc(data['messages']['Language'])+'">'+links+'</nav>',1)
    # Clarify comma decimals in locales that use them. Group separators are never accepted.
    if lang in ('es','de'):
        note={'es':'Puede usar punto o coma decimal. No use separadores de miles.','de':'Dezimalpunkt oder Dezimalkomma sind möglich. Keine Tausendertrennzeichen verwenden.'}[lang]
        text=text.replace('</form><p class="local-note">','</form><p class="local-note">'+note+' ',1)
    return text
def artifacts():
    tool=source();result={};locales={}
    for lang in LANGUAGES:
        data=json.loads((ROOT/'localization'/f'{lang}.json').read_text(encoding='utf-8'))
        assert data['locale']==lang
        localized_tool=localized(tool,data)
        locales[lang]=localized_tool
        path='index.html' if lang=='ko' else lang+'/index.html'
        result[path]=render(tool,data)
        result[f'locales/{lang}.js']='export const tool='+json.dumps(localized_tool,ensure_ascii=False,separators=(',',':'))+';\nexport const messages='+json.dumps(data['messages'],ensure_ascii=False,separators=(',',':'))+';\nexport const numberLocale='+json.dumps(data['numberLocale'])+';\n'
    ET.register_namespace('','http://www.sitemaps.org/schemas/sitemap/0.9');ET.register_namespace('xhtml','http://www.w3.org/1999/xhtml')
    ns='{http://www.sitemaps.org/schemas/sitemap/0.9}';xhtml='{http://www.w3.org/1999/xhtml}'
    tree=ET.Element(ns+'urlset')
    for lang in LANGUAGES:
        node=ET.SubElement(tree,ns+'url');ET.SubElement(node,ns+'loc').text=tool['site']+('' if lang=='ko' else lang+'/')
        for code in LANGUAGES+['x-default']:
            target='ko' if code=='x-default' else code
            ET.SubElement(node,xhtml+'link',{'rel':'alternate','hreflang':'x-default' if code=='x-default' else CODES[code],'href':tool['site']+('' if target=='ko' else target+'/')})
    ET.indent(tree)
    result['sitemap.xml']='<?xml version="1.0" encoding="utf-8"?>\n'+ET.tostring(tree,encoding='unicode')+'\n'
    return result
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();stale=[]
    for name,content in artifacts().items():
        path=ROOT/name
        if args.check:
            if not path.exists() or path.read_text(encoding='utf-8')!=content:stale.append(name)
        else:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(content,encoding='utf-8',newline='\n')
    if stale:raise SystemExit('Stale generated files: '+', '.join(stale))
    print(('Verified' if args.check else 'Built')+' 6 static languages, localized runtime and sitemap.')
if __name__=='__main__':main()
