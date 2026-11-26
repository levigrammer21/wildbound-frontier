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
function closingBrace(source,open){
  let depth=1;
  for(let index=open+1;index<source.length;index++){
    if(source[index]==='{')depth++;
    if(source[index]==='}')depth--;
    if(!depth)return index;
  }
  return -1;
}
function documentsBlock(source){
  const blank=blankComments(source);
  const tag=/match\s+\/databases\/\{([A-Za-z_]\w*)\}\/documents\s*\{/g;
  const matches=[...blank.matchAll(tag)];
  if(matches.length!==1)throw Error('Expected one database documents match. Use the instructions in README.md for your custom rules file.');
  const match=matches[0];
  const open=match.index+match[0].length-1;
  const close=closingBrace(blank,open);
  if(close!==-1)return {open,close,variable:match[1]};
  throw Error('Could not find the end of the database match. Copy the complete existing rules and try again.');
}
function markedRange(source,target){
  const starts=[...source.matchAll(/^[ \t]*\/\/ CAIRN BEGIN\b[^\r\n]*/gm)];
  const ends=[...source.matchAll(/^[ \t]*\/\/ CAIRN END[ \t]*/gm)];
  if(!starts.length&&!ends.length)return null;
  if(starts.length!==1||ends.length!==1)throw Error('Expected exactly one marked Cairn rules block. Review this rules file before replacing it.');
  const [start]=starts;
  const [end]=ends;
  const from=start.index;
  const to=end.index+end[0].length;
  if(from<=target.open||to>target.close||end.index<from+start[0].length)
    throw Error('The Cairn markers must be inside the database match.');
  const body=blankComments(source.slice(from+start[0].length,end.index));
  const match=/^\s*match\s+\/gameNamespaces\/cairnCrownV1\s*\{/.exec(body);
  const close=match?closingBrace(body,match[0].length-1):-1;
  if(close<0||body.slice(close+1).trim())throw Error('The markers must surround only the Cairn & Crown namespace.');
  return {from,to};
}
function merged(existingRules,packageRules){
  if(!/rules_version\s*=\s*['"]2['"]/.test(existingRules))
    throw Error('The published rules must use version 2. See the README before changing the version.');
  const blockStart=packageRules.indexOf(begin);
  const blockEnd=packageRules.indexOf(end);
  if(blockStart===-1||blockEnd<=blockStart)throw Error('The release rules file is incomplete.');
  const target=documentsBlock(existingRules);
  const block=packageRules.slice(blockStart,blockEnd+end.length).replaceAll('$(database)','$('+target.variable+')');
  const range=markedRange(existingRules,target);
  const surrounding=range?existingRules.slice(0,range.from)+existingRules.slice(range.to):existingRules;
  if(/match\s+\/gameNamespaces\/cairnCrownV1\b/.test(blankComments(surrounding)))
    throw Error('There is an unmarked Cairn match in the existing rules. Replace just that match using the README instructions.');
  if(range)return existingRules.slice(0,range.from)+block+existingRules.slice(range.to);
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
    message.textContent='The Cairn & Crown rules are ready. Review the output before publishing.';
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
