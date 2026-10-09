#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {normalizeInput,normalizePrice} from './normalize.mjs';
try {
  const args=process.argv.slice(2),o={};
  for(let i=0;i<args.length;i+=2){if(!['--raw','--mapping','--base','--request','--output'].includes(args[i])||!args[i+1]||o[args[i]])throw {code:'INVALID_ARGUMENT'};o[args[i]]=args[i+1];}
  if(!o['--raw']||!o['--mapping']||!!o['--base']===!!o['--request'])throw {code:'INVALID_ARGUMENT'};
  const read=async path=>JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
  const raw=await read(o['--raw']),mapping=await read(o['--mapping']);
  const result=o['--base']?normalizeInput(raw,mapping,await read(o['--base'])):normalizePrice(raw,mapping,await read(o['--request']));
  const json=JSON.stringify(result,null,2)+'\n';
  if(o['--output']){await mkdir(dirname(o['--output']),{recursive:true});await writeFile(o['--output'],json,'utf8');}process.stdout.write(json);
}catch(e){process.stderr.write(JSON.stringify({status:'error',dataSource:'unknown',code:e.code??(e instanceof SyntaxError?'INVALID_JSON':'INTERNAL_ERROR')})+'\n');process.exitCode=2;}
