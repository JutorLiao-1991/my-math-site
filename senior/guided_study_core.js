(function(root){
  'use strict';
  // Predictions are hypotheses, not scored answers. Only observed evidence and
  // the final explanation can complete a lesson.
  function create(lessons,save){
    let index=0,stage=0,prediction=null,observation=null,evidence='',prepared=false,context={};
    const current=()=>lessons[index];
    const validChoice=(n,options)=>Number.isInteger(n)&&n>=0&&n<options.length;
    const record=lesson=>{const r=save.get()[lesson.id];return r&&r.version===1&&typeof r.evidence==='string'&&validChoice(r.prediction,lesson.prediction.options)&&r.observation===lesson.observation.answer&&r.reason===lesson.reason.answer?r:null;};
    function select(n){if(!Number.isInteger(n)||!lessons[n])return false;index=n;stage=0;prediction=null;observation=null;evidence='';prepared=false;context={};return true;}
    return {
      get lesson(){return current();},get index(){return index;},get stage(){return stage;},get prediction(){return prediction;},get observation(){return observation;},get evidence(){return evidence;},get prepared(){return prepared;},
      get completed(){return lessons.filter(record).length;},get records(){return lessons.map(lesson=>({lesson,record:record(lesson)})).filter(x=>x.record);},
      select,
      predict(n){if(stage!==0||!validChoice(n,current().prediction.options))return false;prediction=n;stage=1;return true;},
      prepare(){if(stage!==1)return false;prepared=false;context={};current().prepare(context);prepared=true;return true;},
      notify(event){if(stage===1&&prepared&&current().onChange)current().onChange(context,event);},
      capture(){
        if(stage!==1||!prepared)return {ok:false,message:'先按「準備這個實驗」，再依指示操作。'};
        const result=current().check(context);
        if(result.ok&&typeof result.evidence==='string'&&result.evidence){evidence=result.evidence;stage=2;return result;}
        return {ok:false,message:result.message||'請先完成指定操作，再記錄結果。'};
      },
      observe(n){if(stage!==2||!validChoice(n,current().observation.options))return false;if(n!==current().observation.answer)return false;observation=n;stage=3;return true;},
      explain(n){
        if(stage!==3||n!==current().reason.answer)return false;
        save.set(current().id,{version:1,prediction,observation,reason:n,evidence});stage=4;return true;
      },
      resetAll(){lessons.forEach(lesson=>save.set(lesson.id,false));select(0);}
    };
  }
  const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ScienceGuideCore=api;
})(typeof window==='undefined'?globalThis:window);
