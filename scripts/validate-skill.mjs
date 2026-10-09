import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
// Targeted checker for this WorkBuddy flat scalar frontmatter, not a general YAML parser.
export async function validateSkill(root=fileURLToPath(new URL('../',import.meta.url))) {
  const text=await readFile(resolve(root,'SKILL.md'),'utf8');
  const m=text.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n/);if(!m)throw new Error('INVALID_FRONTMATTER');
  const metadata={};
  for(const line of m[1].split(/\r?\n/)){if(!line.trim()||line.startsWith('#'))continue;const row=line.match(/^([a-z_]+): (.+)$/);if(!row||Object.hasOwn(metadata,row[1]))throw new Error('INVALID_METADATA');metadata[row[1]]=row[2];}
  for(const key of ['name','description','description_zh','description_en','version','author'])if(!metadata[key]?.trim())throw new Error(`MISSING_METADATA_${key}`);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name)||metadata.name.length>64||!/\d+\.\d+\.\d+/.test(metadata.version))throw new Error('INVALID_SKILL_ID');
  for(const [,path] of text.matchAll(/@(references\/[\w-]+\.md)/g))await access(resolve(root,path));
  const fences=text.match(/^```/gm)??[];if(fences.length%2)throw new Error('UNCLOSED_FENCE');
  return {status:'ok',platform:'WorkBuddy task-book contract',metadata,onlineImportVerified:false};
}
if(resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))validateSkill().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
