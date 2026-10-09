import {rankPlans} from './ranker.mjs';
import {buildPricingRequests} from './pricing.mjs';
export function formatResult(run,pricing=null) {
  const candidates=pricing?pricing.candidates:run.candidates;
  const {plans,notes}=rankPlans(candidates,{nutritionGoal:run.input.request.preferences.nutritionGoal});
  const verification=pricing?(plans.length?'verified':'verification_failed'):'not_verified';
  return {schemaVersion:'1.0',status:plans.length?'ok':pricing?'verification_failed':'no_solution',dataSource:run.input.mode,
    priceVerification:verification,verificationSource:pricing?(run.input.mode==='mock'?'mock_adapter':'agent_mcp_results'):null,
    plans, candidates:run.candidates,pricingRequests:buildPricingRequests(run.input,run.candidates),
    reasons:plans.length?notes:[pricing?'无法确认预算内实际价格；请检查接口状态、金额单位、计价时间与场景':'无可验证硬约束解：检查预算、类别/成分证据、营养数据和搜索上限',...notes],
    meta:{...run.meta,...(pricing?{priceSucceeded:pricing.succeeded,unverified:pricing.unverified,pricingFailed:pricing.failed,overBudget:pricing.overBudget}:{})},
    warnings:[...(run.input.mode==='mock'?['MOCK_DATA']:[]),...(run.meta.searchExhaustive?[]:['BOUNDED_SEARCH_ONLY']),...(verification==='not_verified'?['NOT_PRICE_VERIFIED']:[])]};
}
