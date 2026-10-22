(function(root){
  'use strict';
  function parseFormula(s){if(typeof s!=='string'||!s.length)throw Error('化學式不可空白');let i=0;function group(nested){const result={};while(i<s.length&&s[i]!==')'){let atoms={};if(s[i]==='('){i++;atoms=group(true);if(s[i]!==')')throw Error('括號未閉合');i++;}else{const m=s.slice(i).match(/^[A-Z][a-z]?/);if(!m)throw Error('化學式格式錯誤');atoms[m[0]]=1;i+=m[0].length;}const m=s.slice(i).match(/^\d+/);const count=m?+m[0]:1;if(!Number.isSafeInteger(count)||count<=0)throw Error('下標須為正整數');if(m)i+=m[0].length;for(const [e,n]of Object.entries(atoms))result[e]=(result[e]||0)+n*count;}if(!Object.keys(result).length)throw Error('空括號');if(!nested&&i<s.length)throw Error('多餘括號');return result;}const r=group(false);if(i!==s.length)throw Error('化學式格式錯誤');return r;}
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  const reactions=[
    {id:'water',name:'氫氣燃燒',left:['H2','O2'],right:['H2O'],solution:[2,1,2],hint:'先看氧：右側一個水只有一個氧，左側氧氣有兩個氧。'},
    {id:'methane',name:'甲烷燃燒',left:['CH4','O2'],right:['CO2','H2O'],solution:[1,2,1,2],hint:'依序配碳、氫，最後配氧。'},
    {id:'propane',name:'丙烷燃燒',left:['C3H8','O2'],right:['CO2','H2O'],solution:[1,5,3,4],hint:'三個碳配三個 CO₂；八個氫配四個 H₂O。'},
    {id:'iron',name:'鐵的氧化（生成 Fe₂O₃）',left:['Fe','O2'],right:['Fe2O3'],solution:[4,3,2],hint:'氧的下標是 2 與 3，可先湊成 6 個氧。'},
    {id:'ammonia',name:'氨的合成',left:['N2','H2'],right:['NH3'],solution:[1,3,2],hint:'先讓右側有兩個氮，再核對氫。'},
    {id:'aluminum',name:'鋁與鹽酸',left:['Al','HCl'],right:['AlCl3','H2'],solution:[2,6,2,3],hint:'氯與氫分別有 3、2 的倍數限制，可先取最小公倍數 6。'},
    {id:'carbonate',name:'碳酸鈣與鹽酸',left:['CaCO3','HCl'],right:['CaCl2','CO2','H2O'],solution:[1,2,1,1,1],hint:'鈣與碳先配好，再看氯與氫。'},
    {id:'ethanol',name:'乙醇燃燒',left:['C2H5OH','O2'],right:['CO2','H2O'],solution:[1,3,2,3],hint:'乙醇本身已有一個氧；先配碳、氫，再扣除原有氧。'},
    {id:'glucose',name:'葡萄糖完全氧化',left:['C6H12O6','O2'],right:['CO2','H2O'],solution:[1,6,6,6],hint:'原有六個氧也要算入左側，不能只算 O₂。'},
    {id:'neutralization',name:'氫氧化鈣與鹽酸',left:['Ca(OH)2','HCl'],right:['CaCl2','H2O'],solution:[1,2,1,2],hint:'括號後的 2 同時乘到 O 與 H。'},
    {id:'decomposition',name:'氯酸鉀分解',left:['KClO3'],right:['KCl','O2'],solution:[2,2,3],hint:'氧的最小公倍數為 6，再核對鉀與氯。'},
    {id:'oxide',name:'氧化銅與氫氣',left:['CuO','H2'],right:['Cu','H2O'],solution:[1,1,1,1],hint:'有些反應式的所有係數都是 1，不必硬改。'}
  ];
  function balance(reaction,coeff){const fs=[...reaction.left,...reaction.right];if(coeff.length!==fs.length)throw Error('係數數量不符');const elements=[...new Set(fs.flatMap(s=>Object.keys(parseFormula(s))))];const valid=coeff.every(x=>Number.isSafeInteger(x)&&x>0);const rows=elements.map(e=>{let left=0,right=0;fs.forEach((f,i)=>{const n=(parseFormula(f)[e]||0)*(Number.isFinite(coeff[i])?coeff[i]:0);if(i<reaction.left.length)left+=n;else right+=n;});return{element:e,left,right};});const conserved=valid&&rows.every(r=>r.left===r.right);const divisor=valid?coeff.reduce(gcd):0;return{rows,valid,conserved,minimal:conserved&&divisor===1,divisor};}
  const samples=[
    {id:'lecture',name:'講義例題｜4.5 g 未知物',mass:4.5,water:2.7,co2:6.6,ratio:[1,2,1],molarMass:null,containsO:true},
    {id:'glucose',name:'含氧未知物 A｜給定分子量 180',mass:1.8,water:1.08,co2:2.64,ratio:[1,2,1],molarMass:180,containsO:true},
    {id:'ethanol',name:'含氧未知物 B｜給定分子量 46',mass:2.3,water:2.7,co2:4.4,ratio:[2,6,1],molarMass:46,containsO:true},
    {id:'acetic',name:'含氧未知物 C｜給定分子量 60',mass:3,water:1.8,co2:4.4,ratio:[1,2,1],molarMass:60,containsO:true},
    {id:'propane',name:'只含碳氫未知物 D｜給定分子量 44',mass:2.2,water:3.6,co2:6.6,ratio:[3,8,0],molarMass:44,containsO:false},
    {id:'benzene',name:'只含碳氫未知物 E｜給定分子量 78',mass:.78,water:.54,co2:2.64,ratio:[1,1,0],molarMass:78,containsO:false}
  ];
  function combustion(mass,water,co2){if(![mass,water,co2].every(x=>Number.isFinite(x)&&x>=0)||mass<=0)throw Error('質量資料不合理');const nWater=water/18,nH=nWater*2,mH=nH,nCO2=co2/44,nC=nCO2,mC=nC*12,mO=mass-mC-mH,nO=mO/16;return{nWater,nH,mH,nCO2,nC,mC,mO:Math.abs(mO)<1e-10?0:mO,nO:Math.abs(nO)<1e-10?0:nO,physical:mO>=-1e-8};}
  function empirical(ratio){return ratio.map((n,i)=>n?['C','H','O'][i]+(n===1?'':n):'').join('');}
  function empiricalMass(r){return r.reduce((s,n,i)=>s+n*[12,1,16][i],0);}
  const api={parseFormula,reactions,balance,samples,combustion,empirical,empiricalMass,gcd};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChemistryCore=api;
})(typeof window==='undefined'?globalThis:window);
