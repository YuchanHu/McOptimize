import {verificationKey,contextKey} from './optimizer.mjs';
import {integer,fail} from './constraints.mjs';
export function couponStrategies(input, candidate, now=Date.now()) {
  const allowed=input.coupons.filter(c=>c.eligible!==false && (!c.storeCodes || c.storeCodes.includes(input.context.storeCode)) && (!c.beTypes || c.beTypes.includes(input.context.beType)) && (!c.productCodes || candidate.items.some(i=>c.productCodes.includes(i.productCode))) && (!c.expiresAt || Date.parse(c.expiresAt)>now) && (c.minSpendFen==null || candidate.estimatedTotalFen>=c.minSpendFen));
  return [[],...allowed.map(c=>[c.id])]; // Never infer stacking or realized savings.
}
export function buildPricingRequests(input,candidates,now=Date.now()) {
  const lists=candidates.map(c=>couponStrategies(input,c,now));const requests=[];
  // Round robin: cover combinations before spending the remaining request budget on coupons.
  for(let round=0;requests.length<input.search.maxCandidates;round++) {
    let added=false;
    for(let i=0;i<candidates.length && requests.length<input.search.maxCandidates;i++) {
      const ids=lists[i][round];if(!ids)continue;added=true;
      requests.push({verificationKey:verificationKey(candidates[i],input.context,ids),fingerprint:candidates[i].fingerprint,context:{...input.context},items:candidates[i].items,couponIds:ids});
    } if(!added)break;
  } return requests;
}
export async function verifyCandidates(input,candidates,adapter,{sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now(),maxRetries=2,timeoutMs=5000}={}) {
  integer(maxRetries,'maxRetries',0,3); integer(timeoutMs,'timeoutMs',1,30000);
  const requests=buildPricingRequests(input,candidates,now()), results=[];let calls=0;
  for(const req of requests) {
    let response;
    for(let attempt=0;attempt<=maxRetries && calls<input.search.maxCandidates;attempt++) {
      calls++;
      let timer;
      try {
        response=await Promise.race([Promise.resolve().then(()=>adapter(req)),new Promise((_,reject)=>{timer=setTimeout(()=>reject({status:408}),timeoutMs);})]);
        break;
      } catch(e) {
        response={status:e.status===401?401:e.status===429?429:408};
        if(response.status!==429 || attempt===maxRetries || calls>=input.search.maxCandidates)break;
        await sleep(Math.min(100*2**attempt,800));
      } finally {clearTimeout(timer);}
    }
    if(!response)break;
    results.push({...response,verificationKey:req.verificationKey});
    if(response.status===401)break;
  }
  return {results,calls};
}
export function applyPricing(input,candidates,results,{now=Date.now(),maxAgeMs=300000}={}) {
  if(!Array.isArray(results))fail('INVALID_PRICING','results');
  const requests=buildPricingRequests(input,candidates,now), byKey=new Map(requests.map(r=>[r.verificationKey,r]));
  const best=new Map();let failed=0,overBudget=0;
  const seen=new Set();
  for(const row of results) {
    const req=byKey.get(row.verificationKey);
    if(!req || seen.has(row.verificationKey))fail('UNBOUND_PRICE','verificationKey');seen.add(row.verificationKey);
    if(row.status!==200) {failed++;continue;}
    integer(row.totalFen,'pricing.totalFen');integer(row.extraFeesFen,'pricing.extraFeesFen');integer(row.discountFen,'pricing.discountFen');
    if(row.totalFen<row.extraFeesFen) {failed++;continue;}
    const time=Date.parse(row.calculatedAt);
    if(row.dataSource!==input.mode || !Number.isFinite(time) || time>now+1000 || now-time>maxAgeMs || contextKey(row.context ?? {})!==contextKey(input.context)) {failed++;continue;}
    if(!Array.isArray(row.couponUse) || JSON.stringify([...row.couponUse].sort())!==JSON.stringify([...req.couponIds].sort())) {failed++;continue;}
    if(row.totalFen>input.request.budgetFen) {overBudget++;continue;}
    const c=candidates.find(c=>c.fingerprint===req.fingerprint);
    const p={...c,verifiedTotalFen:row.totalFen,extraFeesFen:row.extraFeesFen,discountFen:row.discountFen,couponUse:row.couponUse,calculatedAt:row.calculatedAt,pricingContext:row.context,verificationKey:row.verificationKey,warnings:input.mode==='mock'?['MOCK_DATA','MOCK_PRICING_NOT_OFFICIAL']:[]};
    if(!best.has(c.fingerprint) || best.get(c.fingerprint).verifiedTotalFen>p.verifiedTotalFen)best.set(c.fingerprint,p);
  }
  return {candidates:[...best.values()],failed,overBudget,succeeded:best.size,unverified:candidates.length-best.size};
}
export function mockPricingAdapter(input,{surchargeFen=0,rejectCoupons=false,status=200,now=()=>Date.now()}={}) {
  if(input.mode!=='mock')fail('MOCK_ONLY','mock pricing');
  return async req=>{
    if(status!==200)throw {status};
    if(rejectCoupons && req.couponIds.length)throw {status:422};
    const total=req.items.reduce((n,i)=>n+input.products.find(p=>p.productCode===i.productCode).priceFen*i.quantity,0)+surchargeFen;
    // Mock discount is explicitly simulated; never used in the offline estimate.
    const discount=req.couponIds.length?200:0;
    return {status:200,totalFen:Math.max(0,total-discount),extraFeesFen:surchargeFen,discountFen:discount,couponUse:req.couponIds,dataSource:'mock',context:req.context,calculatedAt:new Date(now()).toISOString()};
  };
}
