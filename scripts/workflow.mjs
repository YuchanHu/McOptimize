import {createHash} from 'node:crypto';
import {contextKey} from './optimizer.mjs';
import {fail,integer} from './constraints.mjs';
export function orderDigest(summary) {
  return createHash('sha256').update(JSON.stringify([contextKey(summary.context),summary.items,summary.couponUse,summary.totalFen,summary.extraFeesFen,summary.fulfillmentRef,summary.calculatedAt,summary.verificationKey])).digest('hex');
}
export function prepareOrder(plan,context,{now=Date.now(),maxAgeMs=300000,fulfillmentRef}={}) {
  if(plan.warnings?.includes('MOCK_DATA') || !plan.hardConstraintsSatisfied || plan.verifiedTotalFen==null || !plan.verificationKey)fail('ORDER_BLOCKED','requires real verified plan');
  integer(plan.verifiedTotalFen,'order.totalFen');
  if(contextKey(plan.pricingContext??{})!==contextKey(context))fail('REPRICE_REQUIRED','context changed');
  const time=Date.parse(plan.calculatedAt);
  if(!Number.isFinite(time) || now-time>maxAgeMs || time>now+1000)fail('REPRICE_REQUIRED','stale price');
  if(context.orderType===2 && !fulfillmentRef)fail('MISSING_FULFILLMENT','delivery address reference');
  if((context.fulfillmentRef??null)!==(fulfillmentRef??null))fail('REPRICE_REQUIRED','fulfillment changed');
  const summary={context,items:plan.items,couponUse:plan.couponUse,totalFen:plan.verifiedTotalFen,extraFeesFen:plan.extraFeesFen??0,fulfillmentRef:fulfillmentRef??null,calculatedAt:plan.calculatedAt,verificationKey:plan.verificationKey};
  return {state:'awaiting_confirmation',summary,digest:orderDigest(summary)};
}
export function authorizeWrite(tool,session,confirmation,{now=Date.now()}={}) {
  if(tool==='auto-bind-coupons')return confirmation?.explicit===true && confirmation?.action==='claim_coupons' && confirmation?.currentTurn===true;
  if(tool!=='create-order' || session?.state!=='awaiting_confirmation' || !session.summary)return false;
  return orderDigest(session.summary)===session.digest && confirmation?.explicit===true && confirmation?.currentTurn===true && confirmation?.digest===session.digest && confirmation?.action==='create_order' && now-Date.parse(session.summary.calculatedAt)<=300000 && now>=Date.parse(session.summary.calculatedAt);
}
export function markSubmitting(session) {
  if(session.state!=='awaiting_confirmation')fail('DUPLICATE_ORDER_BLOCKED','state');
  return {...session,state:'submitting'};
}
export function recordOrderOutcome(session,outcome) {
  if(session.state!=='submitting')fail('INVALID_ORDER_STATE','state');
  if(outcome?.success===true && outcome.orderId)return {...session,state:'created',orderId:outcome.orderId,paymentState:'not_confirmed'};
  return {...session,state:'unknown',nextAction:'query-order',retryAllowed:false};
}
