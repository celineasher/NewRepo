/* Waveroom Studio — dependency-free multitrack browser DAW.
   Copyright (c) 2026. MIT License. Web Audio synthesis and offline WAV rendering. */
'use strict';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const STEPS = 16;
const BARS = 8;
const ROLL_MAX = 83;
const ROLL_MIN = 48;
const PITCH_HEIGHT = 22;
const STEP_WIDTH = 51;
const PATTERNS = ['A','B','C','D'];
const STORAGE_KEY = 'waveroom-project-v1';
const DEF_TRACKS = [
  { id:'kick',  name:'Kick',     type:'drum',preset:'kick', color:'#eea16d',icon:'K',volume:.88,pan:0 },
  { id:'snare', name:'Snare',    type:'drum',preset:'snare',color:'#e994aa',icon:'S',volume:.65,pan:0 },
  { id:'hat',   name:'Hi-Hat',   type:'drum',preset:'hat',  color:'#d8ba78',icon:'H',volume:.40,pan:.08 },
  { id:'clap',  name:'Clap',     type:'drum',preset:'clap', color:'#8fd8b8',icon:'C',volume:.36,pan:0 },
  { id:'bass',  name:'Sub Bass', type:'melody',preset:'bass',color:'#bc99ff',icon:'B',volume:.68,pan:0 },
  { id:'keys',  name:'Electric Keys',type:'melody',preset:'keys',color:'#82baff',icon:'♫',volume:.68,pan:0 },
  { id:'lead',  name:'Lead Synth',type:'melody',preset:'lead',color:'#f5b9a9',icon:'L',volume:.43,pan:-.14 },
  { id:'pad',   name:'Dream Pad',type:'melody',preset:'pad', color:'#96c9d9',icon:'P',volume:.42,pan:.11 }
];
const PRESETS = {
 bass:'Analog Bass',keys:'Electric Piano',lead:'Neon Lead',pad:'Dream Pad',pluck:'Soft Pluck',organ:'Warm Organ',
 kick:'Deep Kick',snare:'Snare',hat:'Closed Hi-Hat',clap:'Hand Clap'
};
let state;
let ctx = null, master = null, analyser = null, compressor = null;
let channels = new Map(), noiseCache = new WeakMap();
let schedulerTimer = null, animationHandle = null;
let stepToSchedule = 0, nextStepTime = 0, playhead = 0, queue = [];
let activeSources = new Set();
let userDrag = null, toastTimer = null, saveTimer = null, lastMeter = 0;
let activeKeys = new Set();
const KEYMAP = {'z':60,'s':61,'x':62,'d':63,'c':64,'v':65,'g':66,'b':67,'h':68,'n':69,'j':70,'m':71,',':72};

function makeTrack(def){
 return {...def, attack:def.preset==='pad'?.32:.015, release:def.preset==='pad'?.65:.22, cutoff:def.preset==='bass'?1100:7000,
  patterns:Object.fromEntries(PATTERNS.map(p=>[p,[]])),clips:Array(BARS).fill('A'),mute:false,solo:false};
}
function makeProject(demo=true){
 const tracks=DEF_TRACKS.map(makeTrack);
 const s={version:1,name:demo?'Midnight Drive':'Untitled Project',bpm:124,swing:8,master:.76,loop:true,metronome:false,tracks};
 if(demo){
  const add=(id,p,notes)=>{const t=tracks.find(x=>x.id===id);t.patterns[p]=notes.map(([step,pitch,length=1,velocity=.83])=>({step,pitch,length,velocity}));};
  add('kick','A',[[0,36],[4,36],[8,36],[12,36]]);
  add('kick','B',[[0,36],[4,36],[8,36],[11,36],[12,36],[14,36]]);
  add('snare','A',[[4,38],[12,38]]);add('snare','B',[[4,38],[12,38],[15,38]]);
  add('hat','A',[[0,42],[2,42],[4,42],[6,42],[8,42],[10,42],[12,42],[14,42]]);
  add('hat','B',Array.from({length:16},(_,i)=>[i,42,1,i%2?.5:.75]));
  add('clap','A',[[4,39],[12,39]]);add('clap','B',[[4,39],[12,39],[15,39]]);
  add('bass','A',[[0,36,3],[4,36,2],[7,43,1],[8,41,3],[12,43,2],[15,41,1]]);
  add('bass','B',[[0,36,4],[5,43,2],[8,41,2],[11,39,1],[12,43,2],[15,43,1]]);
  add('keys','A',[[0,60,3],[0,64,3],[0,67,3],[4,64,2],[7,67,1],[8,57,3],[8,60,3],[8,64,3],[12,60,2],[14,62,2]]);
  add('keys','B',[[0,60,3],[0,63,3],[0,67,3],[4,67,2],[6,70,2],[8,58,4],[8,62,4],[8,65,4],[12,63,2],[14,65,2]]);
  add('lead','A',[[2,72,2],[6,71,2],[10,67,2],[14,69,2]]);
  add('lead','B',[[0,72,2],[3,74,1],[5,75,2],[8,74,2],[11,72,3],[15,67,1]]);
  add('pad','A',[[0,48,8],[0,55,8],[0,60,8],[8,53,8],[8,57,8],[8,60,8]]);
  add('pad','B',[[0,46,8],[0,53,8],[0,58,8],[8,48,8],[8,55,8],[8,60,8]]);
  for(const t of tracks){ t.clips=[...'AAAABBAA'];if(t.id==='lead')t.clips=[null,'A','A','A','B','B','A','B'];if(t.id==='pad')t.clips=[...'AAAABBBB']; }
 }
 return s;
}
function validNote(n){return n&&Number.isFinite(n.step)&&Number.isFinite(n.pitch)&&Number.isFinite(n.length)&&n.step>=0&&n.step<16&&n.length>0&&n.length<=16&&n.pitch>=24&&n.pitch<=108;}
function sanitizeProject(x){
 if(!x||typeof x!=='object'||!Array.isArray(x.tracks))throw Error('Invalid Waveroom project file');
 const s=makeProject(false);s.name=String(x.name||'Imported Project').slice(0,64);
 s.bpm=clamp(Number(x.bpm)||124,50,240);s.swing=clamp(Number(x.swing)||0,0,65);s.master=clamp(Number(x.master)||.75,0,1);s.loop=x.loop!==false;s.metronome=!!x.metronome;
 s.tracks=x.tracks.slice(0,24).map((item,i)=>{
  const t=makeTrack(DEF_TRACKS.find(d=>d.id===item.id)||{id:`custom-${i}`,name:'Instrument '+(i+1),type:'melody',preset:'keys',color:'#9fb3ef',icon:'♫',volume:.6,pan:0});
  t.name=String(item.name||t.name).slice(0,36);t.type=item.type==='drum'?'drum':'melody';
  t.preset=PRESETS[item.preset]?item.preset:t.preset;t.volume=clamp(Number(item.volume),0,1)||0;
  t.pan=clamp(Number(item.pan)||0,-1,1);t.attack=clamp(Number(item.attack)||.015,.001,1.5);t.release=clamp(Number(item.release)||.2,.03,3);t.cutoff=clamp(Number(item.cutoff)||7000,100,16000);
  t.mute=!!item.mute;t.solo=!!item.solo;
  t.clips=Array.from({length:BARS},(_,idx)=>PATTERNS.includes(item.clips?.[idx])?item.clips[idx]:null);
  for(const p of PATTERNS)t.patterns[p]=(Array.isArray(item.patterns?.[p])?item.patterns[p]:[]).filter(validNote).slice(0,100).map(n=>({step:Math.floor(n.step),pitch:Math.floor(n.pitch),length:clamp(Math.floor(n.length),1,16),velocity:clamp(Number(n.velocity)||.8,.05,1)}));
  return t;
 });
 if(!s.tracks.length)throw Error('Project contains no tracks');return s;
}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function esc(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function trackById(id){return state.tracks.find(t=>t.id===id);}
function currentTrack(){return trackById(ui.trackId)||state.tracks[0];}
function notesOf(t= currentTrack(),p=ui.pattern){return t.patterns[p]||[];}
function markChanged(){clearTimeout(saveTimer);$('#savedStatus').textContent='● Unsaved changes';saveTimer=setTimeout(saveLocal,350);}
function saveLocal(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));$('#savedStatus').textContent='● Saved locally';}catch(e){$('#savedStatus').textContent='● Local save unavailable';}}
function setStatus(msg){$('#statusMessage').textContent=msg;}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);setStatus(msg);}
function download(text,filename,type){const blob=text instanceof Blob?text:new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function safeFilename(s){return s.toLowerCase().replace(/[^a-z0-9-_ ]/g,'').replace(/\s+/g,'-')||'waveroom';}
const ui={trackId:'keys',pattern:'A',view:'piano'};

function renderTrackList(){
 $('#trackCount').textContent=state.tracks.length;
 $('#trackList').innerHTML=state.tracks.map(t=>`<div class="track-card ${t.id===ui.trackId?'selected':''}" data-track="${esc(t.id)}" style="--track:${t.color}"><span class="track-icon">${esc(t.icon)}</span><div class="track-card-info"><strong>${esc(t.name)}</strong><small>${t.type==='drum'?'Drum machine':PRESETS[t.preset]||'Synthesizer'}</small></div><span class="track-dot"></span></div>`).join('');
}
function renderArrangement(){
 $('#arrangementRuler').innerHTML=Array.from({length:BARS},(_,i)=>`<div class="ruler-bar" data-seek="${i}">${String(i+1).padStart(2,'0')} <span>· 1</span></div>`).join('');
 $('#arrangementTracks').innerHTML=state.tracks.map(t=>`<div class="arrangement-row" style="--track:${t.color}">${t.clips.map((p,bar)=>{
 const notes=p?t.patterns[p]:[];
 let mini='';if(notes&&notes.length){const pitches=notes.map(n=>n.pitch);const lo=Math.min(...pitches),range=Math.max(1,Math.max(...pitches)-lo);mini=notes.slice(0,65).map(n=>`<i style="left:${n.step/16*100}%;width:${Math.min(n.length,16-n.step)/16*100}%;bottom:${(n.pitch-lo)/range*80}%"></i>`).join('');}
 return `<div class="arrangement-cell" data-bar="${bar}" data-track="${esc(t.id)}">${p?`<div class="clip ${t.id===ui.trackId&&p===ui.pattern?'selected-clip':''}"><span class="clip-label">${p}</span><div class="clip-mini">${mini}</div></div>`:'<div class="empty-clip">+</div>'}</div>`;
 }).join('')}</div>`).join('');
 updatePlayhead();
}
function renderSwitch(){
 $('#maximizeEditor').classList.toggle('active',$('.main-panel').classList.contains('editor-maximized'));
 $('#maximizeEditor').textContent=$('.main-panel').classList.contains('editor-maximized')?'↙ Show arrangement':'↗ Focus editor';
 $$('.pattern-switch button').forEach(b=>b.classList.toggle('active',b.dataset.pattern===ui.pattern));
 $$('.editor-tab').forEach(b=>b.classList.toggle('active',b.dataset.view===ui.view));
 const t=currentTrack();$('#editorTarget').textContent=`● ${t.name}`;$('#editorTarget').style.color=t.color;
}
function pitchName(p){const n=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];return n[p%12]+(Math.floor(p/12)-1);}
function renderEditor(){
 const editor=$('#editorArea');
 if(ui.view==='piano'){
  const t=currentTrack();const melody=t.type==='melody'?t:state.tracks.find(t=>t.type==='melody');
  if(melody&&melody!==t){ui.trackId=melody.id;renderTrackList();renderSwitch();}
  let pitchLabels='',pitchBands='';
  for(let p=ROLL_MAX;p>=ROLL_MIN;p--){let y=(ROLL_MAX-p)*PITCH_HEIGHT;let black=[1,3,6,8,10].includes(p%12);pitchLabels+=`<div class="pitch-label ${black?'black-note':''} ${p%12===0?'c-note':''}">${pitchName(p)}</div>`;if(black||p%12===0)pitchBands+=`<div class="${black?'roll-black':'roll-c'}" style="top:${y}px"></div>`;}
  editor.innerHTML=`<div class="roll-shell"><div class="pitch-labels">${pitchLabels}</div><div class="roll-main" id="rollMain" style="--track:${currentTrack().color}">${pitchBands}<div class="roll-notes" id="rollNotes"></div><div class="step-play-marker" id="rollMarker" style="display:none"></div></div></div><div class="piano-keyboard"><div class="keyboard-info"><strong>Live keyboard</strong><small>Z to M · C4–C5</small></div><div class="keys-visual" id="keysVisual"></div></div>`;
  makeVisualKeyboard();renderPianoNotes();
  editor.scrollTop=475;
 }else if(ui.view==='drums')renderDrums();else renderMixer();
 updatePlayhead();
}
function renderPianoNotes(){
 const overlay=$('#rollNotes');if(!overlay)return;
 const t=currentTrack();overlay.innerHTML=notesOf(t).map((n,i)=>{if(n.pitch<ROLL_MIN||n.pitch>ROLL_MAX)return '';
 return `<div class="note-block" data-note="${i}" style="--track:${t.color};left:${n.step*STEP_WIDTH+2}px;top:${(ROLL_MAX-n.pitch)*PITCH_HEIGHT+2}px;width:${Math.min(n.length,16-n.step)*STEP_WIDTH-4}px">${pitchName(n.pitch)}<span class="note-resize" data-resize="1"></span></div>`;}).join('');
}
function makeVisualKeyboard(){
 const root=$('#keysVisual');if(!root)return;
 const whitePitches=[];for(let p=60;p<=84;p++)if(![1,3,6,8,10].includes(p%12))whitePitches.push(p);
 let html=whitePitches.map(p=>`<div class="white-key" data-pitch="${p}">${p%12===0?pitchName(p):''}</div>`).join('');
 for(let p=60;p<84;p++)if([1,3,6,8,10].includes(p%12)){
  const prev=whitePitches.filter(x=>x<p).length;
  html+=`<div class="black-key" data-pitch="${p}" style="left:${prev*26}px"></div>`;
 }
 root.innerHTML=html;
}
function renderDrums(){
 const drums=state.tracks.filter(t=>t.type==='drum');
 $('#editorArea').innerHTML=`<div class="drum-editor"><div class="drum-editor-heading"><div><h3>Step sequencer</h3><p>Program your rhythm. Each bar has 16 steps.</p></div><span class="small-label">1/16 GRID</span></div><div class="drum-counts">${Array.from({length:16},(_,i)=>`<span>${i%4===0?i/4+1:'+'}</span>`).join('')}</div><div class="drum-editor-grid">${drums.map(t=>`<div class="drum-line" style="--track:${t.color}"><div class="drum-line-name" data-track="${esc(t.id)}"><span class="track-icon">${esc(t.icon)}</span>${esc(t.name)}</div><div class="drum-steps">${Array.from({length:16},(_,i)=>`<button class="drum-step ${i%4===0?'beat-start':''} ${t.patterns[ui.pattern].some(n=>n.step===i)?'on':''}" data-track="${esc(t.id)}" data-step="${i}" title="${esc(t.name)} at step ${i+1}" aria-label="${esc(t.name)} step ${i+1}"><span>${i+1}</span></button>`).join('')}</div></div>`).join('')}</div><div class="drum-help">Tip: Select A–D above to program alternate rhythms. In the arrangement, click a clip to swap patterns and build your song. Press Space to hear the beat.</div></div>`;
}
function renderMixer(){
 $('#editorArea').innerHTML=`<div class="mixer-editor">${state.tracks.map(t=>`<div class="mixer-channel ${t.id===ui.trackId?'selected':''}" data-track="${esc(t.id)}" style="--track:${t.color}"><div class="track-icon">${esc(t.icon)}</div><strong>${esc(t.name)}</strong><small>${Math.round(t.volume*100)}%</small><div class="mixer-fader"><input type="range" orient="vertical" min="0" max="100" value="${Math.round(t.volume*100)}" data-mix-volume="${esc(t.id)}" aria-label="${esc(t.name)} volume"/></div><div class="mixer-m-buttons"><button class="${t.mute?'active':''}" data-mute="${esc(t.id)}" title="Mute">M</button><button class="${t.solo?'solo-active':''}" data-solo="${esc(t.id)}" title="Solo">S</button></div><input class="mixer-pan" type="range" min="-100" max="100" value="${Math.round(t.pan*100)}" data-mix-pan="${esc(t.id)}" aria-label="${esc(t.name)} panning"/><small>PAN ${Math.round(t.pan*100)}</small></div>`).join('')}</div>`;
}
function controlHtml(name,label,val,min,max,step,unit){
 return `<div class="inspector-control"><div class="control-heading"><label for="${name}">${label}</label><output id="${name}Out">${unit==='%'?Math.round(val*100):unit==='ms'?Math.round(val*1000):Math.round(val)}${unit}</output></div><input id="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
}
function renderInspector(){
 const t=currentTrack();const drum=t.type==='drum';
 let opts=(drum?['kick','snare','hat','clap']:['keys','bass','lead','pad','pluck','organ']).map(p=>`<option value="${p}" ${t.preset===p?'selected':''}>${PRESETS[p]}</option>`).join('');
 $('#inspector').innerHTML=`<div class="inspector-body"><div class="inspector-track-title"><span class="track-icon" style="--track:${t.color}">${esc(t.icon)}</span><div><h3>${esc(t.name)}</h3><small>${drum?'Drum synthesizer':'Polyphonic synthesizer'}</small></div></div><label class="inspector-label" for="presetSelect">SOUND PRESET</label><div class="select-wrap"><select id="presetSelect">${opts}</select><svg><use href="#i-chevron"/></svg></div><div class="inspector-label">TRACK MIX</div>${controlHtml('trackVolume','Volume',t.volume,0,1,.01,'%')}${controlHtml('trackPan','Stereo pan',Math.round(t.pan*100),-100,100,1,'')}${drum?'':`<div class="inspector-divider"></div><div class="inspector-label">SYNTH ENVELOPE</div>${controlHtml('trackAttack','Attack',t.attack,.001,1.2,.001,'ms')}${controlHtml('trackRelease','Release',t.release,.04,2,.01,'ms')}${controlHtml('trackCutoff','Filter cutoff',t.cutoff,200,12000,100,'Hz')}`}<div class="inspector-divider"></div><label class="inspector-label">WAVEFORM</label><div class="sound-visual">${Array.from({length:42},(_,i)=>`<span style="height:${4+Math.abs(Math.sin(i*.32)*Math.cos(i*.055)*Math.sin(i*.7)*66)}px"></span>`).join('')}</div></div>`;
 $('#trackVolume').addEventListener('input',e=>{t.volume=Number(e.target.value);$('#trackVolumeOut').textContent=Math.round(t.volume*100)+'%';updateChannelLevels();markChanged();});
 $('#trackPan').addEventListener('input',e=>{t.pan=Number(e.target.value)/100;$('#trackPanOut').textContent=Math.round(t.pan*100);updateChannelLevels();markChanged();});
 $('#presetSelect').addEventListener('change',e=>{t.preset=e.target.value;markChanged();renderInspector();renderTrackList();toast(`Sound: ${PRESETS[t.preset]}`);});
 for(const [name,prop] of [['trackAttack','attack'],['trackRelease','release'],['trackCutoff','cutoff']]){
  const el=$('#'+name);if(el)el.addEventListener('input',e=>{t[prop]=Number(e.target.value);$('#'+name+'Out').textContent=prop==='cutoff'?Math.round(t[prop])+'Hz':Math.round(t[prop]*1000)+'ms';markChanged();});
 }
}
function renderAll(){renderTrackList();renderArrangement();renderSwitch();renderEditor();renderInspector();renderTransport();}
function renderTransport(){
 $('#projectName').value=state.name;$('#bpmInput').value=state.bpm;$('#swingInput').value=state.swing;
 $('#masterVolume').value=Math.round(state.master*100);$('#masterValue').textContent=Math.round(state.master*100)+'%';
 $('#loopBtn').classList.toggle('on',state.loop);$('#metronomeBtn').classList.toggle('on',state.metronome);
 updateTimeDisplay();
}
function updateTimeDisplay(){
 const bar=Math.floor(playhead/16)+1,beat=Math.floor(playhead%16/4)+1,ticks=Math.floor(playhead%4)*25;
 $('#timeDisplay').textContent=`${String(bar).padStart(2,'0')} : ${String(beat).padStart(2,'0')} : ${String(ticks).padStart(2,'0')}`;
}
function updatePlayhead(){
 const pos=clamp(playhead/(BARS*STEPS)*100,0,100);
 const el=$('#arrangementPlayhead');if(el)el.style.left=pos+'%';
 const marker=$('#rollMarker');if(marker){marker.style.left=((playhead%16)*STEP_WIDTH)+'px';marker.style.display=ctx&&schedulerTimer?'block':'none';}
}
function selectTrack(id){if(!trackById(id))return;ui.trackId=id;if(currentTrack().type==='drum'&&ui.view==='piano')ui.view='drums';renderTrackList();renderSwitch();renderEditor();renderInspector();renderArrangement();}

/* Audio engine */
function audioAvailable(){return typeof (window.AudioContext||window.webkitAudioContext)==='function';}
async function ensureAudio(){
 if(ctx){if(ctx.state==='suspended')await ctx.resume();return;}
 if(!audioAvailable()){toast('Your browser does not support Web Audio');throw Error('Web Audio unsupported');}
 ctx=new (window.AudioContext||window.webkitAudioContext)();
 master=ctx.createGain();master.gain.value=state.master;
 compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-13;compressor.knee.value=16;compressor.ratio.value=3;compressor.attack.value=.003;compressor.release.value=.17;
 analyser=ctx.createAnalyser();analyser.fftSize=256;
 master.connect(compressor).connect(analyser).connect(ctx.destination);
 state.tracks.forEach(makeChannel);updateChannelLevels();
 $('#engineStatus').textContent=ctx.sampleRate+'Hz';
}
function makeChannel(t,context=ctx,destination=master){
 const gain=context.createGain();gain.gain.value=t.volume*t.volume;
 let pan=context.createStereoPanner?context.createStereoPanner():context.createGain();
 if(pan.pan)pan.pan.value=t.pan;
 gain.connect(pan).connect(destination);
 if(context===ctx)channels.set(t.id,{gain,pan});return gain;
}
function updateChannelLevels(){
 const anySolo=state.tracks.some(t=>t.solo);
 state.tracks.forEach(t=>{
  const node=channels.get(t.id);if(!node||!ctx)return;
  node.gain.gain.setTargetAtTime(t.mute||(anySolo&&!t.solo)?0:t.volume*t.volume,ctx.currentTime,.014);
  if(node.pan.pan)node.pan.pan.setTargetAtTime(t.pan,ctx.currentTime,.014);
 });
}
function noteFrequency(note){return 440*Math.pow(2,(note-69)/12);}
function setEnv(g,t,attack,hold,release,peak){
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.00011,peak),t+Math.max(.002,attack));
 g.gain.setValueAtTime(Math.max(.00011,peak),t+Math.max(.002,attack)+Math.max(.001,hold));
 g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.002,attack)+Math.max(.001,hold)+Math.max(.025,release));
}
function makeNoise(context){
 if(noiseCache.has(context))return noiseCache.get(context);
 const buffer=context.createBuffer(1,Math.floor(context.sampleRate*1.5),context.sampleRate);
 const ar=buffer.getChannelData(0);for(let i=0;i<ar.length;i++)ar[i]=Math.random()*2-1;
 noiseCache.set(context,buffer);return buffer;
}
function startOsc(context,target,type,freq,t,end,gain=.2,detune=0){
 const osc=context.createOscillator();const level=context.createGain();
 osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.detune.value=detune;
 level.gain.value=gain;osc.connect(level).connect(target);osc.start(t);osc.stop(end);
 if(context===ctx){activeSources.add(osc);osc.onended=()=>activeSources.delete(osc);}return osc;
}
function noiseHit(context,target,t,duration,peak,filterFreq,filterType='highpass',burst=false){
 const src=context.createBufferSource();src.buffer=makeNoise(context);
 const filter=context.createBiquadFilter();filter.type=filterType;filter.frequency.setValueAtTime(filterFreq,t);filter.Q.value=.7;
 const env=context.createGain();env.gain.setValueAtTime(.0001,t);
 if(burst){
  for(let k=0;k<3;k++){
   let time=t+k*.015;env.gain.setValueAtTime(peak*(1-k*.23),time+.001);env.gain.exponentialRampToValueAtTime(.0001,time+.012);
  }
  env.gain.setValueAtTime(peak*.48,t+.05);env.gain.exponentialRampToValueAtTime(.0001,t+duration);
 }else{env.gain.setValueAtTime(peak,t+.001);env.gain.exponentialRampToValueAtTime(.0001,t+duration);}
 src.connect(filter).connect(env).connect(target);src.start(t);src.stop(t+duration+.02);
 if(context===ctx){activeSources.add(src);src.onended=()=>activeSources.delete(src);}
}
function drumHit(t,time,context,out,velocity){
 const kind=t.preset;const v=clamp(velocity,.05,1);
 if(kind==='kick'){
  const env=context.createGain();env.gain.setValueAtTime(.0001,time);env.gain.exponentialRampToValueAtTime(v*.85,time+.005);env.gain.exponentialRampToValueAtTime(.0001,time+.46);env.connect(out);
  const osc=startOsc(context,env,'sine',155,time,time+.48,1);
  osc.frequency.exponentialRampToValueAtTime(45,time+.12);osc.frequency.exponentialRampToValueAtTime(42,time+.43);
  noiseHit(context,out,time,.015,v*.16,1200,'highpass');
 }else if(kind==='snare'){
  noiseHit(context,out,time,.21,v*.60,1200,'highpass');
  const env=context.createGain();setEnv(env,time,.002,.025,.11,v*.34);env.connect(out);
  const osc=startOsc(context,env,'triangle',185,time,time+.16,.9);osc.frequency.exponentialRampToValueAtTime(115,time+.11);
 }else if(kind==='hat'){
  noiseHit(context,out,time,.078,v*.32,6500,'highpass');
 }else if(kind==='clap'){
  noiseHit(context,out,time,.19,v*.48,1350,'bandpass',true);
 }else noiseHit(context,out,time,.13,v*.35,3000);
}
function synthHit(t,pitch,time,seconds,context,out,velocity){
 const preset=t.preset;let f=noteFrequency(pitch);
 const bus=context.createGain();bus.gain.value=1;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(clamp(t.cutoff||7000,100,16000),time);
 bus.connect(filter).connect(out);
 const a=clamp(t.attack||.01,.002,1.5),r=clamp(t.release||.2,.03,3),vel=clamp(velocity,.05,1);
 const peak={bass:.32,keys:.31,lead:.23,pad:.17,pluck:.28,organ:.20}[preset]||.25;
 const duration=seconds;
 const env=context.createGain();env.connect(bus);
 const attack=preset==='keys'?.004:preset==='pluck'?.002:a;
 const release=preset==='keys'?.25:preset==='pluck'?.18:r;
 const hold=preset==='keys'?Math.min(duration,.32):preset==='pluck'?Math.min(duration,.09):duration;
 setEnv(env,time,attack,hold,release,peak*vel);
 const end=time+attack+hold+release+.04;
 if(preset==='bass'){
  filter.frequency.setValueAtTime(Math.min(t.cutoff,2000),time);filter.Q.value=1.5;
  startOsc(context,env,'sawtooth',f,time,end,.48);
  startOsc(context,env,'sine',f/2,time,end,.70);
 }else if(preset==='keys'){
  startOsc(context,env,'sine',f,time,end,.75);
  startOsc(context,env,'sine',f*2,time,end,.17);
  startOsc(context,env,'sine',f*3.01,time,end,.08);
 }else if(preset==='lead'){
  startOsc(context,env,'sawtooth',f,time,end,.33,-5);
  startOsc(context,env,'sawtooth',f,time,end,.33,5);
  startOsc(context,env,'triangle',f/2,time,end,.12);
 }else if(preset==='pad'){
  startOsc(context,env,'triangle',f,time,end,.34,-5);
  startOsc(context,env,'triangle',f,time,end,.34,5);
  startOsc(context,env,'sine',f/2,time,end,.35);
 }else if(preset==='pluck'){
  startOsc(context,env,'triangle',f,time,end,.56);
  startOsc(context,env,'sine',f*2,time,end,.19);
 }else if(preset==='organ'){
  startOsc(context,env,'sine',f,time,end,.48);
  startOsc(context,env,'sine',f*2,time,end,.28);
  startOsc(context,env,'sine',f*3,time,end,.15);
 }else startOsc(context,env,'sine',f,time,end,.5);
}
function clickMetronome(context,time,beat){
 const envelope=context.createGain();envelope.gain.setValueAtTime(.001,time);envelope.gain.exponentialRampToValueAtTime(beat===0?.20:.105,time+.003);envelope.gain.exponentialRampToValueAtTime(.0001,time+.065);envelope.connect(context===ctx?master:context.destination);
 startOsc(context,envelope,'sine',beat===0?1300:950,time,time+.07,.3);
}
function scheduleStep(step,time,context=ctx,offlineChannels=null){
 const bar=Math.floor(step/STEPS),within=step%STEPS,dur=60/state.bpm/4;
 if(state.metronome&&within%4===0)clickMetronome(context,time,within===0?0:1);
 const swing=(within%2===1?state.swing/100*.48*dur:0);
 for(const t of state.tracks){
  if(t.mute||state.tracks.some(x=>x.solo)&&!t.solo)continue;
  const pattern=t.clips[bar];if(!pattern)continue;
  const out=offlineChannels?offlineChannels.get(t.id):channels.get(t.id)?.gain;if(!out)continue;
  for(const n of t.patterns[pattern]){
   if(n.step!==within)continue;
   if(t.type==='drum')drumHit(t,time+swing,context,out,n.velocity);
   else synthHit(t,n.pitch,time+swing,n.length*dur*.93,context,out,n.velocity);
  }
 }
}
function scheduler(){
 if(!ctx||!schedulerTimer)return;
 const stepSeconds=60/state.bpm/4;
 while(nextStepTime<ctx.currentTime+.135){
  if(stepToSchedule>=STEPS*BARS){
   if(!state.loop){pausePlayback();playhead=0;updateTimeDisplay();updatePlayhead();return;}
   stepToSchedule=0;
  }
  scheduleStep(stepToSchedule,nextStepTime);
  queue.push({step:stepToSchedule,time:nextStepTime});
  nextStepTime+=stepSeconds;stepToSchedule++;
 }
}
async function togglePlay(){
 if(schedulerTimer){pausePlayback();return;}
 try{await ensureAudio();}catch(e){return;}
 stepToSchedule=Math.floor(playhead)%128;
 nextStepTime=ctx.currentTime+.065;queue=[];
 schedulerTimer=setInterval(scheduler,22);
 scheduler();animationHandle=requestAnimationFrame(animationLoop);
 $('#playBtn').innerHTML='<svg><use href="#i-pause"/></svg>';
 $('#engineStatus').textContent='PLAYING';toast('Transport playing');
}
function pausePlayback(){
 if(schedulerTimer){clearInterval(schedulerTimer);schedulerTimer=null;}
 if(animationHandle){cancelAnimationFrame(animationHandle);animationHandle=null;}
 for(const source of activeSources){try{source.stop();}catch(_){}}activeSources.clear();queue=[];
 $('#playBtn').innerHTML='<svg><use href="#i-play"/></svg>';
 $('#engineStatus').textContent='READY';updatePlayhead();
}
function stopPlayback(){pausePlayback();playhead=0;updateTimeDisplay();updatePlayhead();setStatus('Transport stopped');}
function animationLoop(){
 if(!schedulerTimer||!ctx)return;
 while(queue.length&&queue[0].time<=ctx.currentTime){playhead=queue.shift().step;updateTimeDisplay();updatePlayhead();}
 if(analyser&&performance.now()-lastMeter>45){
  lastMeter=performance.now();let data=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(data);
  const rms=data.reduce((a,b)=>a+b,0)/data.length/255;const n=clamp(Math.ceil(rms*28),0,12);
  $$('#masterMeters i').forEach((el,i)=>{el.classList.toggle('hot',i<n);el.classList.toggle('peak',i>=9&&i<n);el.style.height=(12+clamp(rms*150*Math.sin((i+3)*.4)**2,0,85))+'%';});
  $$('.drum-step').forEach(el=>el.classList.toggle('current',Number(el.dataset.step)===playhead%16));
 }
 animationHandle=requestAnimationFrame(animationLoop);
}
async function previewNote(pitch,track){
 try{await ensureAudio();}catch(e){return;}
 const t=track||currentTrack();const out=channels.get(t.id)?.gain;if(!out)return;
 if(t.type==='drum')drumHit(t,ctx.currentTime+.01,ctx,out,.85);
 else synthHit(t,pitch,ctx.currentTime+.01,.27,ctx,out,.75);
}
function recordNote(pitch){
 if(!ui.record||!schedulerTimer)return;
 const t=currentTrack();if(t.type!=='melody')return;
 const target=notesOf(t);const step=playhead%16;
 const existing=target.findIndex(n=>n.step===step&&n.pitch===pitch);
 if(existing>=0)target.splice(existing,1);
 target.push({step,pitch,length:1,velocity:.8});markChanged();renderPianoNotes();renderArrangement();
}
function setRecord(on){ui.record=on;$('#recordBtn').classList.toggle('armed',on);toast(on?'Live recording armed — play Z to M':'Recording disarmed');}

/* Offline audio export */
function encodeWav(buffer){
 const len=buffer.length,channels=2,bytes=44+len*channels*2;
 const ab=new ArrayBuffer(bytes),dv=new DataView(ab);
 const str=(off,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(off+i,s.charCodeAt(i));};
 str(0,'RIFF');dv.setUint32(4,bytes-8,true);str(8,'WAVE');str(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);
 dv.setUint16(22,channels,true);dv.setUint32(24,buffer.sampleRate,true);dv.setUint32(28,buffer.sampleRate*channels*2,true);dv.setUint16(32,channels*2,true);dv.setUint16(34,16,true);
 str(36,'data');dv.setUint32(40,len*channels*2,true);
 const l=buffer.getChannelData(0),r=buffer.numberOfChannels>1?buffer.getChannelData(1):l;
 let peak=1;for(let i=0;i<len;i++)peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));
 const mult=.95/peak;let offset=44;
 for(let i=0;i<len;i++)for(const smp of [l[i],r[i]]){const x=clamp(smp*mult,-1,1);dv.setInt16(offset,x<0?x*32768:x*32767,true);offset+=2;}
 return new Blob([ab],{type:'audio/wav'});
}
async function exportWav(){
 const btn=$('#exportWav');if(btn.disabled)return;
 btn.disabled=true;btn.textContent='Rendering audio…';setStatus('Rendering 8-bar mixdown');
 try{
  if(!window.OfflineAudioContext)throw Error('Offline WAV rendering not supported in this browser');
  const seconds=60/state.bpm*4*BARS+3,sampleRate=44100;
  const offline=new OfflineAudioContext(2,Math.ceil(seconds*sampleRate),sampleRate);
  const mix=offline.createGain();mix.gain.value=state.master;
  const comp=offline.createDynamicsCompressor();comp.threshold.value=-13;comp.knee.value=16;comp.ratio.value=3;
  mix.connect(comp).connect(offline.destination);
  const destinations=new Map();state.tracks.forEach(t=>destinations.set(t.id,makeChannel(t,offline,mix)));
  const prevMetronome=state.metronome;state.metronome=false;
  try{for(let i=0;i<STEPS*BARS;i++)scheduleStep(i,.05+i*(60/state.bpm/4),offline,destinations);}finally{state.metronome=prevMetronome;}
  const rendered=await offline.startRendering();
  download(encodeWav(rendered),safeFilename(state.name)+'.wav','audio/wav');
  toast('WAV exported — 44.1 kHz stereo');
 }catch(err){console.error(err);toast('Export failed: '+err.message);}
 finally{btn.disabled=false;btn.innerHTML='<svg><use href="#i-download"/></svg> Export WAV';}
}

/* Editing and UI events */
function eventGridPosition(e,root){
 const rect=root.getBoundingClientRect();
 return {step:clamp(Math.floor((e.clientX-rect.left)/STEP_WIDTH),0,15),pitch:clamp(ROLL_MAX-Math.floor((e.clientY-rect.top)/PITCH_HEIGHT),ROLL_MIN,ROLL_MAX)};
}
function editPianoStart(e){
 if(ui.view!=='piano'||e.button!==0)return;
 const root=e.target.closest('#rollMain');if(!root)return;
 const t=currentTrack();if(t.type!=='melody')return;
 const at=eventGridPosition(e,root),nBlock=e.target.closest('.note-block');
 if(nBlock){
  const index=Number(nBlock.dataset.note),n=notesOf()[index];if(!n)return;
  userDrag={mode:e.target.closest('[data-resize]')?'resize':'move',trackId:t.id,note:n,startStep:at.step,startPitch:at.pitch,originalStep:n.step,originalPitch:n.pitch,originalLength:n.length,moved:false};
 }else{
  let existing=notesOf().find(n=>n.step===at.step&&n.pitch===at.pitch);
  if(existing){userDrag={mode:'resize',trackId:t.id,note:existing,startStep:at.step,startPitch:at.pitch,originalLength:existing.length,moved:false};}
  else{
   const n={step:at.step,pitch:at.pitch,length:1,velocity:.82};notesOf().push(n);
   userDrag={mode:'create',trackId:t.id,note:n,startStep:at.step,startPitch:at.pitch,moved:false};
   previewNote(n.pitch,t);
   renderPianoNotes();renderArrangement();markChanged();
  }
 }
 e.preventDefault();
}
function editPianoMove(e){
 if(!userDrag||ui.view!=='piano')return;
 const root=$('#rollMain');if(!root)return;
 const at=eventGridPosition(e,root),drag=userDrag,n=drag.note;
 if(drag.mode==='create')n.length=clamp(at.step-drag.startStep+1,1,16-n.step);
 if(drag.mode==='resize')n.length=clamp(drag.originalLength+at.step-drag.startStep,1,16-n.step);
 if(drag.mode==='move'){
  n.step=clamp(drag.originalStep+at.step-drag.startStep,0,16-n.length);
  n.pitch=clamp(drag.originalPitch+at.pitch-drag.startPitch,ROLL_MIN,ROLL_MAX);
 }
 if(!drag.moved||drag.lastStep!==at.step||drag.lastPitch!==at.pitch){
  drag.moved=true;drag.lastStep=at.step;drag.lastPitch=at.pitch;
  renderPianoNotes();renderArrangement();markChanged();
 }
}
function editPianoEnd(){if(userDrag){userDrag=null;markChanged();}}
function removePianoNote(e){
 const block=e.target.closest('.note-block');if(!block)return;
 const idx=Number(block.dataset.note);notesOf().splice(idx,1);renderPianoNotes();renderArrangement();markChanged();toast('Note removed');
}
function rebuildAudio(){
 if(!ctx)return;
 for(const ch of channels.values()){try{ch.gain.disconnect();ch.pan.disconnect();}catch(_){}}
 channels.clear();state.tracks.forEach(makeChannel);updateChannelLevels();
}
function setProject(next){stopPlayback();state=next;ui.trackId=state.tracks.find(t=>t.type==='melody')?.id||state.tracks[0].id;ui.pattern='A';ui.view='piano';rebuildAudio();renderAll();saveLocal();}
function addNewTrack(){
 if(state.tracks.length>=24){toast('24 track limit reached');return;}
 const index=state.tracks.length+1;
 const def={id:'synth-'+Date.now(),name:'Synth '+index,type:'melody',preset:'keys',color:['#ac93ee','#8cdbd2','#f4b08c','#90b8fb'][index%4],icon:'♫',volume:.65,pan:0};
 state.tracks.push(makeTrack(def));ui.trackId=def.id;ui.view='piano';rebuildAudio();renderAll();markChanged();toast('Synth track created');
}
function toggleFocusEditor(){
 $('.main-panel').classList.toggle('editor-maximized');renderSwitch();
}
function attachEvents(){
 $('#maximizeEditor').addEventListener('click',toggleFocusEditor);
 $('#playBtn').addEventListener('click',togglePlay);
 $('#stopBtn').addEventListener('click',stopPlayback);
 $('#toStart').addEventListener('click',()=>{if(schedulerTimer)pausePlayback();playhead=0;updateTimeDisplay();updatePlayhead();});
 $('#recordBtn').addEventListener('click',()=>setRecord(!ui.record));
 $('#loopBtn').addEventListener('click',()=>{state.loop=!state.loop;renderTransport();markChanged();});
 $('#metronomeBtn').addEventListener('click',()=>{state.metronome=!state.metronome;renderTransport();markChanged();});
 $('#bpmInput').addEventListener('change',e=>{state.bpm=clamp(Number(e.target.value)||120,50,240);e.target.value=state.bpm;markChanged();});
 $('#swingInput').addEventListener('change',e=>{state.swing=clamp(Number(e.target.value)||0,0,65);e.target.value=state.swing;markChanged();});
 $('#masterVolume').addEventListener('input',e=>{state.master=Number(e.target.value)/100;$('#masterValue').textContent=e.target.value+'%';if(master&&ctx)master.gain.setTargetAtTime(state.master,ctx.currentTime,.015);markChanged();});
 $('#projectName').addEventListener('input',e=>{state.name=e.target.value.slice(0,64)||'Untitled Project';markChanged();});
 $('#newProject').addEventListener('click',()=>{if(confirm('Create a blank project? Your current session is auto-saved, but the new project will replace it. Export a JSON backup first if you want to keep it.')){setProject(makeProject(false));toast('Blank project created');}});
 $('#demoBtn').addEventListener('click',()=>{if(confirm('Load the starter demo? This will replace your current session.')){setProject(makeProject(true));toast('Demo session loaded');}});
 $('#importProject').addEventListener('click',()=>$('#fileInput').click());
 $('#fileInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const data=JSON.parse(await file.text());setProject(sanitizeProject(data));toast('Project imported successfully');}catch(err){toast('Could not open project: '+err.message);}
  e.target.value='';
 });
 $('#saveProject').addEventListener('click',()=>{saveLocal();download(JSON.stringify(state,null,2),safeFilename(state.name)+'.waveroom.json','application/json');toast('Project JSON downloaded');});
 $('#exportWav').addEventListener('click',exportWav);
 $('#addTrack').addEventListener('click',addNewTrack);
 $('#helpBtn').addEventListener('click',()=>$('#helpModal').classList.remove('hidden'));
 $('#closeHelp').addEventListener('click',()=>$('#helpModal').classList.add('hidden'));
 $('#gotItBtn').addEventListener('click',()=>$('#helpModal').classList.add('hidden'));
 $('#helpModal').addEventListener('click',e=>{if(e.target.id==='helpModal')$('#helpModal').classList.add('hidden');});
 $('#trackList').addEventListener('click',e=>{const card=e.target.closest('[data-track]');if(card)selectTrack(card.dataset.track);});
 $('#arrangementRuler').addEventListener('click',e=>{const r=e.target.closest('[data-seek]');if(!r)return;const was=!!schedulerTimer;if(was)pausePlayback();playhead=Number(r.dataset.seek)*16;updateTimeDisplay();updatePlayhead();if(was)togglePlay();});
 $('#arrangementTracks').addEventListener('click',e=>{
  const c=e.target.closest('.arrangement-cell');if(!c)return;
  const t=trackById(c.dataset.track),bar=Number(c.dataset.bar);if(!t)return;
  const prev=t.clips[bar];t.clips[bar]=prev===null?'A':prev==='D'?null:PATTERNS[PATTERNS.indexOf(prev)+1];
  ui.trackId=t.id;if(t.clips[bar])ui.pattern=t.clips[bar];
  if(t.type==='drum'&&ui.view==='piano')ui.view='drums';
  if(t.type==='melody'&&ui.view==='drums')ui.view='piano';
  renderAll();markChanged();
 });
 $('#arrangementTracks').addEventListener('contextmenu',e=>{
  const c=e.target.closest('.arrangement-cell');if(!c)return;e.preventDefault();
  const t=trackById(c.dataset.track);if(!t)return;t.clips[Number(c.dataset.bar)]=null;renderArrangement();markChanged();
 });
 $$('.editor-tab').forEach(b=>b.addEventListener('click',()=>{
  ui.view=b.dataset.view;
  if(ui.view==='piano'&&currentTrack().type==='drum')ui.trackId=state.tracks.find(t=>t.type==='melody')?.id||ui.trackId;
  renderSwitch();renderEditor();renderInspector();renderTrackList();
 }));
 $('#patternSwitch').addEventListener('click',e=>{const b=e.target.closest('[data-pattern]');if(!b)return;ui.pattern=b.dataset.pattern;renderSwitch();renderEditor();renderArrangement();});
 $('#clearPattern').addEventListener('click',()=>{
  if(!confirm(`Clear pattern ${ui.pattern}${ui.view==='drums'?' for all drums':' for '+currentTrack().name}?`))return;
  if(ui.view==='drums')state.tracks.filter(t=>t.type==='drum').forEach(t=>t.patterns[ui.pattern]=[]);
  else currentTrack().patterns[ui.pattern]=[];
  renderEditor();renderArrangement();markChanged();toast('Pattern cleared');
 });
 $('#editorArea').addEventListener('pointerdown',e=>{
  if(e.target.closest('#rollMain'))editPianoStart(e);
  const piano=e.target.closest('[data-pitch]');if(piano){const p=Number(piano.dataset.pitch);activeKeys.add(p);piano.classList.add('pressed');previewNote(p);recordNote(p);e.preventDefault();}
 });
 window.addEventListener('pointermove',editPianoMove);
 window.addEventListener('pointerup',()=>{editPianoEnd();activeKeys.clear();$$('.pressed').forEach(el=>el.classList.remove('pressed'));});
 $('#editorArea').addEventListener('dblclick',e=>{if(ui.view==='piano')removePianoNote(e);});
 $('#editorArea').addEventListener('contextmenu',e=>{if(ui.view==='piano'&&e.target.closest('.note-block')){e.preventDefault();removePianoNote(e);}});
 $('#editorArea').addEventListener('click',e=>{
  const step=e.target.closest('.drum-step');if(step){
   const t=trackById(step.dataset.track),n=Number(step.dataset.step),notes=t.patterns[ui.pattern],i=notes.findIndex(x=>x.step===n);
   if(i>=0)notes.splice(i,1);else{notes.push({step:n,pitch:36,length:1,velocity:.85});previewNote(36,t);}
   renderDrums();renderArrangement();markChanged();return;
  }
  const label=e.target.closest('.drum-line-name');if(label){selectTrack(label.dataset.track);return;}
  const mix=e.target.closest('.mixer-channel');if(mix&&!e.target.closest('button,input')){selectTrack(mix.dataset.track);}
  const m=e.target.closest('[data-mute]');if(m){const t=trackById(m.dataset.mute);t.mute=!t.mute;updateChannelLevels();renderMixer();markChanged();return;}
  const s=e.target.closest('[data-solo]');if(s){const t=trackById(s.dataset.solo);t.solo=!t.solo;updateChannelLevels();renderMixer();markChanged();return;}
 });
 $('#editorArea').addEventListener('input',e=>{
  if(e.target.dataset.mixVolume){const t=trackById(e.target.dataset.mixVolume);t.volume=Number(e.target.value)/100;const ch=e.target.closest('.mixer-channel');ch.querySelector('small').textContent=Math.round(t.volume*100)+'%';updateChannelLevels();if(ui.trackId===t.id)renderInspector();markChanged();}
  if(e.target.dataset.mixPan){const t=trackById(e.target.dataset.mixPan);t.pan=Number(e.target.value)/100;const ch=e.target.closest('.mixer-channel');ch.querySelectorAll('small')[1].textContent='PAN '+Math.round(t.pan*100);updateChannelLevels();markChanged();}
 });
 window.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea')||e.target.isContentEditable)return;
  if(e.key.toLowerCase()==='f'&&!e.repeat){e.preventDefault();toggleFocusEditor();return;}
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)togglePlay();return;}
  if(e.code==='Escape'){e.preventDefault();stopPlayback();$('#helpModal').classList.add('hidden');return;}
  const pitch=KEYMAP[e.key.toLowerCase()];
  if(pitch!=null&&!e.repeat){e.preventDefault();if(activeKeys.has(pitch))return;activeKeys.add(pitch);previewNote(pitch);recordNote(pitch);const k=$(`.keys-visual [data-pitch="${pitch}"]`);if(k)k.classList.add('pressed');}
 });
 window.addEventListener('keyup',e=>{const p=KEYMAP[e.key.toLowerCase()];if(p!=null){activeKeys.delete(p);const k=$(`.keys-visual [data-pitch="${p}"]`);if(k)k.classList.remove('pressed');}});
 window.addEventListener('blur',()=>{activeKeys.clear();$$('.pressed').forEach(e=>e.classList.remove('pressed'));});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&schedulerTimer)pausePlayback();});
}
function boot(){
 try{const stored=localStorage.getItem(STORAGE_KEY);state=stored?sanitizeProject(JSON.parse(stored)):makeProject(true);}catch(err){state=makeProject(true);console.warn('Project could not be restored:',err);}
 ui.trackId=state.tracks.some(t=>t.id==='keys')?'keys':state.tracks.find(t=>t.type==='melody')?.id||state.tracks[0].id;
 renderAll();attachEvents();setStatus('Ready to make music');
}
boot();
