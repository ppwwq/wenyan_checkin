export const textSizes=[{value:20,label:'小'},{value:24,label:'標準'},{value:28,label:'大'},{value:32,label:'特大'}];

// Keep the existing account setting so old backups and synced preferences work.
export function textScale(value){
 const size=Number(value);
 return [20,24,28,32,36].includes(size)?size/24:1;
}
export function applyTextSize(value,root=document.documentElement){
 root.style.setProperty('--text-scale',String(textScale(value)));
}
