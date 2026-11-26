const begin='    // CAIRN BEGIN';
const end='    // CAIRN END';
const byId=id=>document.getElementById(id);
const existing=byId('existing');
const message=byId('result-status');
const output=byId('output');
const combined=byId('combined');

function blankComments(source){
  return source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
    matched=>matched.replace(/[^\n]/g,' '));
}
function documentsBlock(source){
  const blank=blankComments(source);
  const tag=/match\s+\/databases\/\{([A-Za-z_]\w*)\}\/documents\s*\{/g;
  const matches=[...blank.matchAll(tag)];
  if(matches.length!==1)throw Error('Expected one database documents match. Use the instructions in README.md for your custom rules file.');
  const match=matches[0];
  let depth=1;
  for(let index=match.index+match[0].length;index<blank.length;index++){
    if(blank[index]==='{')depth++;
    if(blank[index]==='}')depth--;
    if(!depth)return {close:index,variable:match[1]};
  }
  throw Error('Could not find the end of the database match. Copy the complete existing rules and try again.');
}
function merged(existingRules,packageRules){
  if(!/rules_version\s*=\s*['"]2['"]/.test(existingRules))
    throw Error('The published rules must use version 2. See the README before changing the version.');
  const blockStart=packageRules.indexOf(begin);
  const blockEnd=packageRules.indexOf(end);
  if(blockStart===-1||blockEnd<=blockStart)throw Error('The release rules file is incomplete.');
  const target=documentsBlock(existingRules);
  if(/\/gameNamespaces\/cairnCrownV1\b/.test(existingRules))
    throw Error('This namespace is already present. Keep the existing match and compare it to the release rules before making any update.');
  const block=packageRules.slice(blockStart,blockEnd+end.length).replaceAll('$(database)','$('+target.variable+')');
  const lineStart=existingRules.lastIndexOf('\n',target.close-1)+1;
  const insertion=/^\s*$/.test(existingRules.slice(lineStart,target.close))?lineStart:target.close;
  return existingRules.slice(0,insertion)+'\n'+block+'\n'+existingRules.slice(insertion);
}
byId('merge').addEventListener('click',async()=>{
  output.hidden=true;message.textContent='Preparing…';
  try{
    const response=await fetch('./firestore.rules',{cache:'no-cache'});
    if(!response.ok)throw Error('Upload firestore.rules beside this page and try again.');
    combined.value=merged(existing.value,await response.text());
    output.hidden=false;
    message.textContent='The Cairn & Crown block was added inside the database match. Review before publishing.';
    output.scrollIntoView({block:'nearest'});
  }catch(error){message.textContent=error.message;}
});
byId('copy').addEventListener('click',async(event)=>{
  const button=event.currentTarget;
  try{
    await navigator.clipboard.writeText(combined.value);
    button.textContent='Copied';
  }catch{
    combined.focus();combined.select();
    button.textContent='Selected · use your browser’s Copy action';
  }
});
