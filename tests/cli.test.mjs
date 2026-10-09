import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture} from './helpers.mjs';
const cli=new URL('../scripts/optimize.mjs',import.meta.url);
function run(args,input) {return spawnSync(process.execPath,[fileURLToPath(cli),...args],{input,encoding:'utf8'});}
test('CLI stdin pure JSON and mock pricing output machine readable',()=>{const r=run(['--input','-','--mock-pricing'],JSON.stringify(fixture()));assert.equal(r.status,0,r.stderr);assert.equal(r.stderr,'');const o=JSON.parse(r.stdout);assert.equal(o.dataSource,'mock');assert.ok(o.plans.length);});
test('CLI invalid JSON and arguments nonzero, no raw secrets printed',()=>{for(const [args,input] of [[['--input','-'],'{private token'],[['--bad'],'']]){const r=run(args,input);assert.equal(r.status,2);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes('private token'));assert.equal(JSON.parse(r.stderr).status,'error');}});
