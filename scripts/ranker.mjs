export const DEFAULT_WEIGHTS = Object.freeze({category:10, distinctProduct:2, preferredTag:3});
const tie = (a,b) => a.fingerprint.localeCompare(b.fingerprint,'en');
export function amount(p) { return p.verifiedTotalFen ?? p.estimatedTotalFen; }
export function varietyScore(p, weights=DEFAULT_WEIGHTS) {
  return p.categoryCount*weights.category + p.distinctProductCount*weights.distinctProduct + p.preferenceHits*weights.preferredTag;
}
export function rankPlans(candidates, {nutritionGoal='lower_energy',weights=DEFAULT_WEIGHTS}={}) {
  const used=new Set(), plans=[];
  const comparisons = {
    lowest_cost:(a,b)=>amount(a)-amount(b) || a.itemCount-b.itemCount || tie(a,b),
    most_variety:(a,b)=>varietyScore(b,weights)-varietyScore(a,weights) || amount(a)-amount(b) || tie(a,b),
    nutrition_priority:(a,b)=>nutritionGoal==='higher_protein'
      ? b.nutrition.proteinG-a.nutrition.proteinG || amount(a)-amount(b) || tie(a,b)
      : a.nutrition.totalKcal-b.nutrition.totalKcal || amount(a)-amount(b) || tie(a,b)
  };
  const notes=[];
  for (const [goal, compare] of Object.entries(comparisons)) {
    const eligible = candidates.filter(p=>p.hardConstraintsSatisfied && (goal!=='nutrition_priority' || p.nutrition.verified && (nutritionGoal!=='higher_protein' || p.nutrition.proteinG!=null)));
    const sorted=eligible.toSorted ? eligible.toSorted(compare) : [...eligible].sort(compare);
    const best=sorted.find(p=>!used.has(p.fingerprint));
    if (!best) {notes.push(`${goal}: 无可信或不重复的候选`);continue;}
    used.add(best.fingerprint);
    plans.push({...best,id:`plan_${plans.length+1}`,goal, reasons:[
      goal==='lowest_cost'?'已搜索候选中金额最低':goal==='most_variety'?'优先可靠类别覆盖、不同餐品和口味偏好':nutritionGoal==='higher_protein'?'在可信营养数据内优先蛋白质':'在可信营养数据内优先较低热量',
      ...(sorted[0].fingerprint!==best.fingerprint?['该目标首选与已有方案重复，展示下一个不同组合']:[]),
      `满足 ${best.allocation.length} 人硬约束；套餐子项只分配一次`,
      best.verifiedTotalFen==null?'菜单估价，待官方计价':'计价结果已回填，含额外费用'
    ]});
  }
  return {plans,notes};
}
export function shortlist(candidates, limit, preferences={}) {
  const heads=rankPlans(candidates,preferences).plans;
  const rest=[...candidates].sort((a,b)=>amount(a)-amount(b)||tie(a,b));
  const seen=new Set(); return [...heads,...rest].filter(p=>!seen.has(p.fingerprint) && seen.add(p.fingerprint)).slice(0,limit);
}
