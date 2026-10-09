import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPlans,varietyScore} from '../scripts/ranker.mjs';
const p=(f,c,k,v=1)=>({fingerprint:f,estimatedTotalFen:c,verifiedTotalFen:null,nutrition:{verified:true,totalKcal:k,proteinG:20},categoryCount:v,distinctProductCount:v,preferenceHits:0,itemCount:1,hardConstraintsSatisfied:true,allocation:[{personId:'p'}]});
test('three goals yield distinct plans and correct objectives',()=>{const r=rankPlans([p('a',100,500),p('b',200,450,3),p('c',250,100)]);assert.deepEqual(r.plans.map(p=>[p.goal,p.fingerprint]),[['lowest_cost','a'],['most_variety','b'],['nutrition_priority','c']]);});
test('verified payable price outranks menu estimate',()=>{const a=p('a',100,300),b=p('b',200,200);a.verifiedTotalFen=500;b.verifiedTotalFen=150;assert.equal(rankPlans([a,b]).plans[0].fingerprint,'b');});
test('no repeated plan when goals coincide, missing nutrition excluded',()=>{const a=p('a',100,300);a.nutrition={verified:false,totalKcal:null};const r=rankPlans([a]);assert.equal(r.plans.length,1);assert.ok(r.notes.some(s=>s.startsWith('nutrition_priority')));});
test('duplicates do not inflate variety; configurable weights',()=>{const a=p('a',100,300,1),b={...a,itemCount:5};assert.equal(varietyScore(a),varietyScore(b));assert.equal(varietyScore(a,{category:1,distinctProduct:0,preferredTag:0}),1);});
test('protein objective and deterministic ties, invalid hard constraints excluded',()=>{const a=p('a',100,300),b=p('b',100,300),c=p('c',150,300);c.nutrition.proteinG=50;const invalid={...p('invalid',1,1),hardConstraintsSatisfied:false};const r=rankPlans([b,a,c,invalid],{nutritionGoal:'higher_protein'});assert.equal(r.plans[0].fingerprint,'a');assert.equal(r.plans.at(-1).fingerprint,'c');});
