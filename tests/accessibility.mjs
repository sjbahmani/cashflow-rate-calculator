import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../hesabkesh/index.html',import.meta.url),'utf8');
const experience=readFileSync(new URL('../hesabkesh/experience.js',import.meta.url),'utf8');
const preference={matches:true};
const context=vm.createContext({document:{addEventListener(){}},matchMedia:()=>preference});
vm.runInContext(experience,context);
assert.equal(vm.runInContext('preferredScrollBehavior()',context),'auto');
preference.matches=false;
assert.equal(vm.runInContext('preferredScrollBehavior()',context),'smooth');
const elements=new Map();
function element(id) {
  if(!elements.has(id)) elements.set(id,{style:{},attributes:{},value:'',textContent:'',setAttribute(key,value){this.attributes[key]=value;},classList:{open:false,toggle(){this.open=!this.open;return this.open;}}});
  return elements.get(id);
}
const states=vm.createContext({document:{getElementById:element},resetInstallmentResult(){},resetLoanResult(){},refreshAccessibility(){}});
vm.runInContext('let instVariableMode=false;',states);
for(const name of ['toggleVariable','toggleGrace']) {
  const source=html.match(new RegExp('function '+name+'\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}'))[0];
  vm.runInContext(source,states);
}
vm.runInContext('toggleVariable()',states);
assert.equal(element('inst-var-toggle').attributes['aria-expanded'],'true');
vm.runInContext('toggleVariable()',states);
assert.equal(element('inst-var-toggle').attributes['aria-expanded'],'false');
vm.runInContext('toggleGrace()',states);
assert.equal(element('loan-grace-toggle').attributes['aria-expanded'],'true');
vm.runInContext('toggleGrace()',states);
assert.equal(element('loan-grace-toggle').attributes['aria-expanded'],'false');
console.log('Passed: reduced-motion preferences and programmatic disclosure state changes.');
