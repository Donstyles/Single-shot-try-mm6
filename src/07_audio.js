// 07_audio — WebAudio synth: one MusicDirector, SFX bank, master limiter. Owner: audio.
'use strict';

const Audio2 = {
  ctx:null, master:null, musicGain:null, sfxGain:null, started:false,
  director:{track:null,next:null,fade:0,t0:0,bar:0,timer:null},
  muted:false, musicVol:0.55, sfxVol:0.8,

  unlock(){
    if(this.started) return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      this.ctx=new AC();
      const comp=this.ctx.createDynamicsCompressor(); // master limiter
      comp.threshold.value=-12; comp.knee.value=6; comp.ratio.value=16; comp.attack.value=0.002; comp.release.value=0.18;
      this.master=this.ctx.createGain(); this.master.gain.value=0.9;
      this.musicGain=this.ctx.createGain(); this.musicGain.gain.value=this.musicVol;
      this.sfxGain=this.ctx.createGain(); this.sfxGain.gain.value=this.sfxVol;
      this.musicGain.connect(this.master); this.sfxGain.connect(this.master);
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.started=true;
      this._schedule();
    }catch(e){ /* audio unavailable — play silent */ }
  },
  setMuted(m){ this.muted=m; if(this.master) this.master.gain.value=m?0:0.9; },

  // ---------- synth voices ----------
  _env(g,t,a,d,peak){ g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.001,t+a+d); },
  pluck(freq,t,vol,dest,dur){
    const c=this.ctx,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();
    o.type='triangle'; o.frequency.value=freq;
    f.type='lowpass'; f.frequency.setValueAtTime(freq*5,t); f.frequency.exponentialRampToValueAtTime(freq*1.4,t+(dur||0.5));
    this._env(g,t,0.004,dur||0.5,vol);
    o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t+(dur||0.5)+0.1);
  },
  bell(freq,t,vol,dest){
    const c=this.ctx;
    for(const [m,v] of [[1,1],[2.76,0.4],[5.4,0.18]]){
      const o=c.createOscillator(),g=c.createGain();
      o.type='sine'; o.frequency.value=freq*m;
      this._env(g,t,0.005,1.6/m,vol*v);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t+2);
    }
  },
  pad(freq,t,dur,vol,dest){
    const c=this.ctx;
    for(const det of [-4,3]){
      const o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();
      o.type='sawtooth'; o.frequency.value=freq; o.detune.value=det;
      f.type='lowpass'; f.frequency.value=freq*3.2; f.Q.value=0.8;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+dur*0.35);
      g.gain.setValueAtTime(vol,t+dur*0.7); g.gain.linearRampToValueAtTime(0,t+dur);
      o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+0.1);
    }
  },
  drone(freq,t,dur,vol,dest){
    const c=this.ctx;
    for(const [m,v] of [[1,1],[0.5,0.7],[1.01,0.5]]){
      const o=c.createOscillator(),g=c.createGain();
      o.type=m===0.5?'sine':'triangle'; o.frequency.value=freq*m;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol*v,t+0.8);
      g.gain.setValueAtTime(vol*v,t+dur-0.8); g.gain.linearRampToValueAtTime(0,t+dur);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+0.1);
    }
  },
  noise(t,dur,vol,dest,hp,lp){
    const c=this.ctx, len=Math.ceil(c.sampleRate*dur), b=c.createBuffer(1,len,c.sampleRate), d=b.getChannelData(0);
    let seed=1234567; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff*2-1; };
    for(let i=0;i<len;i++) d[i]=rnd()*(1-i/len);
    const s=c.createBufferSource(); s.buffer=b;
    const f=c.createBiquadFilter(); f.type=lp?'bandpass':'highpass'; f.frequency.value=hp||800; if(lp)f.Q.value=0.7;
    const g=c.createGain(); g.gain.value=vol;
    s.connect(f); f.connect(g); g.connect(dest); s.start(t);
  },
  kick(t,vol,dest){
    const c=this.ctx,o=c.createOscillator(),g=c.createGain();
    o.type='sine'; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(38,t+0.12);
    this._env(g,t,0.002,0.22,vol);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.3);
  },

  // ---------- music director ----------
  // one director; tracks are pattern functions writing one bar ahead
  setTrack(name){
    const d=this.director;
    if(d.track===name||d.next===name) return;
    d.next=name;
  },
  _schedule(){
    const d=this.director, c=this.ctx;
    const loop=()=>{
      if(!this.started) return;
      const now=c.currentTime;
      if(d.next&&d.next!==d.track){ d.track=d.next; d.bar=0; }
      if(d.track&&now+0.15>d.t0){
        const barLen=this._writeBar(d.track,Math.max(now+0.05,d.t0),d.bar);
        d.t0=Math.max(now+0.05,d.t0)+barLen; d.bar++;
      }
      d.timer=setTimeout(loop,90);
    };
    d.t0=c.currentTime; loop();
  },
  _writeBar(track,t,bar){
    const g=this.musicGain, r=RNG.get('music');
    const min=[0,2,3,5,7,8,10], dor=[0,2,3,5,7,9,10];
    const n=(root,scale,deg,oct)=>root*Math.pow(2,(scale[deg%scale.length]+Math.floor(deg/scale.length)*12)/12+(oct||0));
    switch(track){
      case 'title':{
        const root=110, bl=3.2;
        this.drone(root,t,bl+0.4,0.05,g);
        this.pad(n(root,min,[0,3,4,3][bar%4],1),t,bl,0.05,g);
        this.bell(n(root,min,[0,2,4,7,4,2][bar%6],2),t+0.2,0.08,g);
        if(bar%2) this.bell(n(root,min,[4,7][bar%2],2),t+1.8,0.05,g);
        return bl;
      }
      case 'town':{
        const root=146.83, bl=2.4, sc=dor;
        this.drone(root/2,t,bl+0.3,0.035,g);
        const steps=[0,4,2,5,0,4,7,5];
        for(let i=0;i<4;i++){
          const deg=steps[(bar*4+i)%8]+ (r.chance(0.25)?2:0);
          this.pluck(n(root,sc,deg,1),t+i*(bl/4),0.075,g,0.4);
          if(i%2===0&&r.chance(0.5)) this.pluck(n(root,sc,deg+2,0),t+i*(bl/4)+bl/8,0.045,g,0.3);
        }
        if(bar%4===3) this.bell(n(root,sc,7,1),t+bl*0.5,0.04,g);
        return bl;
      }
      case 'wild':{
        const root=98, bl=3.0;
        this.drone(root,t,bl+0.5,0.05,g);
        this.pad(n(root,min,[0,5,3,4][bar%4],1),t,bl,0.045,g);
        if(r.chance(0.5)) this.pluck(n(root,min,r.int(0,6),2),t+r.next()*bl*0.6,0.04,g,0.7);
        if(bar%2===0) this.bell(n(root,min,[0,4][bar%4===0?0:1],2),t+0.3,0.03,g);
        return bl;
      }
      case 'dungeon':{
        const root=65.4, bl=3.6;
        this.drone(root,t,bl+0.6,0.07,g);
        if(bar%2===0) this.bell(n(root,min,[0,1,4,1][(bar/2)%4],2),t+0.4,0.045,g);
        if(r.chance(0.35)) this.noise(t+r.next()*bl*0.7,0.5,0.012,g,300,true);
        if(bar%4===2) this.pluck(n(root,min,1,1),t+bl*0.6,0.05,g,1.2);
        return bl;
      }
      case 'combat':{
        const root=110, bl=1.8, sc=min;
        this.kick(t,0.14,g); this.kick(t+bl*0.5,0.1,g); this.kick(t+bl*0.75,0.08,g);
        this.noise(t+bl*0.25,0.09,0.05,g,2200); this.noise(t+bl*0.75,0.09,0.04,g,2200);
        this.drone(root/2,t,bl+0.2,0.05,g);
        const riff=[0,0,3,0,5,4,3,2];
        for(let i=0;i<4;i++) this.pluck(n(root,sc,riff[(bar*4+i)%8],0),t+i*bl/4,0.06,g,0.22);
        if(bar%2) this.pad(n(root,sc,[3,4][bar%4===1?0:1],1),t,bl,0.03,g);
        return bl;
      }
      case 'victory':{
        const root=130.8, bl=2.8, sc=[0,2,4,5,7,9,11];
        this.pad(n(root,sc,0,1),t,bl,0.06,g);
        const mel=[0,2,4,7,4,7,9,11];
        this.bell(n(root,sc,mel[bar%8],1),t+0.1,0.09,g);
        this.bell(n(root,sc,mel[bar%8]+2,1),t+bl*0.5,0.05,g);
        return bl;
      }
    }
    return 2;
  },

  // ---------- sfx ----------
  sfx(name){
    if(!this.started||this.muted) return;
    const c=this.ctx,t=c.currentTime,g=this.sfxGain;
    switch(name){
      case 'swing': this.noise(t,0.12,0.10,g,900,true); break;
      case 'hit': this.noise(t,0.08,0.16,g,500,true); this.kick(t,0.10,g); break;
      case 'miss': this.noise(t,0.15,0.05,g,1600,true); break;
      case 'hurt': this.noise(t,0.12,0.14,g,400,true); this.pluck(110,t,0.1,g,0.15); break;
      case 'die': this.noise(t,0.5,0.14,g,300,true); this.drone(55,t,0.7,0.1,g); break;
      case 'mdie': this.noise(t,0.35,0.12,g,350,true); this.pluck(82,t,0.1,g,0.4); break;
      case 'bow': this.noise(t,0.06,0.08,g,1800,true); this.pluck(660,t,0.03,g,0.06); break;
      case 'spell_fire': this.noise(t,0.3,0.1,g,600,true); this.pluck(220,t,0.08,g,0.3); this.pluck(330,t+0.05,0.06,g,0.25); break;
      case 'spell_ice': this.bell(1240,t,0.07,g); this.noise(t,0.2,0.04,g,3000,true); break;
      case 'spell_spark': this.noise(t,0.12,0.1,g,2400,true); this.pluck(1100,t,0.05,g,0.1); break;
      case 'spell_stone': this.kick(t,0.13,g); this.noise(t,0.15,0.08,g,250,true); break;
      case 'spell_dark': this.drone(72,t,0.6,0.09,g); this.noise(t,0.4,0.05,g,200,true); break;
      case 'spell_mind': this.bell(880,t,0.05,g); this.bell(1108,t+0.08,0.05,g); break;
      case 'spell_light': this.bell(1318,t,0.08,g); this.pad(659,t,0.6,0.05,g); break;
      case 'heal': this.bell(880,t,0.06,g); this.bell(1174,t+0.1,0.06,g); break;
      case 'buff': this.bell(587,t,0.05,g); this.bell(880,t+0.08,0.05,g); break;
      case 'coin': this.bell(1980,t,0.05,g); this.bell(2640,t+0.03,0.04,g); break;
      case 'pickup': this.pluck(880,t,0.06,g,0.1); this.pluck(1320,t+0.05,0.05,g,0.1); break;
      case 'door': this.noise(t,0.25,0.08,g,180,true); this.pluck(98,t,0.05,g,0.2); break;
      case 'chest': this.pluck(392,t,0.06,g,0.15); this.bell(1568,t+0.1,0.05,g); break;
      case 'levelup': for(let i=0;i<4;i++) this.bell([523,659,784,1046][i],t+i*0.09,0.07,g); break;
      case 'quest': for(let i=0;i<3;i++) this.bell([659,830,988][i],t+i*0.11,0.07,g); break;
      case 'click': this.pluck(720,t,0.04,g,0.05); break;
      case 'error': this.pluck(140,t,0.08,g,0.15); break;
      case 'stairs': this.noise(t,0.4,0.06,g,220,true); break;
      case 'rest': this.pad(196,t,1.6,0.06,g); this.bell(392,t+0.4,0.04,g); break;
      case 'ambush': this.kick(t,0.15,g); this.drone(60,t,0.8,0.1,g); break;
      case 'turnmode': this.bell(440,t,0.05,g); this.pluck(220,t+0.05,0.05,g,0.1); break;
    }
  },
};
