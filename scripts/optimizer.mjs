import {createHash} from 'node:crypto';
import {validateInput,servings,allocate,nutritionOf,trusted} from './constraints.mjs';
import {shortlist} from './ranker.mjs';
export function fingerprint(items) {
  return createHash('sha256').update(JSON.stringify([...items].sort((a,b)=>a.productCode.localeCompare(b.productCode,'en')))).digest('hex');
}
export function contextKey(c) {
  return JSON.stringify([c.storeCode,c.beCode,c.orderType,c.beType,c.fulfillmentRef ?? null,c.reservationRef ?? null]);
}
export function verificationKey(candidate, context, couponIds=[]) {
  return createHash('sha256').update(JSON.stringify([candidate.fingerprint,contextKey(context),[...couponIds].sort()])).digest('hex');
}
export function optimize(raw) {
  const started=performance.now(), x=validateInput(raw), {request:r,search:s}=x;
  const required=new Set(r.people.flatMap(p=>p.mustHaveCategories));
  const desired=new Set(r.people.flatMap(p=>p.mustHaveProducts));
  const relevance=p=>servings(p,0).reduce((n,u)=>n+(trusted(u,'categories',x.mode)?u.categories.filter(c=>required.has(c)).length*10:0)+(desired.has(u.productCode)||desired.has(p.productCode)?20:0),0);
  const available=x.products.filter(p=>p.available);
  const products=[...available].sort((a,b)=>relevance(b)-relevance(a)||a.priceFen-b.priceFen||a.productCode.localeCompare(b.productCode,'en')).slice(0,s.maxProducts);
  const meta={generated:0,pruned:0,evaluated:0,priceSucceeded:0,unverified:0,nodes:0,allocationNodes:0,allocationTruncated:0,servingTruncated:false,menuTruncated:available.length>products.length,beamTruncated:false,searchExhaustive:true,productCount:products.length};
  let states=[{indices:[],total:0}], candidates=[], stopped=false;
  for (let depth=1;depth<=r.maxItems && states.length && !stopped;depth++) {
    const next=[];
    for (const state of states) {
      for (let j=state.indices.at(-1) ?? 0;j<products.length;j++) {
        if (meta.nodes>=s.maxNodes || meta.allocationNodes>=s.maxAllocationTotalNodes) {stopped=true;break;}
        meta.nodes++;meta.generated++;
        const p=products[j], total=state.total+p.priceFen;
        if (total>r.budgetFen || state.indices.filter(i=>i===j).length>=p.maxQuantity) {meta.pruned++;continue;}
        const indices=[...state.indices,j];
        const units=indices.flatMap((i,pi)=>servings(products[i],pi));
        if (units.length>50) {meta.servingTruncated=true;meta.pruned++;continue;}
        const match=allocate(units,r.people,x.mode,Math.min(s.maxAllocationNodes,s.maxAllocationTotalNodes-meta.allocationNodes));
        meta.allocationNodes+=match.nodes; if(match.truncated) meta.allocationTruncated++;
        if (match.allocation) {
          const quantities=new Map();indices.forEach(i=>quantities.set(products[i].productCode,(quantities.get(products[i].productCode)??0)+1));
          const items=[...quantities].map(([productCode,quantity])=>{
            const product=products.find(p=>p.productCode===productCode);
            const configurationKey=product.type==='bundle'?createHash('sha256').update(JSON.stringify([product.configurationRef??null,product.components.map(c=>[c.productCode,c.quantity])])).digest('hex'):null;
            return {productCode,quantity,...(configurationKey?{configurationKey}:{})};
          }).sort((a,b)=>a.productCode.localeCompare(b.productCode,'en'));
          const categories=new Set(units.filter(u=>trusted(u,'categories',x.mode)).flatMap(u=>u.categories));
          const preferenceHits=match.allocation.reduce((n,a,pi)=>n+a.servings.reduce((m,z)=>{const u=units.find(u=>u.servingId===z.servingId);return m+(trusted(u,'tags',x.mode)?u.tags.filter(t=>r.people[pi].preferredTags.includes(t)).length:0);},0),0);
          candidates.push({fingerprint:fingerprint(items),items,allocation:match.allocation,estimatedTotalFen:total,verifiedTotalFen:null,couponUse:[],nutrition:nutritionOf(units,x.mode),hardConstraintsSatisfied:true,categoryCount:categories.size,distinctProductCount:new Set(units.map(u=>u.productCode)).size,itemCount:indices.length,preferenceHits,warnings:[...(x.mode==='mock'?['MOCK_DATA']:[]),'NOT_PRICE_VERIFIED']});
          meta.evaluated++;
        } else meta.pruned++;
        // Infeasible partial allocations may become feasible when more servings arrive.
        const coverage=new Set(units.filter(u=>trusted(u,'categories',x.mode)).flatMap(u=>u.categories));
        const unmet=[...required].filter(c=>!coverage.has(c)).length;
        next.push({indices,total,priority:unmet*100000+total-coverage.size*100});
      }
      if(stopped) break;
    }
    next.sort((a,b)=>a.priority-b.priority||a.indices.join(',').localeCompare(b.indices.join(','),'en'));
    if(next.length>s.beamWidth) meta.beamTruncated=true;
    states=next.slice(0,s.beamWidth);
  }
  meta.searchExhaustive=!stopped && !meta.beamTruncated && !meta.menuTruncated && !meta.allocationTruncated && !meta.servingTruncated;
  candidates=shortlist(candidates,x.coupons.length?Math.max(1,Math.floor(s.maxCandidates/2)):s.maxCandidates,{nutritionGoal:r.preferences.nutritionGoal});
  meta.unverified=candidates.length;meta.elapsedMs=Math.round(performance.now()-started);
  return {input:x,candidates,meta};
}
