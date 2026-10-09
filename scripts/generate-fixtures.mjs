// Development fixture generator: all products, prices, coupons and nutrition below are fictional.
import {writeFile,mkdir} from 'node:fs/promises';
const evidence=Object.fromEntries(['categories','tags','nutrition'].map(k=>[k,{source:'mock',confidence:1,reference:'fictional fixture'}]));
const food=(productCode,name,priceFen,categories,tags,energyKcal,proteinG)=>({productCode,name:`模拟·${name}`,priceFen,type:'single',categories,tags,energyKcal,proteinG,nutritionVerified:energyKcal!=null,available:true,evidence});
const products=[
  food('MOCK_CHICKEN','鸡肉汉堡',1700,['chicken-burger','main'],['chicken'],380,18),
  food('MOCK_LIGHT','轻量鸡肉堡',1400,['chicken-burger','main'],['chicken'],260,20),
  food('MOCK_BEEF','牛肉汉堡',1800,['beef-burger','main'],['beef'],450,22),
  food('MOCK_FRIES','小薯条',900,['snack','fries'],[],220,3),
  food('MOCK_SALAD','配菜',600,['snack','vegetable'],[],80,2),
  food('MOCK_DRINK','饮料',400,['drink'],[],100,0),
  food('MOCK_UNKNOWN','营养未知小食',500,['snack'],[],null,null),
  {...food('MOCK_BUNDLE','鸡堡小食饮料套餐',2300,[],[],null,null),type:'bundle',configurationVerified:true,
    components:[{...food('MOCK_LIGHT','轻量鸡肉堡',1400,['chicken-burger','main'],['chicken'],260,20),quantity:1},{...food('MOCK_FRIES','小薯条',900,['snack','fries'],[],220,3),quantity:1},{...food('MOCK_DRINK','饮料',400,['drink'],[],100,0),quantity:1}]}
];
const coupons=[{id:'MOCK_COUPON',eligible:true,storeCodes:['MOCK_STORE_001'],beTypes:[1],minSpendFen:2000,description:'虚构优惠策略；金额只能由模拟计价器验证'}];
const people=[{id:'A',mustHaveCategories:['main'],excludeTags:['beef']},{id:'B',mustHaveCategories:['main','fries']},{id:'C',mustHaveCategories:['main'],maxEnergyKcal:600}];
const base={schemaVersion:'1.0',mode:'mock',request:{budgetFen:3000,people:[{id:'p1',mustHaveCategories:['chicken-burger','snack'],excludeTags:['beef'],maxEnergyKcal:null}],preferences:{drinkOptional:true,optimizeFor:'balanced',nutritionGoal:'lower_energy'},maxItems:5},context:{storeCode:'MOCK_STORE_001',beCode:'MOCK_BE',orderType:1,beType:1,dataSource:'mock'},products,coupons,search:{maxCandidates:12,beamWidth:300,maxNodes:10000}};
await mkdir('tests/fixtures',{recursive:true});
for(const [name,value] of Object.entries({'menu.mock':{dataSource:'mock',notice:'虚构菜单与营养，非官方数据',products},'coupons.mock':{dataSource:'mock',coupons},'people.mock':{dataSource:'mock',people},'request.mock':base,'request.multiplayer.mock':{...base,request:{...base.request,budgetFen:9000,people,maxItems:5}}}))await writeFile(`tests/fixtures/${name}.json`,JSON.stringify(value,null,2)+'\n','utf8');
