import test from 'node:test';
import assert from 'node:assert/strict';
import {makeZip,inspectZip,sha256} from '../scripts/zip.mjs';
import {sourceEntries,hasSecret} from '../scripts/package.mjs';
import {validateSkill} from '../scripts/validate-skill.mjs';
test('ZIP roundtrip preserves UTF8 filenames and detects content corruption',()=>{const entries=[{name:'mcd-optimize/SKILL.md',data:Buffer.from('示范文档')}],z=makeZip(entries);assert.deepEqual(inspectZip(z),entries);const broken=Buffer.from(z);broken[broken.indexOf(Buffer.from('示范'))]^=1;assert.throws(()=>inspectZip(broken),/ZIP_INTEGRITY/);});
test('package allowlist contains entrypoint and references, no temp/token/logs',async()=>{const entries=await sourceEntries();assert.ok(entries.some(e=>e.name==='SKILL.md'));for(const e of entries)assert.ok(!/(^|\/)(temp|dist|node_modules|\.git)(\/|$)/.test(e.name));const skill=entries.find(e=>e.name==='SKILL.md').data.toString('utf8');for(const [,path] of skill.matchAll(/@(references\/[\w-]+\.md)/g))assert.ok(entries.some(e=>e.name===path),path);assert.equal(sha256(makeZip(entries)),sha256(makeZip(entries)));});
test('WorkBuddy entrypoint metadata and resource paths meet task contract',async()=>{assert.equal((await validateSkill()).status,'ok');});
test('credential scan permits exact placeholders and blocks actual credential shapes',()=>{
  for(const placeholder of ['Bearer YOUR_MCP_TOKEN','Bearer <TOKEN>','YOUR_MCP_TOKEN','Bearer ${MCD_MCP_TOKEN}','${MCD_MCP_TOKEN}'])assert.equal(hasSecret(JSON.stringify({Authorization:placeholder})),false);
  for(const secret of ['Bearer '+'x'.repeat(24),'x'.repeat(24),'Bearer YOUR_MCP_TOKEN '+ 'x'.repeat(24)])assert.equal(hasSecret(JSON.stringify({Authorization:secret})),true);
  assert.equal(hasSecret('Bearer '+'x'.repeat(24)),true);
});
