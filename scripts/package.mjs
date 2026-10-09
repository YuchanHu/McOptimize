import {readdir,readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {resolve,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeZip,inspectZip,sha256} from './zip.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export function hasSecret(text) {
  return /Bearer\s+(?!<|YOUR_|TOKEN_PLACEHOLDER)[A-Za-z0-9_-]{16,}|(?:sk-|ghp_)[A-Za-z0-9]{20,}|"(?:token|password|authorization)"\s*:\s*"(?!YOUR_[A-Z0-9_]+"|<[^<>"\r\n]+>"|\$\{[A-Z][A-Z0-9_]*\}"|Bearer (?:YOUR_[A-Z0-9_]+|<[^<>"\r\n]+>|\$\{[A-Z][A-Z0-9_]*\})")[^"\r\n]{12,}"/i.test(text);
}
export async function sourceEntries() {
  const files=[];
  async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if((await lstat(p)).isSymbolicLink())throw new Error('NO_SYMLINKS');if(e.isDirectory())await walk(p);else files.push(p);}}
  for(const dir of ['scripts','references','tests','demos'])await walk(join(root,dir));
  for(const name of ['SKILL.md','README.md','LICENSE','.gitignore','package.json','CONTEST_DECLARATION.md','MCP_INTEGRATION.md','mcp-config.example.json'])files.push(join(root,name));
  const entries=[];
  for(const path of files.sort()) {
    const name=relative(root,path).replaceAll('\\','/');
    if(/(^|\/)(node_modules|temp|dist|\.git)(\/|$)|(^|\/)\.env[^/]*$|\.(log|local\.json)$/i.test(name))throw new Error('PRIVATE_FILE_BLOCKED');
    const data=await readFile(path),text=data.toString('utf8');
    if(hasSecret(text))throw new Error(`SECRET_BLOCKED: ${name}`);
    entries.push({name,data});
  }return entries;
}
async function main() {
  const sources=await sourceEntries(),expected=new Map(sources.map(e=>[e.name,sha256(e.data)]));
  await mkdir(join(root,'dist'),{recursive:true});const records=[];
  for(const [name,prefix] of [['mcd-optimize-skill.zip','mcd-optimize/'],['mcd-optimize-skill-flat.zip','']]) {
    const path=join(root,'dist',name);
    if(!process.argv.includes('--verify'))await writeFile(path,makeZip(sources.map(e=>({...e,name:prefix+e.name}))));
    const zip=await readFile(path),entries=inspectZip(zip);
    if(entries.length!==sources.length)throw new Error('FILE_COUNT_MISMATCH');
    for(const e of entries){if(!e.name.startsWith(prefix)||expected.get(e.name.slice(prefix.length))!==sha256(e.data))throw new Error('CONTENT_MISMATCH');}
    const record={name,path,sha256:sha256(zip),files:entries.map(e=>e.name),sizeBytes:zip.length,skillPath:prefix+'SKILL.md'};records.push(record);
  }
  if(!process.argv.includes('--verify'))await writeFile(join(root,'dist','manifest.json'),JSON.stringify({version:'1.0.0',archives:records},null,2)+'\n');
  console.log(JSON.stringify({status:'ok',archives:records.map(({files,...r})=>({...r,fileCount:files.length}))},null,2));
}
if(resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
