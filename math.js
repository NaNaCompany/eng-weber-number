/* Original elementary numerical helpers, independent of external packages. */
export function logRatio(a,b){const relative=(a-b)/b;return Math.abs(relative)<.5?Math.log1p(relative):Math.log(a)-Math.log(b);}
export function sum(values){let total=0,correction=0;for(const value of values){const next=total+value;correction+=Math.abs(total)>=Math.abs(value)?(total-next)+value:(value-next)+total;total=next;}return total+correction;}
export function positiveExp(logValue){const result=Math.exp(logValue);if(!Number.isFinite(result)||result===0)throw Error('계산 중 수치 범위를 벗어났습니다. 입력 크기를 확인하세요.');return result;}
