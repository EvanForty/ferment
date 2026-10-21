(function(){
  const $=id=>document.getElementById(id);
  const root=$('game'); if(!root) return;
  const JAR=document.querySelector('.jarstage img').src;
  const DAY_MS=12500, MAX_DAY=24, POOL_CAP=5000, STOCK_CAP=20;
  const TIERS=[{d:0,n:'Fresh',m:1},{d:6,n:'Tangy',m:1.5},{d:12,n:'Aged',m:2.2},{d:18,n:'Deep aged',m:3},{d:24,n:'Legendary',m:4}];
  const tierOf=d=>{let t=0;TIERS.forEach((x,i)=>{if(d>=x.d)t=i});return t;};

  /* pixel sprites, 8x8 */
  const PAL={g:'#86C45C',G:'#3F7A2A',w:'#FFF4E2',c:'#E2C9A0',r:'#E8401C',R:'#9E2410',b:'#7A4A2A',y:'#C9D96A'};
  const SPR={
    cabbage:["..GGGG..",".GggggG.","GgwggwgG","GggwwggG","GgwggwgG","GggwwggG",".GggggG.","..GGGG.."],
    chili:["......G.",".....gG.","....rr..","...rRr..","..rRr...",".rRr....",".rr.....","r......."],
    garlic:["...b....","...w....","..www...",".wcwcw..","wcwwwcw.","wcwwwcw.",".wcwcw..","..bbb..."],
    radish:["..G.g...","..gGg...","...g....","..www...","..wcw...","..www...","...w....","...w...."],
    scallion:[".g..g.g.",".g.G..g.","..gg.g..","...gGg..","...ggg..","...www..","...www..","...b.b.."],
    sprout:["........","........","........","...g.g..","....G...","....G...","....g...","........"]
  };
  function spr(n,s){const rows=SPR[n];let o='<svg class="spr" viewBox="0 0 8 8" width="'+s+'" height="'+s+'" shape-rendering="crispEdges" aria-hidden="true">';
    rows.forEach((r,y)=>{[...r].forEach((ch,x)=>{if(ch!=='.')o+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+PAL[ch]+'"/>'})});return o+'</svg>';}

  const CROPS={
    cabbage:{n:'Napa cabbage',t:20000},chili:{n:'Chili',t:12000},garlic:{n:'Garlic',t:8000},
    radish:{n:'Radish',t:15000},scallion:{n:'Scallion',t:10000}
  };
  const CK=Object.keys(CROPS);
  const RECIPES={
    baechu:{n:'Baechu kimchi',rar:'Common',base:6,need:{cabbage:2,chili:1,garlic:1}},
    pa:{n:'Pa kimchi',rar:'Common',base:5,need:{scallion:3,chili:1}},
    kkakdugi:{n:'Kkakdugi',rar:'Uncommon',base:10,need:{radish:2,chili:1,garlic:1}},
    baek:{n:'Baek kimchi',rar:'Uncommon',base:11,need:{cabbage:2,garlic:2,radish:1}},
    royal:{n:'Royal court kimchi',rar:'Rare',base:24,need:{cabbage:3,chili:2,garlic:2,radish:1,scallion:1},factory:1},
    emperor:{n:'Emperor’s crock',rar:'Legendary',base:60,need:{cabbage:4,chili:3,garlic:3,radish:2,scallion:2},factory:3}
  };
  const FACTORY=[
    null,
    {n:'Fermentation factory',cost:120,every:45000,recipe:'baechu',day:6,desc:'Makes a Tangy Baechu kimchi every 45 s, even while you’re away. Unlocks Royal court kimchi.'},
    {n:'Factory, tier 2',cost:400,every:30000,recipe:'kkakdugi',day:12,desc:'Makes an Aged Kkakdugi every 30 s.'},
    {n:'Automated line',cost:1200,every:20000,recipe:'baek',day:18,desc:'Makes a Deep aged Baek kimchi every 20 s. Unlocks Emperor’s crock.'}
  ];
  const TITLES=[[0,'Kitchen hand'],[100,'Line cook'],[500,'Sous chef'],[1500,'Head chef'],[5000,'Fermentation King']];
  const RESTAURANTS=['Grandma Oh’s Stew House','Mapo Night Market','Seoul Taco Truck','Jeju Sea Grill','Hanok Table','Busan Pier Diner','Gangnam Bistro'];

  const plotCost=n=>Math.round(20*Math.pow(1.45,n-4));
  const barrelCost=n=>Math.round(35*Math.pow(1.6,n-2));
  const fresh=()=>({v:1,coins:30,earned:0,plots:Array.from({length:4},()=>({c:null,t:0})),barrels:[null,null],
    inv:{cabbage:0,chili:0,garlic:0,radish:0,scallion:0},stock:[],factory:0,factoryAt:Date.now(),pool:POOL_CAP,burned:0,treasury:0,
    orders:{date:'',done:[]},seed:'cabbage',uid:1});

  let owner=null, S=load(null), log=[];
  function key(a){return 'ferment.save.'+(a||'guest');}
  function load(a){try{const s=JSON.parse(localStorage.getItem(key(a)));if(s&&s.v===1)return s;}catch(e){}return null;}
  function save(){try{localStorage.setItem(key(owner),JSON.stringify(S));}catch(e){}}
  if(!S) S=fresh();

  const fmt=n=>Math.floor(n).toLocaleString('en-US');
  function say(m){log.unshift(m);log=log.slice(0,4);$('gLog').innerHTML=log.map(x=>'<li>'+x+'</li>').join('');}
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
  function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function todaysOrders(){
    const k=today(), pool=['baechu','pa','kkakdugi','baek','royal'];
    return [0,1,2].map(i=>{const h=hash(k+':'+i);const r=pool[h%(S.factory>=1?5:4)];const minT=1+(h>>4)%3;
      const pay=Math.round(RECIPES[r].base*TIERS[minT].m*2+10);
      return {i,r,minT,pay,who:RESTAURANTS[(h>>8)%RESTAURANTS.length]};});
  }
  function barrelDay(b,now){return Math.min(MAX_DAY,Math.floor((now-b.at)/DAY_MS));}
  const value=it=>Math.round(RECIPES[it.r].base*TIERS[tierOf(it.d)].m);

  /* economy */
  function payout(v){const pay=Math.min(v,Math.floor(S.pool));S.pool-=pay;S.coins+=pay;S.earned+=pay;
    if(pay<v) say('The reward pool is running dry. Upgrades refill it.');return pay;}
  function spend(c){S.coins-=c;S.burned+=c*.5;S.pool=Math.min(POOL_CAP,S.pool+c*.3);S.treasury+=c*.2;}

  /* factory catch-up */
  function runFactory(now){
    const f=FACTORY[S.factory]; if(!f){S.factoryAt=now;return 0;}
    let made=0;
    while(now-S.factoryAt>=f.every){
      if(S.stock.length>=STOCK_CAP){S.factoryAt=now;break;}
      S.stock.push({id:S.uid++,r:f.recipe,d:f.day});S.factoryAt+=f.every;made++;
    }
    return made;
  }

  /* actions */
  const A={
    seed(k){S.seed=k;},
    plot(i){const p=S.plots[i],now=Date.now();
      if(!p.c){p.c=S.seed;p.t=now+CROPS[S.seed].t;}
      else if(now>=p.t){S.inv[p.c]++;say('Harvested '+CROPS[p.c].n.toLowerCase()+'.');p.c=null;}
      else return false;},
    harvestAll(){const now=Date.now();let n=0;S.plots.forEach(p=>{if(p.c&&now>=p.t){S.inv[p.c]++;p.c=null;n++;}});
      say(n?'Harvested '+n+' crop'+(n>1?'s':'')+'.':'Nothing is ripe yet.');},
    craft(r){const R=RECIPES[r];const bi=S.barrels.indexOf(null);if(bi<0||!canCraft(r))return false;
      for(const k in R.need)S.inv[k]-=R.need[k];S.barrels[bi]={r,at:Date.now()};say('Sealed '+R.n+' in barrel '+(bi+1)+'.');},
    unseal(i){const b=S.barrels[i];if(!b)return false;if(S.stock.length>=STOCK_CAP){say('Your stock is full. Sell some kimchi first.');return false;}
      const d=barrelDay(b,Date.now());S.stock.push({id:S.uid++,r:b.r,d});S.barrels[i]=null;say('Unsealed '+RECIPES[b.r].n+' at '+TIERS[tierOf(d)].n.toLowerCase()+' quality.');},
    sell(id){const ix=S.stock.findIndex(x=>x.id==id);if(ix<0)return false;const it=S.stock[ix];const p=payout(value(it));S.stock.splice(ix,1);say('Sold '+RECIPES[it.r].n+' for '+p+' $FERMENT.');},
    sellAll(){if(!S.stock.length){say('No finished kimchi to sell.');return;}let t=0;S.stock.forEach(it=>t+=payout(value(it)));const n=S.stock.length;S.stock=[];say('Sold '+n+' batch'+(n>1?'es':'')+' for '+t+' $FERMENT.');},
    fulfill(i){const o=todaysOrders()[i];if(S.orders.done.includes(+i))return false;const ix=matchOrder(o);if(ix<0)return false;
      S.stock.splice(ix,1);S.orders.done.push(+i);const p=payout(o.pay);say(o.who+' paid '+p+' $FERMENT for your order.');},
    buyPlot(){if(S.plots.length>=12)return false;const c=plotCost(S.plots.length);if(S.coins<c)return false;spend(c);S.plots.push({c:null,t:0});say('New plot tilled. '+fmt(c*.5)+' $FERMENT burned.');},
    buyBarrel(){if(S.barrels.length>=6)return false;const c=barrelCost(S.barrels.length);if(S.coins<c)return false;spend(c);S.barrels.push(null);say('New barrel added. '+fmt(c*.5)+' $FERMENT burned.');},
    buyFactory(){const f=FACTORY[S.factory+1];if(!f||S.coins<f.cost)return false;spend(f.cost);S.factory++;S.factoryAt=Date.now();say(f.n+' is running. '+fmt(f.cost*.5)+' $FERMENT burned.');},
    reset(){if(!confirm('Reset this farm? All progress for this save will be lost.'))return false;S=fresh();say('Farm reset.');}
  };
  function canCraft(r){const R=RECIPES[r];if(R.factory&&S.factory<R.factory)return false;for(const k in R.need)if(S.inv[k]<R.need[k])return false;return true;}
  function matchOrder(o){let best=-1;S.stock.forEach((it,ix)=>{if(it.r===o.r&&tierOf(it.d)>=o.minT&&(best<0||it.d<S.stock[best].d))best=ix;});return best;}

  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
    const r=A[b.dataset.act](b.dataset.arg);
    if(r!==false){save();render();}
  });

  /* rendering */
  let sig='';
  function signature(now){
    return [S.plots.map(p=>p.c?(now>=p.t?'R':'g'):'e').join(''),S.barrels.map(b=>b?tierOf(barrelDay(b,now)):'-').join(''),S.stock.length,S.factory,today()].join('|');
  }
  function render(){
    const now=Date.now();
    if(S.orders.date!==today()){S.orders={date:today(),done:[]};}
    const focusK=document.activeElement&&document.activeElement.dataset?document.activeElement.dataset.k:null;
    // HUD
    $('gCoins').textContent=fmt(S.coins);
    let t=TITLES[0][1];TITLES.forEach(x=>{if(S.earned>=x[0])t=x[1]});$('gTitle').textContent=t;
    $('gPool').textContent=fmt(S.pool)+' / '+fmt(POOL_CAP);$('gPoolBar').style.width=(S.pool/POOL_CAP*100)+'%';
    $('gBurned').textContent=fmt(S.burned);$('gTreasury').textContent=fmt(S.treasury);$('gEarned').textContent=fmt(S.earned);
    $('gSave').textContent=owner?'Saved to wallet '+owner.slice(0,4)+'…'+owner.slice(-4):'Playing as guest';
    // seeds
    $('gSeeds').innerHTML=CK.map(k=>'<button class="seed" role="radio" aria-checked="'+(S.seed===k)+'" data-act="seed" data-arg="'+k+'" data-k="s'+k+'">'+spr(k,18)+CROPS[k].n+' <small>'+CROPS[k].t/1000+'s</small></button>').join('');
    // plots
    let ph='';S.plots.forEach((p,i)=>{
      if(!p.c){ph+='<button class="plot" data-act="plot" data-arg="'+i+'" data-k="p'+i+'" aria-label="Empty plot, plant '+CROPS[S.seed].n+'"></button>';return;}
      const ready=now>=p.t;
      ph+='<button class="plot'+(ready?' ready':'')+'" data-act="plot" data-arg="'+i+'" data-k="p'+i+'" aria-label="'+CROPS[p.c].n+(ready?', ready to harvest':', growing')+'">'+spr(ready?p.c:'sprout',40)+
        (ready?'':'<span class="pb"><i data-plot="'+i+'"></i></span>')+'</button>';
    });
    for(let i=S.plots.length;i<12;i++)ph+='<div class="plot locked" aria-hidden="true"></div>';
    $('gPlots').innerHTML=ph;
    // inventory
    $('gInv').innerHTML=CK.map(k=>'<div title="'+CROPS[k].n+'">'+spr(k,26)+S.inv[k]+'</div>').join('');
    // recipes
    const free=S.barrels.includes(null);
    $('gRecipes').innerHTML=Object.entries(RECIPES).map(([id,R])=>{
      const locked=R.factory&&S.factory<R.factory;
      const ings=Object.entries(R.need).map(([k,n])=>'<span class="'+(S.inv[k]<n?'short':'')+'">'+spr(k,16)+S.inv[k]+'/'+n+'</span>').join('');
      return '<div class="recipe'+(locked?' locked':'')+'"><div class="rtop"><b>'+R.n+'</b><span class="rar '+R.rar+'">'+R.rar+'</span></div><div class="ings">'+ings+'</div>'+
        '<div class="rbot"><span>'+(locked?'Needs '+FACTORY[R.factory].n.toLowerCase():'Sells for '+R.base+' to '+R.base*4)+'</span>'+
        '<button class="btn small" data-act="craft" data-arg="'+id+'" data-k="c'+id+'"'+(locked||!canCraft(id)||!free?' disabled':'')+'>'+(free?'Craft & seal':'No free barrel')+'</button></div></div>';
    }).join('');
    // barrels
    $('gBarrels').innerHTML=S.barrels.map((b,i)=>{
      if(!b)return '<div class="barrel empty">Barrel '+(i+1)+' is empty. Craft a recipe to seal it here.</div>';
      const d=barrelDay(b,now),ti=tierOf(d),R=RECIPES[b.r];
      return '<div class="barrel"><img src="'+JAR+'" alt=""><div><div class="btop"><b>'+R.n+'</b><span data-bday="'+i+'">Day '+d+'</span></div>'+
        '<div class="bcells" data-bcells="'+i+'">'+cellsHTML(d)+'</div><div class="bbot"><span>'+TIERS[ti].n+', worth '+Math.round(R.base*TIERS[ti].m)+'</span>'+
        '<button class="btn small leaf" data-act="unseal" data-arg="'+i+'" data-k="b'+i+'">Unseal</button></div></div></div>';
    }).join('');
    // orders
    $('gOrders').innerHTML=todaysOrders().map(o=>{
      const done=S.orders.done.includes(o.i),has=matchOrder(o)>=0;
      return '<div class="order'+(done?' done':'')+'"><span>'+o.who+'</span><b>'+RECIPES[o.r].n+'</b><span>'+TIERS[o.minT].n+' or better</span><span class="pay">'+o.pay+' $FERMENT</span>'+
        '<button class="btn small" data-act="fulfill" data-arg="'+o.i+'" data-k="o'+o.i+'"'+(done||!has?' disabled':'')+'>'+(done?'Delivered':has?'Deliver':'Not in stock')+'</button></div>';
    }).join('');
    // stock
    $('gStockCount').textContent='('+S.stock.length+'/'+STOCK_CAP+')';
    $('gStock').innerHTML=S.stock.length?S.stock.slice().reverse().map(it=>'<div class="sitem"><img src="'+JAR+'" alt=""><div class="grow"><b>'+RECIPES[it.r].n+'</b><br>'+TIERS[tierOf(it.d)].n+', day '+it.d+'</div><span class="val">'+value(it)+'</span><button class="btn small" data-act="sell" data-arg="'+it.id+'" data-k="x'+it.id+'">Sell</button></div>').join('')
      :'<p class="emptynote">Unseal a barrel to stock finished kimchi here.</p>';
    // upgrades
    const pc=plotCost(S.plots.length),bc=barrelCost(S.barrels.length),nf=FACTORY[S.factory+1],cf=FACTORY[S.factory];
    let u='';
    u+=upHTML('More farmland','Plots '+S.plots.length+' of 12','Grow more crops at once.',S.plots.length<12?pc:null,'buyPlot');
    u+=upHTML('Fermentation barrel','Barrels '+S.barrels.length+' of 6','Ferment more batches side by side.',S.barrels.length<6?bc:null,'buyBarrel');
    u+='<div class="up"><div class="rtop"><b>'+(nf?nf.n:cf.n)+'</b><span class="rar Rare">Factory</span></div>'+
      (cf?'<p>Running: '+cf.n+'. Next batch in <span data-fnext>…</span></p><div class="fprog"><i data-fprog></i></div>':'')+
      (nf?'<p>'+nf.desc+'</p><button class="btn small" data-act="buyFactory" data-k="uf"'+(S.coins<nf.cost?' disabled':'')+'>Build for '+fmt(nf.cost)+' $FERMENT</button>':'<p>Your factory is fully upgraded.</p>')+'</div>';
    $('gUpgrades').innerHTML=u;
    sig=signature(now); tick(true);
    if(focusK){const el=root.querySelector('[data-k="'+focusK+'"]');if(el)el.focus();}
  }
  function upHTML(n,tag,desc,cost,act){
    return '<div class="up"><div class="rtop"><b>'+n+'</b><span>'+tag+'</span></div><p>'+desc+'</p>'+
      (cost==null?'<p>Maxed out.</p>':'<button class="btn small" data-act="'+act+'" data-k="u'+act+'"'+(S.coins<cost?' disabled':'')+'>Buy for '+fmt(cost)+' $FERMENT</button>')+'</div>';
  }
  function cellsHTML(d){const lit=Math.round(d/MAX_DAY*12);let o='';for(let i=0;i<12;i++)o+='<i class="'+(i<lit?'on'+(i>=10?' leg':i>=6?' aged':''):'')+'"></i>';return o;}

  function tick(fromRender){
    const now=Date.now();
    if(!fromRender){
      const made=runFactory(now);
      if(made){say('Your factory produced '+made+' batch'+(made>1?'es':'')+'.');save();}
      if(signature(now)!==sig){render();return;}
    }
    root.querySelectorAll('[data-plot]').forEach(el=>{const p=S.plots[el.dataset.plot];if(!p||!p.c)return;const tot=CROPS[p.c].t;el.style.width=Math.min(100,100-(p.t-now)/tot*100)+'%';});
    root.querySelectorAll('[data-bday]').forEach(el=>{const b=S.barrels[el.dataset.bday];if(b){const d=barrelDay(b,now);el.textContent='Day '+d+(d>=MAX_DAY?'':' of '+MAX_DAY);}});
    root.querySelectorAll('[data-bcells]').forEach(el=>{const b=S.barrels[el.dataset.bcells];if(b)el.innerHTML=cellsHTML(barrelDay(b,now));});
    const f=FACTORY[S.factory];
    if(f){const left=Math.max(0,f.every-(now-S.factoryAt));const a=root.querySelector('[data-fnext]'),p=root.querySelector('[data-fprog]');
      if(a)a.textContent=S.stock.length>=STOCK_CAP?'paused (stock full)':Math.ceil(left/1000)+' s';if(p)p.style.width=(100-left/f.every*100)+'%';}
  }

  /* wallet link: each wallet gets its own save */
  window.addEventListener('ferment:wallet',e=>{
    const a=e.detail||null; if(a===owner)return;
    save();
    let next=load(a);
    if(!next&&a){next=JSON.parse(JSON.stringify(S));say('Guest progress moved to your wallet save.');}
    owner=a; S=next||fresh(); save(); render();
  });

  runFactory(Date.now());
  render();
  say('Welcome to your farm. Plant some napa cabbage to get started.');
  setInterval(()=>tick(false),500);
  setInterval(save,5000);
  window.addEventListener('pagehide',save);
})();
