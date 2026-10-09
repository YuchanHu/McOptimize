import {createHash} from 'node:crypto';
export function crc32(data) {
  let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export const sha256=data=>createHash('sha256').update(data).digest('hex');
export function makeZip(entries) {
  const local=[],central=[];let offset=0;
  for(const {name,data} of entries) {
    const filename=Buffer.from(name,'utf8'),crc=crc32(data),lh=Buffer.alloc(30),ch=Buffer.alloc(46);
    lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0x800,6);lh.writeUInt16LE(0,8);lh.writeUInt16LE(0x5c21,12);lh.writeUInt32LE(crc,14);lh.writeUInt32LE(data.length,18);lh.writeUInt32LE(data.length,22);lh.writeUInt16LE(filename.length,26);
    ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0x800,8);ch.writeUInt16LE(0x5c21,14);ch.writeUInt32LE(crc,16);ch.writeUInt32LE(data.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(filename.length,28);ch.writeUInt32LE(offset,42);
    local.push(lh,filename,data);central.push(ch,filename);offset+=lh.length+filename.length+data.length;
  }
  const cd=Buffer.concat(central),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,cd,end]);
}
export function inspectZip(buf) {
  const entries=[];let offset=0;
  while(offset+30<=buf.length && buf.readUInt32LE(offset)===0x04034b50) {
    const size=buf.readUInt32LE(offset+18),nl=buf.readUInt16LE(offset+26),el=buf.readUInt16LE(offset+28),name=buf.subarray(offset+30,offset+30+nl).toString('utf8'),start=offset+30+nl+el,data=buf.subarray(start,start+size);
    if(buf.readUInt16LE(offset+8)!==0||data.length!==size||crc32(data)!==buf.readUInt32LE(offset+14))throw new Error('ZIP_INTEGRITY');
    if(name.includes('..')||name.startsWith('/')||entries.some(e=>e.name===name))throw new Error('ZIP_PATH');
    entries.push({name,data});offset=start+size;
  }
  if(!entries.length||buf.readUInt32LE(offset)!==0x02014b50||buf.readUInt32LE(buf.length-22)!==0x06054b50)throw new Error('ZIP_STRUCTURE');
  if(buf.readUInt16LE(buf.length-12)!==entries.length)throw new Error('ZIP_COUNT');
  return entries;
}
