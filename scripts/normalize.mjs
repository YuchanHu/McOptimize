import {fail,integer,validateInput} from './constraints.mjs';
// Paths are literal object keys, not executable expressions. No implicit unit or field guesses.
export function readPath(raw,path) {
  if(typeof path!=='string' || !path || path.split('.').some(k=>['__proto__','prototype','constructor'].includes(k)))fail('INVALID_MAPPING','path');
  return path.split('.').reduce((v,k)=>v && Object.hasOwn(v,k)?v[k]:undefined,raw);
}
export function moneyFen(value,unit) {
  if(unit==='fen')return integer(value,'mapped money');
  if(unit!=='yuan')fail('UNKNOWN_MONEY_UNIT','mapping.moneyUnit');
  // Decimal string required for yuan: avoid binary floating-point conversion and rounding.
  if(typeof value!=='string' || !/^\d+(\.\d{1,2})?$/.test(value))fail('INVALID_DECIMAL_MONEY','mapped money');
  const [whole,decimal='']=value.split('.');return integer(Number(whole)*100+Number(decimal.padEnd(2,'0')),'mapped money');
}
export function normalizeMenu(raw,mapping,{mode='real'}={}) {
  if(!mapping?.schemaReviewed || !mapping.schemaReference)fail('UNREVIEWED_SCHEMA','mapping');
  const rows=readPath(raw,mapping.productsPath);
  if(!Array.isArray(rows))fail('MISSING_MENU','mapping.productsPath');
  return rows.map(row=>{
    const code=readPath(row,mapping.codePath),facts=mapping.factsByCode?.[code];
    if(!facts)fail('MISSING_PRODUCT_FACTS',String(code));
    return {...structuredClone(facts),productCode:code,name:readPath(row,mapping.namePath),priceFen:moneyFen(readPath(row,mapping.pricePath),mapping.moneyUnit),available:readPath(row,mapping.availablePath)};
  });
}
export function normalizeInput(raw,mapping,base) {
  return validateInput({...base,products:normalizeMenu(raw,mapping,{mode:base.mode})});
}
export function normalizePrice(raw,mapping,request,{mode='real'}={}) {
  if(!mapping?.schemaReviewed || !mapping.schemaReference)fail('UNREVIEWED_SCHEMA','price mapping');
  const couponUse=readPath(raw,mapping.couponIdsPath);
  if(!Array.isArray(couponUse))fail('MISSING_COUPON_CONFIRMATION','price result');
  return {status:200,verificationKey:request.verificationKey,totalFen:moneyFen(readPath(raw,mapping.totalPath),mapping.moneyUnit),extraFeesFen:moneyFen(readPath(raw,mapping.feesPath),mapping.moneyUnit),discountFen:moneyFen(readPath(raw,mapping.discountPath),mapping.moneyUnit),couponUse,context:request.context,dataSource:mode,calculatedAt:readPath(raw,mapping.timePath)};
}
