#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {optimize} from './optimizer.mjs';
import {verifyCandidates,applyPricing,mockPricingAdapter} from './pricing.mjs';
import {formatResult} from './format.mjs';
let dataSource='unknown';
try {
  const args=process.argv.slice(2), options={};
  for(let i=0;i<args.length;i++) {
    const a=args[i];
    if(a==='--mock-pricing'){options.mock=true;continue;}
    if(!['--input','--output','--pricing-results'].includes(a) || !args[i+1] || args[i+1].startsWith('--') || Object.hasOwn(options,a))throw {code:'INVALID_ARGUMENT'};
    options[a]=args[++i];
  }
  if(!options['--input'] || options.mock && options['--pricing-results'])throw {code:'INVALID_ARGUMENT'};
  const text=options['--input']==='-'?await new Promise((res,rej)=>{let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>res(s));process.stdin.on('error',rej);}):await readFile(options['--input'],'utf8');
  const raw=JSON.parse(text.replace(/^\uFEFF/,''));dataSource=raw.mode??'unknown';
  const run=optimize(raw);let pricing=null;
  if(options.mock) {
    const verified=await verifyCandidates(run.input,run.candidates,mockPricingAdapter(run.input));
    pricing=applyPricing(run.input,run.candidates,verified.results);pricing.calls=verified.calls;
  } else if(options['--pricing-results']) {
    const rows=JSON.parse((await readFile(options['--pricing-results'],'utf8')).replace(/^\uFEFF/,''));
    pricing=applyPricing(run.input,run.candidates,rows);
  }
  const output=formatResult(run,pricing);if(pricing?.calls!=null)output.meta.pricingCalls=pricing.calls;
  const json=JSON.stringify(output,null,2)+'\n';
  if(options['--output']){const file=resolve(options['--output']);await mkdir(dirname(file),{recursive:true});await writeFile(file,json,'utf8');}
  process.stdout.write(json);
} catch(e) {
  // Do not echo raw input, paths, account objects or exception text into diagnostic logs.
  const code=e.code??(e instanceof SyntaxError?'INVALID_JSON':'INTERNAL_ERROR');
  process.stderr.write(JSON.stringify({status:'error',dataSource,code})+'\n');
  process.exitCode=code==='INTERNAL_ERROR'?3:2;
}
