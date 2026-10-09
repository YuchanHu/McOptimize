export class InputError extends Error {
  constructor(code, path) { super(`${code}: ${path}`); this.code = code; }
}
export const fail = (code, path) => { throw new InputError(code, path); };
export function integer(n, path, min = 0, max = 100000000) {
  if (!Number.isSafeInteger(n) || n < min || n > max) fail('INVALID_INTEGER', path);
  return n;
}
export function label(s, path) {
  if (typeof s !== 'string' || !s.trim() || s.length > 200) fail('INVALID_STRING', path);
  return s;
}
function strings(xs, path) {
  if (!Array.isArray(xs) || xs.length > 100) fail('INVALID_ARRAY', path);
  xs.forEach((s, i) => label(s, `${path}[${i}]`)); return [...new Set(xs)];
}
function evidence(e) {
  return e && ['official', 'mock'].includes(e.source) && e.confidence === 1;
}
export function trusted(p, field, mode) {
  const e = p.evidence?.[field];
  return !!evidence(e) && (mode === 'mock' || e.source === 'official');
}
function unit(p, path, mode) {
  if(!p || typeof p!=='object' || Array.isArray(p))fail('INVALID_PRODUCT',path);
  label(p.productCode, `${path}.productCode`); label(p.name, `${path}.name`);
  p.categories = strings(p.categories ?? [], `${path}.categories`);
  p.tags = strings(p.tags ?? [], `${path}.tags`);
  if (p.energyKcal != null && (typeof p.energyKcal !== 'number' || !Number.isFinite(p.energyKcal) || p.energyKcal < 0)) fail('INVALID_ENERGY', path);
  if (p.proteinG != null && (typeof p.proteinG !== 'number' || !Number.isFinite(p.proteinG) || p.proteinG < 0)) fail('INVALID_PROTEIN', path);
  if (typeof p.nutritionVerified !== 'boolean') fail('INVALID_NUTRITION_FLAG', path);
  if (mode === 'real' && Object.values(p.evidence ?? {}).some(e => e?.source === 'mock')) fail('MOCK_EVIDENCE_IN_REAL', path);
}
export function validateInput(raw) {
  if (!raw || typeof raw !== 'object') fail('INVALID_INPUT', 'root');
  const x = structuredClone(raw);
  if (x.schemaVersion !== '1.0' || !['mock','real'].includes(x.mode)) fail('INVALID_SCHEMA', 'schemaVersion/mode');
  const r = x.request;
  if (!r || !x.context) fail('MISSING_FIELD', 'request/context');
  integer(r.budgetFen, 'request.budgetFen', 1);
  r.maxItems ??= 5; integer(r.maxItems, 'request.maxItems', 1, 10);
  if (!Array.isArray(r.people) || !r.people.length || r.people.length > 8) fail('INVALID_PEOPLE', 'request.people (1..8)');
  const ids = new Set();
  for (const p of r.people) {
    if(!p || typeof p!=='object' || Array.isArray(p))fail('INVALID_PERSON','request.people');
    label(p.id, 'person.id'); if (ids.has(p.id)) fail('DUPLICATE_PERSON', p.id); ids.add(p.id);
    for (const f of ['mustHaveCategories','mustHaveProducts','excludeTags','excludeCategories','excludeProducts','preferredTags']) p[f] = strings(p[f] ?? [], `person.${f}`);
    if (p.maxEnergyKcal != null && (typeof p.maxEnergyKcal !== 'number' || !Number.isFinite(p.maxEnergyKcal) || p.maxEnergyKcal <= 0)) fail('INVALID_ENERGY_LIMIT', p.id);
  }
  r.preferences ??= {};
  if(typeof r.preferences!=='object' || Array.isArray(r.preferences))fail('INVALID_PREFERENCES','request.preferences');
  if(r.preferences.drinkOptional!=null && typeof r.preferences.drinkOptional!=='boolean')fail('INVALID_PREFERENCES','preferences.drinkOptional');
  if (r.preferences.optimizeFor && !['balanced','lowest_cost','most_variety','nutrition_priority'].includes(r.preferences.optimizeFor)) fail('INVALID_GOAL', 'preferences.optimizeFor');
  if (r.preferences.nutritionGoal && !['lower_energy','higher_protein'].includes(r.preferences.nutritionGoal)) fail('INVALID_GOAL', 'preferences.nutritionGoal');
  label(x.context.storeCode, 'context.storeCode'); label(x.context.beCode, 'context.beCode');
  integer(x.context.orderType, 'context.orderType', 1, 2); integer(x.context.beType, 'context.beType', 1, 6);
  if (![1,2,5,6].includes(x.context.beType) || (x.context.orderType === 2) !== (x.context.beType === 2)) fail('INVALID_CONTEXT', 'orderType/beType');
  if (x.context.dataSource !== x.mode) fail('SOURCE_MISMATCH', 'context.dataSource');
  // Only opaque fulfillment references are permitted; strip arbitrary account/config payloads.
  x.context = Object.fromEntries(['storeCode','beCode','orderType','beType','dataSource','fulfillmentRef','reservationRef'].filter(k=>x.context[k]!=null).map(k=>[k,x.context[k]]));
  for(const k of ['fulfillmentRef','reservationRef'])if(x.context[k]!=null)label(x.context[k],`context.${k}`);
  if (!Array.isArray(x.products) || x.products.length > 2000) fail('INVALID_MENU', 'products');
  const codes = new Set();
  x.products.forEach((p, i) => {
    unit(p, `products[${i}]`, x.mode); integer(p.priceFen, 'product.priceFen');
    if (!['single','bundle'].includes(p.type) || typeof p.available !== 'boolean') fail('INVALID_PRODUCT', p.productCode);
    if (codes.has(p.productCode)) fail('DUPLICATE_PRODUCT', p.productCode); codes.add(p.productCode);
    p.maxQuantity ??= r.maxItems; integer(p.maxQuantity, 'product.maxQuantity', 1, 10);
    if (p.type === 'bundle') {
      if(p.configurationRef!=null)label(p.configurationRef,'bundle.configurationRef');
      if (p.configurationVerified !== true || !Array.isArray(p.components) || !p.components.length || p.components.length > 20) fail('INVALID_BUNDLE', p.productCode);
      p.components.forEach(c => { unit(c, 'component', x.mode); integer(c.quantity, 'component.quantity', 1, 10); });
    }
  });
  x.coupons ??= []; if (!Array.isArray(x.coupons) || x.coupons.length > 100) fail('INVALID_COUPONS', 'coupons');
  const couponIds = new Set();
  x.coupons.forEach(c => {
    if(!c || typeof c!=='object' || Array.isArray(c))fail('INVALID_COUPON','coupons');
    label(c.id, 'coupon.id'); if (couponIds.has(c.id)) fail('DUPLICATE_COUPON', c.id); couponIds.add(c.id);
    if(c.eligible!=null && typeof c.eligible!=='boolean')fail('INVALID_COUPON','eligible');
    if (c.minSpendFen != null) integer(c.minSpendFen, 'coupon.minSpendFen');
    for (const f of ['storeCodes','productCodes']) if(c[f]!=null)c[f]=strings(c[f],`coupon.${f}`);
    if(c.beTypes!=null){if(!Array.isArray(c.beTypes))fail('INVALID_COUPON','beTypes');c.beTypes.forEach(n=>integer(n,'coupon.beTypes',1,6));}
    if (c.expiresAt != null && (typeof c.expiresAt!=='string' || !Number.isFinite(Date.parse(c.expiresAt)))) fail('INVALID_COUPON_DATE', c.id);
  });
  x.search = {maxProducts:40, maxCandidates:12, beamWidth:300, maxNodes:10000, maxAllocationNodes:2000, maxAllocationTotalNodes:200000, ...(x.search ?? {})};
  for (const [k, max] of Object.entries({maxProducts:100,maxCandidates:50,beamWidth:2000,maxNodes:100000,maxAllocationNodes:20000,maxAllocationTotalNodes:1000000})) integer(x.search[k], `search.${k}`, 1, max);
  return x;
}
export function servings(product, purchaseIndex) {
  const cs = product.type === 'bundle' ? product.components : [{...product, quantity:1}];
  return cs.flatMap((c, ci) => Array.from({length:c.quantity}, (_, q) => ({...c, purchaseCode:product.productCode, servingId:`${purchaseIndex}:${ci}:${q}`})));
}
export function canAssign(u, p, mode) {
  if (p.excludeProducts.includes(u.productCode) || p.excludeProducts.includes(u.purchaseCode)) return false;
  if (p.excludeCategories.length && (!trusted(u,'categories',mode) || u.categories.some(c=>p.excludeCategories.includes(c)))) return false;
  if (p.excludeTags.length && (!trusted(u,'tags',mode) || u.tags.some(t=>p.excludeTags.includes(t)))) return false;
  if (p.maxEnergyKcal != null && !(u.nutritionVerified && trusted(u,'nutrition',mode) && u.energyKcal != null)) return false;
  return true;
}
export function nutritionOf(units, mode) {
  const verified = units.length > 0 && units.every(u=>u.nutritionVerified && trusted(u,'nutrition',mode) && u.energyKcal != null);
  return {verified, totalKcal:verified ? units.reduce((n,u)=>n+u.energyKcal,0) : null,
    proteinG:verified && units.every(u=>u.proteinG != null) ? units.reduce((n,u)=>n+u.proteinG,0) : null};
}
export function personSatisfied(units, p, mode) {
  if (!units.length || units.some(u=>!canAssign(u,p,mode))) return false;
  const categories = new Set(units.filter(u=>trusted(u,'categories',mode)).flatMap(u=>u.categories));
  return p.mustHaveCategories.every(c=>categories.has(c)) && p.mustHaveProducts.every(c=>units.some(u=>u.productCode===c || u.purchaseCode===c)) &&
    (p.maxEnergyKcal == null || nutritionOf(units,mode).totalKcal <= p.maxEnergyKcal);
}
export function allocate(units, people, mode, maxNodes) {
  const buckets = people.map(()=>[]); let nodes=0, truncated=false;
  const choices = units.map(u=>people.flatMap((p,i)=>canAssign(u,p,mode)?[i]:[]));
  if (choices.some(c=>!c.length)) return {allocation:null,nodes,truncated};
  const order = units.map((_,i)=>i).sort((a,b)=>choices[a].length-choices[b].length || a-b);
  function visit(depth) {
    if (nodes >= maxNodes) { truncated=true; return false; } nodes++;
    if (depth===order.length) return buckets.every((b,i)=>personSatisfied(b,people[i],mode));
    const ui = order[depth], u=units[ui];
    const preferred = [...choices[ui]].sort((a,b)=>buckets[a].length-buckets[b].length || a-b);
    for (const pi of preferred) {
      const p=people[pi], b=buckets[pi];
      if (p.maxEnergyKcal != null && b.reduce((n,u)=>n+u.energyKcal,0)+u.energyKcal>p.maxEnergyKcal) continue;
      b.push(u); if (visit(depth+1)) return true; b.pop(); if (truncated) break;
    } return false;
  }
  if (!visit(0)) return {allocation:null,nodes,truncated};
  return {nodes,truncated,allocation:buckets.map((b,i)=>({personId:people[i].id, productCodes:b.map(u=>u.productCode), servings:b.map(u=>({servingId:u.servingId,productCode:u.productCode,purchaseCode:u.purchaseCode})),nutrition:nutritionOf(b,mode)}))};
}
