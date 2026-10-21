(function(){
  /* ---------- fermentation demo ---------- */
  const cells=document.getElementById('cells'), N=12, DAYS=24;
  for(let i=0;i<N;i++) cells.appendChild(document.createElement('i'));
  const tiers=[[0,'Fresh batch'],[6,'Tangy'],[12,'Aged'],[18,'Deep aged'],[24,'Legendary']];
  const brew=document.getElementById('brew'), jar=document.getElementById('jar'), bubbles=document.getElementById('bubbles');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer=null, day=0;
  function render(){
    const lit=Math.round(day/DAYS*N);
    [...cells.children].forEach((c,i)=>{c.className=i<lit?('on'+(i>=10?' leg':i>=6?' aged':'')):''});
    let name=tiers[0][1]; tiers.forEach(t=>{if(day>=t[0])name=t[1]});
    document.getElementById('tierName').textContent=name;
    document.getElementById('dayCount').textContent='Day '+day+' of '+DAYS;
  }
  function bubble(){
    if(reduce) return;
    const b=document.createElement('span'); b.className='bubble';
    const s=[6,8,10][Math.floor(Math.random()*3)];
    b.style.width=b.style.height=s+'px';
    b.style.left=(5+Math.random()*85)+'%';
    b.style.animation='rise '+(1.6+Math.random()*1.4)+'s steps(12) forwards';
    bubbles.appendChild(b); setTimeout(()=>b.remove(),3200);
  }
  brew.addEventListener('click',()=>{
    if(timer) return;
    if(day>=DAYS){day=0;render();}
    brew.textContent='Fermenting…'; brew.disabled=true;
    timer=setInterval(()=>{
      day++; render(); bubble(); if(day%3===0) bubble();
      if(day>=DAYS){
        clearInterval(timer); timer=null; brew.disabled=false; brew.textContent='Start a new batch';
        jar.classList.remove('shake'); void jar.offsetWidth; jar.classList.add('shake');
      }
    },reduce?60:420);
  });
  render();

  /* ---------- tokenomics grid ---------- */
  const split=document.getElementById('split');
  for(let i=0;i<20;i++){const c=document.createElement('i');c.className=i<10?'b':i<16?'r':'d';split.appendChild(c);}

  /* ---------- flywheel svg ---------- */
  const labels=['More players','More production','More upgrades','More burns','More rewards'];
  const cx=280,cy=265,R=200,NS='http://www.w3.org/2000/svg';
  const pts=labels.map((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/5;return [cx+R*Math.cos(a),cy+R*Math.sin(a)*1.08]});
  const arcs=document.getElementById('arcs'), nodes=document.getElementById('nodes');
  const defs=document.createElementNS(NS,'defs');
  defs.innerHTML='<marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--leaf)"/></marker>';
  arcs.appendChild(defs);
  pts.forEach((p,i)=>{
    const q=pts[(i+1)%5];
    const a1=Math.atan2(p[1]-cy,p[0]-cx), a2=Math.atan2(q[1]-cy,q[0]-cx);
    const s=[cx+R*0.86*Math.cos(a1+0.38),cy+R*0.92*Math.sin(a1+0.38)];
    const e=[cx+R*0.86*Math.cos(a2-0.38),cy+R*0.92*Math.sin(a2-0.38)];
    const path=document.createElementNS(NS,'path');
    path.setAttribute('d','M'+s[0]+' '+s[1]+' A'+(R*0.86)+' '+(R*0.92)+' 0 0 1 '+e[0]+' '+e[1]);
    path.setAttribute('class','arc'); path.setAttribute('marker-end','url(#ah)');
    arcs.appendChild(path);
  });
  const nodeEls=pts.map((p,i)=>{
    const g=document.createElementNS(NS,'g'); g.setAttribute('class','node');
    const w=168,h=52;
    g.innerHTML='<rect x="'+(p[0]-w/2)+'" y="'+(p[1]-h/2)+'" width="'+w+'" height="'+h+'"/>'+
      '<text x="'+p[0]+'" y="'+(p[1]+9)+'" text-anchor="middle" font-size="28">'+labels[i]+'</text>';
    nodes.appendChild(g); return g;
  });
  let k=0;
  function step(){nodeEls.forEach((n,i)=>n.classList.toggle('active',i===k));k=(k+1)%5;}
  step(); if(!reduce) setInterval(step,1400);

  /* ---------- Solana wallet connect ---------- */
  const WALLETS=[
    {name:'Phantom',get:()=>window.phantom&&window.phantom.solana&&window.phantom.solana.isPhantom?window.phantom.solana:(window.solana&&window.solana.isPhantom?window.solana:null),url:'https://phantom.app/download'},
    {name:'Solflare',get:()=>window.solflare&&window.solflare.isSolflare?window.solflare:null,url:'https://solflare.com/download'},
    {name:'Backpack',get:()=>window.backpack&&window.backpack.solana?window.backpack.solana:(window.backpack&&window.backpack.isBackpack?window.backpack:null),url:'https://backpack.app/downloads'}
  ];
  let provider=null, pubkey=null;
  const modal=document.getElementById('modal'), wlist=document.getElementById('wlist');
  const walletBtn=document.getElementById('walletBtn'), menu=document.getElementById('walletMenu');
  const toastEl=document.getElementById('toast');
  function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),3200);}
  const short=a=>a.slice(0,4)+'…'+a.slice(-4);

  function openModal(){
    wlist.innerHTML='';
    WALLETS.forEach(w=>{
      const p=w.get(); const b=document.createElement('button'); b.className='wopt';
      b.innerHTML='<span>'+w.name+'<br><small>'+(p?'Ready to connect':'Not installed')+'</small></span>'+(p?'<span class="tag">Detected</span>':'<small>Install</small>');
      b.addEventListener('click',()=>p?connect(p,w.name):window.open(w.url,'_blank','noopener'));
      wlist.appendChild(b);
    });
    modal.classList.add('open'); wlist.querySelector('button').focus();
  }
  function closeModal(){modal.classList.remove('open');walletBtn.focus();}
  document.getElementById('mClose').addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modal.classList.contains('open'))closeModal();menu.classList.remove('open');}});

  async function connect(p,name){
    try{
      const res=await p.connect();
      const raw=(res&&res.publicKey)||p.publicKey;
      // Validate and normalise with the Solana web3.js SDK
      pubkey=new solanaWeb3.PublicKey(raw.toString());
      provider=p;
      try{localStorage.setItem('ferment.wallet',name);}catch(e){}
      p.on&&p.on('disconnect',onDisconnected);
      p.on&&p.on('accountChanged',k=>{if(k){pubkey=new solanaWeb3.PublicKey(k.toString());updateUI();}else onDisconnected();});
      updateUI(); modal.classList.remove('open');
      toast('Connected '+name+': '+short(pubkey.toBase58()));
    }catch(err){
      toast(err&&err.code===4001?'Connection request was rejected in your wallet.':'Couldn’t connect to '+name+'. Unlock the wallet and try again.');
    }
  }
  function onDisconnected(){provider=null;pubkey=null;updateUI();menu.classList.remove('open');}
  function updateUI(){
    window.dispatchEvent(new CustomEvent('ferment:wallet',{detail:pubkey?pubkey.toBase58():null}));
    if(pubkey){
      const a=pubkey.toBase58();
      walletBtn.innerHTML='<span class="dot"></span>'+short(a);
      walletBtn.classList.add('ghost');
      document.getElementById('menuAddr').textContent=a;
      document.querySelectorAll('[data-connect]').forEach(b=>b.textContent='Wallet connected: '+short(a));
    }else{
      walletBtn.textContent='Connect wallet'; walletBtn.classList.remove('ghost');
      document.querySelectorAll('[data-connect]').forEach((b,i)=>b.textContent=i===0?'Connect wallet to play':'Connect wallet');
    }
  }
  walletBtn.addEventListener('click',()=>{pubkey?menu.classList.toggle('open'):openModal();});
  document.querySelectorAll('[data-connect]').forEach(b=>b.addEventListener('click',()=>{if(!pubkey)openModal();}));
  document.getElementById('disconnect').addEventListener('click',async()=>{try{await provider.disconnect();}catch(e){} try{localStorage.removeItem('ferment.wallet');}catch(e){} onDisconnected();toast('Wallet disconnected.');});
  document.getElementById('copyAddr').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(pubkey.toBase58());toast('Address copied.');}catch(e){toast('Copy failed. Select the address and copy it manually.');}});
  document.addEventListener('click',e=>{if(!e.target.closest('.wallet-wrap'))menu.classList.remove('open');});

  // Reconnect silently to a previously trusted wallet
  window.addEventListener('load',()=>{
    let saved=null; try{saved=localStorage.getItem('ferment.wallet');}catch(e){}
    const w=WALLETS.find(x=>x.name===saved); const p=w&&w.get();
    if(p&&p.connect){p.connect({onlyIfTrusted:true}).then(r=>{pubkey=new solanaWeb3.PublicKey(((r&&r.publicKey)||p.publicKey).toString());provider=p;updateUI();}).catch(()=>{});}
  });
})();
