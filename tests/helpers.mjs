import {readFileSync} from 'node:fs';
export const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/request.mock.json',import.meta.url),'utf8'));
export const multiplayer=()=>JSON.parse(readFileSync(new URL('./fixtures/request.multiplayer.mock.json',import.meta.url),'utf8'));
export function small() {const x=fixture();x.products=x.products.filter(p=>['MOCK_LIGHT','MOCK_SALAD'].includes(p.productCode));x.coupons=[];x.request.maxItems=2;return x;}
