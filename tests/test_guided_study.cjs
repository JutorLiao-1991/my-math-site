const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../senior/guided_study_core.js');
function fixture(data={}){
  const store={get:()=>data,set:(key,value)=>{data[key]=value;}};
  const experiment={ready:false,actions:0};
  const lesson={id:'test',prediction:{options:['original wrong idea','alternative']},
    observation:{options:['observed','other'],answer:0},reason:{options:['other','reason'],answer:1},
    prepare(c){experiment.ready=false;c.actions=0;},
    onChange(c){c.actions++;experiment.actions=c.actions;},
    check(c){return experiment.ready&&c.actions>0?{ok:true,evidence:'Measured value: 2'}:{ok:false,message:'Operate first'};}};
  return {flow:create([lesson],store),experiment,data,lesson,store};
}
test('a prediction is preserved even when it disagrees with the final result',()=>{
  const {flow,experiment,data}=fixture();
  assert.equal(flow.explain(1),false);assert.equal(flow.completed,0);
  assert.equal(flow.predict(-1),false);assert.equal(flow.predict(0),true);
  assert.equal(flow.capture().ok,false);flow.prepare();
  assert.equal(flow.capture().ok,false);experiment.ready=true;
  assert.equal(flow.capture().ok,false);flow.notify({type:'input'});
  assert.equal(flow.capture().ok,true);assert.equal(flow.stage,2);
  assert.equal(flow.explain(1),false);assert.equal(flow.observe(1),false);
  assert.equal(flow.stage,2);assert.equal(flow.observe(0),true);
  assert.equal(flow.explain(0),false);assert.equal(flow.completed,0);
  assert.equal(flow.explain(1),true);assert.equal(flow.completed,1);
  assert.equal(data.test.prediction,0);assert.equal(data.test.evidence,'Measured value: 2');
});
test('restarting requires fresh preparation and evidence, retaining completed records',()=>{
  const {flow,experiment}=fixture();flow.predict(0);flow.prepare();flow.notify({});experiment.ready=true;
  flow.capture();flow.observe(0);flow.explain(1);flow.select(0);
  assert.equal(flow.completed,1);assert.equal(flow.stage,0);assert.equal(flow.evidence,'');
  assert.equal(flow.prepared,false);flow.predict(1);flow.notify({});
  assert.equal(flow.capture().ok,false);flow.prepare();experiment.ready=true;
  assert.equal(flow.capture().ok,false);flow.resetAll();assert.equal(flow.completed,0);
});
test('restoring completion does not restore an unfinished experiment or accept old quiz booleans',()=>{
  const {flow,experiment,lesson,store}=fixture();flow.predict(1);flow.prepare();flow.notify({});experiment.ready=true;
  flow.capture();flow.observe(0);flow.explain(1);
  const restored=create([lesson],store);assert.equal(restored.completed,1);assert.equal(restored.stage,0);
  assert.equal(restored.prepared,false);assert.equal(restored.prediction,null);
  for(const bad of [true,[],{version:1,evidence:'x',prediction:1,observation:0,reason:0},{version:1,evidence:'x',prediction:-1,observation:0,reason:1}])assert.equal(fixture({test:bad}).flow.completed,0);
});
test('lesson navigation isolates operation evidence and blocks out-of-order answers',()=>{
  const {lesson,store}=fixture();let ready=false;
  const lessons=[lesson,{...lesson,id:'second',prepare(c){c.seen=false;},onChange(c){c.seen=true;},check(c){return{ok:ready&&c.seen,evidence:'second'};}}];
  const flow=create(lessons,store);assert.equal(flow.select(20),false);
  flow.predict(0);flow.prepare();flow.notify({});assert.equal(flow.select(1),true);
  assert.equal(flow.observe(0),false);assert.equal(flow.explain(1),false);
  flow.predict(0);flow.prepare();ready=true;assert.equal(flow.capture().ok,false);
  flow.notify({});assert.equal(flow.capture().ok,true);assert.equal(flow.evidence,'second');
});
