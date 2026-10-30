/* GAMEFORGE — Infinite video-game alchemy.
   No build step. All saves are local. A serverless API is optional. */
(() => {
'use strict';
const STORAGE_KEY = 'gameforge-save-v1';
const STARTERS = [
  ['Player','🧑','base','common','A hero waiting for a world.'],
  ['Pixel','🟪','base','common','The smallest spark of digital creation.'],
  ['Code','💻','base','common','The language that brings worlds to life.'],
  ['Controller','🎮','base','common','The gateway between you and the game.'],
  ['World','🌍','base','common','A universe begging to be explored.'],
  ['Story','📖','base','common','A beginning, a middle, and a twist.'],
  ['Speed','💨','base','common','Faster. Faster! Faster!'],
  ['Strategy','♟️','base','common','Win with the power of your mind.'],
  ['Multiplayer','👥','base','common','Gaming is better together.'],
  ['Music','🎵','base','common','Every adventure needs a soundtrack.'],
  ['Magic','✨','base','common','The impossible made playable.'],
  ['Internet','🌐','base','common','A connected universe of players.']
];
// Distinct recipes are order-independent. All outcomes become ingredients.
const RECIPE_LINES = `
Player+World=Avatar
Player+Code=NPC
Player+Player=Co-op
Player+Story=Hero
Player+Speed=Speedrunner
Player+Strategy=Commander
Player+Music=Rhythm Game
Player+Magic=Wizard
Player+Multiplayer=Team
Player+Internet=Online Gamer
Player+Controller=Gaming
Player+Pixel=Sprite
Pixel+Pixel=Pixel Art
Pixel+Code=Retro Game
Pixel+World=Voxel
Pixel+Story=Visual Novel
Pixel+Speed=Platformer
Pixel+Strategy=Puzzle Game
Pixel+Music=Chiptune
Pixel+Magic=8-Bit Wizard
Pixel+Multiplayer=Party Game
Pixel+Internet=Browser Game
Code+Code=Game Engine
Code+World=Simulation
Code+Story=Interactive Fiction
Code+Speed=Speed Hack
Code+Strategy=AI Opponent
Code+Music=Synthesizer
Code+Magic=Glitch
Code+Multiplayer=Netcode
Code+Internet=Online Game
Controller+World=Video Game
Controller+Story=Adventure Game
Controller+Speed=Racing Game
Controller+Strategy=Strategy Game
Controller+Music=Music Game
Controller+Magic=Spellcasting
Controller+Multiplayer=Local Co-op
Controller+Internet=Cloud Gaming
World+World=Open World
World+Story=RPG
World+Speed=Parkour
World+Strategy=Civilization
World+Music=Soundscape
World+Magic=Fantasy World
World+Multiplayer=MMO
World+Internet=Metaverse
Story+Story=Epic Saga
Story+Speed=Action Adventure
Story+Strategy=Detective Game
Story+Music=Musical Adventure
Story+Magic=Fantasy RPG
Story+Multiplayer=Co-op Campaign
Story+Internet=Interactive Series
Speed+Speed=Hyperdrive
Speed+Strategy=Real-time Strategy
Speed+Music=Rhythm Runner
Speed+Magic=Teleport
Speed+Multiplayer=Speed Race
Speed+Internet=Speedrun Stream
Strategy+Strategy=Chess
Strategy+Music=Music Tactics
Strategy+Magic=Turn-based RPG
Strategy+Multiplayer=Team Tactics
Strategy+Internet=Esports
Music+Music=Orchestra
Music+Magic=Enchanted Melody
Music+Multiplayer=Band Battle
Music+Internet=Music Streaming
Magic+Magic=Chaos Magic
Magic+Multiplayer=Wizard Duel
Magic+Internet=Digital Sorcery
Multiplayer+Multiplayer=Battle Royale
Multiplayer+Internet=Online Community
Internet+Internet=Cyberworld
Avatar+Multiplayer=Character Creator
Avatar+Story=Character Arc
Avatar+Magic=Sorcerer
Avatar+Pixel=Pixel Hero
Avatar+World=Explorer
Avatar+Speed=Parkour Runner
Avatar+Controller=Third-person Game
NPC+Story=Quest Giver
NPC+NPC=Living City
NPC+Code=Procedural AI
NPC+Magic=Magical Companion
NPC+Strategy=Enemy AI
NPC+Multiplayer=Social Simulator
NPC+World=Open-world NPCs
Video Game+Video Game=Game Collection
Video Game+World=Sandbox
Video Game+Player=Gamer
Video Game+Code=Game Developer
Video Game+Internet=Gaming Platform
Video Game+Music=Soundtrack
Video Game+Magic=Fantasy Game
Video Game+Story=Story Mode
Video Game+Speed=Arcade
Video Game+Strategy=Turn-based Strategy
Video Game+Multiplayer=Online Multiplayer
Game Engine+World=World Builder
Game Engine+Pixel=2D Engine
Game Engine+Voxel=Voxel Engine
Game Engine+Magic=Physics Engine
Game Engine+Internet=Web Game Engine
Game Engine+Story=Narrative Engine
Game Developer+Internet=Indie Studio
Game Developer+Music=Game Composer
Game Developer+Story=Game Designer
Game Developer+Game Engine=Game Studio
Game Developer+Multiplayer=Game Jam
Game Studio+Internet=Game Publisher
Game Studio+Strategy=Management Sim
Game Studio+Magic=Dream Game
Game Studio+Game Studio=AAA Studio
Indie Studio+Story=Indie Darling
Indie Studio+Magic=Hidden Gem
Indie Studio+Internet=Viral Hit
Indie Darling+Music=Emotional Masterpiece
Hidden Gem+Viral Hit=Breakout Success
AAA Studio+Open World=Blockbuster
Blockbuster+Fantasy World=Legendary RPG
Legendary RPG+Music=Timeless Classic
Timeless Classic+Magic=The Masterpiece
Voxel+World=Block World
Voxel+Sandbox=Blockcraft
Voxel+Multiplayer=Blockverse
Voxel+Strategy=Voxel Tactics
Voxel+Magic=Enchanted Blocks
Block World+Player=Block Builder
Block World+Multiplayer=Block Party
Blockcraft+Internet=Crafting Community
Blockcraft+Magic=Infinite Craft
Blockverse+Game Developer=Creator Platform
Creator Platform+Internet=Roblox
Sandbox+World=Infinite World
Sandbox+Player=Creative Mode
Sandbox+Code=Modding
Sandbox+Magic=God Game
Sandbox+Multiplayer=Shared World
Sandbox+Internet=Community Servers
Open World+RPG=Open-world RPG
Open World+Multiplayer=Shared Universe
Open World+Speed=Open-world Racing
Open World+Magic=Fantasy Sandbox
Open World+Strategy=Empire Builder
RPG+Strategy=Tactical RPG
RPG+Pixel=Pixel RPG
RPG+Multiplayer=Party RPG
RPG+Magic=Spellbound
RPG+Story=Story-rich RPG
RPG+Music=Epic Soundtrack
RPG+Speed=Action RPG
Fantasy RPG+Open World=Dragonborn
Fantasy RPG+Wizard=Archmage
Fantasy RPG+Multiplayer=Fantasy MMO
Fantasy RPG+Story=Mythic Quest
Fantasy World+Dragonborn=Dragon Age
Fantasy World+Magic=Enchanted Kingdom
Fantasy World+Open World=Elder Realms
Battle Royale+World=Survival Arena
Battle Royale+Voxel=Block Royale
Battle Royale+Strategy=Last Team Standing
Battle Royale+Magic=Arcane Royale
Battle Royale+Speed=Final Sprint
Battle Royale+Internet=Global Tournament
Battle Royale+Racing Game=Combat Racing
Battle Royale+Hero=Hero Shooter
Hero Shooter+Internet=Esports Legend
Esports+Team=Pro Team
Esports+Speed=Speedrunning League
Esports+Strategy=Competitive Arena
Esports+Internet=World Championship
World Championship+Hero Shooter=Legendary Showdown
Platformer+Story=Story Platformer
Platformer+Speed=Speed Platformer
Platformer+Magic=Magic Platformer
Platformer+Multiplayer=Co-op Platformer
Platformer+Pixel=Classic Platformer
Classic Platformer+Hero=Super Plumber
Classic Platformer+Speed=Speedy Hedgehog
Racing Game+Speed=Hyper Racer
Racing Game+World=Open Road
Racing Game+Music=Synthwave Racing
Racing Game+Multiplayer=Kart Racing
Racing Game+Strategy=Racing Manager
Kart Racing+Magic=Fantasy Kart
Puzzle Game+Magic=Puzzle Spell
Puzzle Game+Story=Mystery Puzzle
Puzzle Game+Strategy=Brain Teaser
Puzzle Game+Multiplayer=Co-op Puzzle
Puzzle Game+Pixel=Retro Puzzle
Puzzle Game+Internet=Daily Puzzle
Rhythm Game+Speed=Beat Dash
Rhythm Game+Magic=Spell Beats
Rhythm Game+Multiplayer=Rhythm Battle
Rhythm Runner+Platformer=Geometry Rush
Rhythm Runner+Pixel=Pixel Beat
Visual Novel+Magic=Enchanted Romance
Visual Novel+Story=Branching Narrative
Visual Novel+Internet=Community Story
Visual Novel+Music=Sound Novel
Simulation+World=Life Simulator
Simulation+Player=Virtual Life
Simulation+Strategy=City Builder
Simulation+Magic=Fantasy Simulator
Simulation+Multiplayer=Social Sim
Simulation+Code=Physics Sandbox
Life Simulator+Story=Life Story
Life Simulator+Internet=Digital Life
Life Simulator+Multiplayer=Virtual Town
City Builder+Strategy=Empire Simulator
City Builder+World=Mega City
City Builder+Magic=Floating City
City Builder+Multiplayer=Shared City
Co-op+Story=Shared Adventure
Co-op+Puzzle Game=Co-op Escape
Co-op+Magic=Spell Partners
Co-op+Speed=Buddy Race
Co-op+World=Two-player Adventure
Arcade+Pixel=Arcade Classic
Arcade+Multiplayer=Arcade Party
Arcade+Speed=High Score
Arcade+Strategy=Arcade Tactics
Arcade+Music=Neon Arcade
Glitch+World=Glitch Dimension
Glitch+Player=Glitched Avatar
Glitch+Magic=Reality Warp
Glitch+Internet=Cyber Glitch
Glitch+Game Engine=Broken Physics
Cyberworld+Player=Cyberpunk
Cyberworld+Magic=Techno Magic
Cyberworld+Strategy=Hacking Simulator
Cyberworld+Multiplayer=Cyber Arena
Cyberpunk+Open World=Neon City
Cyberpunk+Story=Cyber Noir
Cyberpunk+RPG=Cyberpunk RPG
Cyberpunk+Music=Synthwave
Metaverse+Avatar=Virtual Identity
Metaverse+Multiplayer=Social Universe
Metaverse+Magic=Dreamverse
Metaverse+Sandbox=Infinite Playground
Dreamverse+Story=Lucid Dream
Dreamverse+Game Studio=Dream Factory
Wizard+Strategy=Spell Tactics
Wizard+Wizard=Wizard Academy
Wizard+Multiplayer=Magic Guild
Wizard+World=Magic School
Magic Guild+Fantasy World=Guild Wars
Hero+Story=Hero's Journey
Hero+Magic=Superhero
Hero+Multiplayer=Hero Alliance
Hero+Strategy=Hero Tactics
Hero+Open World=Superhero City
Superhero+Cyberpunk=Tech Hero
Superhero+Battle Royale=Superhero Royale
Detective Game+Cyber Noir=Neon Mystery
Detective Game+Magic=Occult Detective
Detective Game+Multiplayer=Detective Party
Survival Arena+Magic=Arcane Survival
Survival Arena+World=Survival Game
Survival Game+Sandbox=Survival Craft
Survival Game+Magic=Fantasy Survival
Survival Game+Multiplayer=Survival Island
Survival Craft+Blockcraft=Minecraft
Roblox+Battle Royale=Block Battle
Roblox+Game Developer=UGC Creator
Minecraft+Internet=Block Community
Minecraft+Magic=Enchanted Craft
Game Jam+Speed=48-hour Challenge
Game Jam+Magic=Instant Inspiration
Game Jam+Pixel=Retro Jam
Game Publisher+Viral Hit=Global Sensation
Viral Hit+Internet=Internet Phenomenon
Global Sensation+Game Studio=Gaming Empire
Gaming Empire+Legendary RPG=Hall of Fame
Hall of Fame+The Masterpiece=Gaming Legend
`;

const RARITY = {common:{color:'#79d1ad',glow:'#24624d50',rank:0},rare:{color:'#8eaaff',glow:'#4059a255',rank:1},epic:{color:'#ca8cff',glow:'#7643a75a',rank:2},legendary:{color:'#ffd37b',glow:'#b8853060',rank:3}};
const TYPE_NAMES = {base:'Foundation',genre:'Genre',mechanic:'Mechanic',game:'Game / World',other:'Creation'};
const SIGNATURE = {
 'Video Game':['🎮','game','rare','The beginning of an obsession.'], 'Avatar':['🧑‍🚀','mechanic','common','Your digital alter ego.'],
 'NPC':['🤖','mechanic','common','A character with a mind of its own.'],'Co-op':['🤝','mechanic','rare','Better together, no matter the challenge.'],
 'Hero':['🦸','other','rare','The legend starts here.'],'Speedrunner':['🏃','other','rare','Every millisecond matters.'],
 'Rhythm Game':['🎶','genre','rare','Play the beat. Become the rhythm.'],'Wizard':['🧙','other','rare','Master of the impossible.'],
 'Team':['👥','other','common','One squad. Endless possibilities.'],'Sprite':['👾','other','common','A tiny character with gigantic charm.'],
 'Pixel Art':['🎨','other','common','The beauty of a single pixel.'],'Retro Game':['🕹️','genre','rare','Low resolution, infinite nostalgia.'],
 'Voxel':['🧊','mechanic','rare','The universe, one cube at a time.'],'Visual Novel':['📚','genre','rare','Your decisions tell the story.'],
 'Platformer':['🍄','genre','rare','One perfect jump at a time.'],'Puzzle Game':['🧩','genre','rare','Think outside every box.'],
 'Chiptune':['🎹','other','rare','Catchy melodies from tiny sound chips.'],'Game Engine':['⚙️','mechanic','rare','Create the rules of your reality.'],
 'Glitch':['⚡','mechanic','rare','A beautiful mistake in the matrix.'],'Simulation':['🧬','genre','rare','A little universe that follows your rules.'],
 'Sandbox':['🏖️','genre','epic','There are no rules. Build your own.'],'Game Developer':['👨‍💻','other','rare','The creator behind the magic.'],
 'RPG':['⚔️','genre','epic','Your choices shape a legendary journey.'],'Battle Royale':['🏆','genre','epic','A hundred enter. One leaves.'],
 'Open World':['🗺️','genre','epic','No boundaries. Only possibility.'],'MMO':['🌐','genre','epic','A shared world that never sleeps.'],
 'Esports':['🏟️','game','epic','Where gaming becomes a spectacle.'],'Roblox':['🟥','game','legendary','Millions of experiences. One creative universe.'],
 'Minecraft':['⛏️','game','legendary','A whole world, one block at a time.'],'Blockverse':['🧱','game','epic','The universe of blocks is yours.'],
 'Blockcraft':['🏡','game','epic','Build the impossible, brick by brick.'],'Legendary RPG':['🐉','game','legendary','A saga beyond imagination.'],
 'The Masterpiece':['🏆','game','legendary','The game that will be remembered forever.'],'Gaming Legend':['👑','game','legendary','You changed the history of gaming.'],
 'Hall of Fame':['🏛️','other','legendary','Immortalized in the history of games.'],'AAA Studio':['🏢','other','legendary','Blockbuster dreams. Unlimited ambition.'],
 'Game Studio':['🏛️','other','epic','A place where the impossible becomes playable.'],'Indie Studio':['🏠','other','rare','Big imagination, small team.'],
 'Hidden Gem':['💎','game','epic','An unforgettable secret waiting to spread.'],'Viral Hit':['🚀','game','epic','Everybody is playing it.'],
 'Cyberpunk':['🌃','genre','epic','High tech, low life, neon nights.'],'Neon City':['🌆','game','legendary','Every street hides a story.'],
 'Dreamverse':['🌌','game','legendary','Dream it. Live it. Play it.'],'Superhero':['🦸‍♀️','other','rare','With great power comes even greater gameplay.'],
 'Survival Game':['🏕️','genre','rare','How long can you last?'],'City Builder':['🏙️','genre','rare','Every great city starts with one road.'],
 'Life Simulator':['🧑‍🤝‍🧑','genre','epic','Live a thousand different lives.'],
 'Voxel Engine':['🧰','mechanic','rare','An entire world of cubes.'],'Procedural AI':['🧠','mechanic','epic','Creatures that surprise even their creators.'],
 'Glitch Dimension':['🪐','game','epic','Reality was never this broken.'],'Hyperdrive':['🚀','mechanic','rare','Warp speed, no brakes.'],
 'Quest Giver':['📜','other','common','A stranger with a very important mission.'],'Spellbound':['🔮','game','epic','The magic is yours to command.'],
 'Dragonborn':['🐲','other','legendary','Destined to face the ancient dragons.']
};
const RECIPE_MAP = new Map();
function pairKey(a,b){return [a.trim().toLowerCase(),b.trim().toLowerCase()].sort().join('::')}
for(const line of RECIPE_LINES.trim().split('\n')){
 const [left,right] = line.trim().split('='); if(!right)continue;
 const [a,b] = left.split('+'); RECIPE_MAP.set(pairKey(a,b),right.trim());
}

const ICON_HINTS = [
 [/dragon|dino|beast|monster/i,'🐉'],[/space|planet|galaxy|cosmos|star|universe/i,'🌌'],[/pixel|retro|8-bit|arcade/i,'👾'],
 [/music|song|beat|rhythm|orchestra|sound|synth/i,'🎵'],[/magic|wizard|spell|arcane|sorcer|enchant/i,'🪄'],
 [/race|kart|speed|hyper|road|drift/i,'🏎️'],[/block|craft|voxel|cube|builder/i,'🧱'],[/battle|combat|war|arena|duel|fight/i,'⚔️'],
 [/puzzle|brain|detective|mystery/i,'🧩'],[/world|land|city|island|kingdom|realm/i,'🌍'],[/code|engine|system|robot|ai|tech/i,'🤖'],
 [/social|multiplayer|party|team|co-op|community/i,'👥'],[/surviv|nature|forest|wild/i,'🌲'],[/story|novel|quest|saga|chronicle/i,'📜'],
 [/hero|character|avatar|player/i,'🦸'],[/cyber|neon|glitch|digital/i,'💠'],[/simulat|life/i,'🧬'],[/god|legend|masterpiece|mythic|epic/i,'👑'],
 [/game|play|studio|indie/i,'🎮']
];
function classifyName(name){
 if(/game|rpg|racer|racing|platformer|simulator|battle|adventure|royale|puzzle|strategy|shooter|survival|arcade|novel|runner|tactics/i.test(name))return 'genre';
 if(/engine|AI|physics|netcode|mode|hack|mechanic|teleport|editor|procedural/i.test(name))return 'mechanic';
 if(/world|verse|city|kingdom|arena|realm|land|craft|dimension|minecraft|roblox|quest|classic|island/i.test(name))return 'game';
 return 'other';
}
function iconFor(name,type){for(const [re,icon] of ICON_HINTS)if(re.test(name))return icon;return {genre:'🎮',mechanic:'⚙️',game:'🌌',other:'✦',base:'✨'}[type]||'🎮'}
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function defFor(name,rarity){
 const known=SIGNATURE[name];if(known)return {name,icon:known[0],type:known[1],rarity:known[2],description:known[3]};
 const type=classifyName(name);const rank=rarity||(/legend|eternal|master|ultimate|infinite|cosmic|mythic/i.test(name)?'legendary':/world|universe|galactic|dragon|empire|quantum/i.test(name)?'epic':'rare');
 const templates={genre:'A fresh way to play. A world of possibilities.',mechanic:'A new mechanic that changes the rules.',game:'An unforgettable new universe to explore.',other:'A new spark for the next great game.'};
 return {name,icon:iconFor(name,type),type,rarity:rank,description:templates[type]};
}
function seedState(){const elements={};const order=[];for(const [name,icon,type,rarity,description] of STARTERS){elements[name]={name,icon,type,rarity,description};order.push(name)}return {elements,order,recipes:{},forges:0,streak:0,lastDay:'',settings:{endpoint:'',sound:true,motion:true},lastDiscovered:null}}
function normalizeElement(obj){
 const name=String(obj?.name||'').trim().replace(/[<>\x00-\x1f]/g,'').slice(0,55);
 if(!name)return null;
 const type=['base','genre','mechanic','game','other'].includes(obj.type)?obj.type:classifyName(name);
 const rarity=RARITY[obj.rarity]?obj.rarity:'rare';
 const icon=Array.from(String(obj.icon||iconFor(name,type))).slice(0,5).join('');
 const description=String(obj.description||'A fresh idea for the gaming universe.').replace(/[<>\x00-\x1f]/g,'').slice(0,180);
 return {name,icon,type,rarity,description};
}
function loadState(){
 const base=seedState();try{
 const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!data||typeof data!=='object')return base;
 if(data.elements&&typeof data.elements==='object'){
  for(const item of Object.values(data.elements).slice(0,10000)){const el=normalizeElement(item);if(el)base.elements[el.name]=el}
 }
 if(Array.isArray(data.order))base.order=[...new Set([...STARTERS.map(a=>a[0]),...data.order.filter(n=>typeof n==='string'&&base.elements[n])])].slice(0,10000);
 if(data.recipes&&typeof data.recipes==='object')for(const [k,r] of Object.entries(data.recipes).slice(0,10000)){
 if(typeof k==='string'&&k.length<145&&r&&typeof r==='object'&&base.elements[r.result]&&typeof r.a==='string'&&typeof r.b==='string')base.recipes[k]={a:r.a,b:r.b,result:r.result,date:String(r.date||'')};
 }
 base.forges=Math.max(0,Math.min(10000000,Number(data.forges)||0));base.streak=Math.max(0,Math.min(100000,Number(data.streak)||0));base.lastDay=String(data.lastDay||'').slice(0,10);
 base.settings={endpoint:String(data.settings?.endpoint||'').slice(0,500),sound:data.settings?.sound!==false,motion:data.settings?.motion!==false};
 base.lastDiscovered=typeof data.lastDiscovered==='string'&&base.elements[data.lastDiscovered]?data.lastDiscovered:null;
 return base;
 }catch(e){console.warn('Could not load save',e);return base}
}
let state=loadState();let slots=[null,null],activeSlot=0,activeFilter='all',busy=false,view='forge',showAll=false,audioContext=null;
const $=id=>document.getElementById(id);
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{toast('Storage full','Export your save to keep progress.','⚠️')}}
function escapeHtml(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function safeCSS(element){const r=RARITY[element.rarity]||RARITY.rare;return `--item-color:${r.color};--item-glow:${r.glow}`}
function today(){return new Date().toLocaleDateString('en-CA')}
function level(){return 1+Math.floor(Math.sqrt(Math.max(0,state.order.length-STARTERS.length))/2)}
function playSound(type='tap'){
 if(!state.settings.sound)return;
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audioContext=audioContext||new AC();if(audioContext.state==='suspended')audioContext.resume();
  const notes=type==='discover'?[523.25,659.25,783.99,1046.5]:type==='forge'?[196,392,587.3]:type==='error'?[190,150]:[523.25];
  notes.forEach((freq,i)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),time=audioContext.currentTime+i*(type==='discover'?.105:.065);
    oscillator.type=type==='tap'?'sine':'triangle';oscillator.frequency.setValueAtTime(freq,time);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(type==='discover'?.065:.027,time+.02);gain.gain.exponentialRampToValueAtTime(.0001,time+.23);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(time);oscillator.stop(time+.25);
  });
 }catch{}
}
function toast(title,detail='',icon='✦'){
 const el=document.createElement('div');el.className='toast';
 el.innerHTML=`<span class="toast-icon">${escapeHtml(icon)}</span><div><b>${escapeHtml(title)}</b><small>${escapeHtml(detail)}</small></div>`;
 $('toastLayer').prepend(el);setTimeout(()=>el.remove(),3400);
}
function selectElement(name){if(busy||!state.elements[name])return;
 const idx=activeSlot;slots[idx]=name;activeSlot=idx===0?1:0;playSound('tap');renderSlots();renderGrid();
}
function removeSlot(i){slots[i]=null;activeSlot=i;playSound('tap');renderSlots();renderGrid()}
function renderSlots(){
 slots.forEach((name,i)=>{
 const el=$('slot'+(i===0?'One':'Two'));el.classList.toggle('filled',!!name);
 if(name){const item=state.elements[name];el.style.cssText=safeCSS(item);el.innerHTML=`<span class="slot-remove">×</span><span class="slot-emoji">${escapeHtml(item.icon)}</span><span class="slot-item-name">${escapeHtml(item.name)}</span><span class="slot-label">${i?'SECOND':'FIRST'} ELEMENT</span>`;el.title=`Remove ${name}`}
 else {el.style.cssText='';el.innerHTML=`<span class="slot-plus">+</span><span class="slot-label">${i?'SECOND':'FIRST'} ELEMENT</span><small>${activeSlot===i?'Select an element':'Click or drag here'}</small>`;el.title='Select this slot'}
 });
 $('forgeButton').disabled=busy||!slots[0]||!slots[1];$('forgeText').textContent=busy?'CREATING YOUR WORLD...':slots[0]&&slots[1]?'FORGE CREATION':'SELECT TWO ELEMENTS';
 $('comboStatus').textContent=slots[0]&&slots[1]?'Your ideas are ready to fuse':'Boundless possibilities await';
}
function filteredNames(full=false){let names=state.order.filter(n=>{
 const el=state.elements[n];if(!el)return false;
 const match=activeFilter==='all'||(activeFilter==='other'?el.type==='other':el.type===activeFilter);
 return match&&(!($('elementSearch')?.value||'').trim()||n.toLowerCase().includes($('elementSearch').value.trim().toLowerCase()));
 });const sort=$('sortElements')?.value||'recent';
 if(sort==='name')names.sort((a,b)=>a.localeCompare(b));else if(sort==='rarity')names.sort((a,b)=>RARITY[state.elements[b].rarity].rank-RARITY[state.elements[a].rarity].rank||a.localeCompare(b));else names.reverse();
 return full||showAll?names:names.slice(0,18);
}
function elementCard(name,index){const item=state.elements[name];const el=document.createElement('button');el.className='element-card'+(slots.includes(name)?' selected':'');el.draggable=true;el.title=`${item.name} — ${item.description}. Click to add.`;el.style.cssText=safeCSS(item);el.style.animationDelay=Math.min(index*16,270)+'ms';
 el.innerHTML=`<span class="element-rarity-dot"></span><span class="element-icon">${escapeHtml(item.icon)}</span><span class="element-name">${escapeHtml(item.name)}</span><span class="element-type">${escapeHtml(TYPE_NAMES[item.type]||'Creation')}</span>`;
 el.addEventListener('click',()=>{if(view!=='forge')navigate('forge');selectElement(name)});
 el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',name);e.dataTransfer.effectAllowed='copy'});
 return el;
}
function renderGrid(){const names=filteredNames();const grid=$('elementGrid');grid.replaceChildren(...names.map((n,i)=>elementCard(n,i)));
 const total=state.order.length;const allNames=filteredNames(true);
 $('libraryCount').textContent=`${total} discovered`;
 $('emptyElements').classList.toggle('hidden',allNames.length>0);
 $('libraryFooter').textContent=`Showing ${names.length} of ${allNames.length} matching elements`;
 $('expandLibrary').textContent=showAll?'Show less ↑':'View all discoveries ↗';
}
function renderStats(){const n=state.order.length;const unlocked=n-STARTERS.length;
 $('navCollectionCount').textContent=n;$('topDiscoveries').textContent=unlocked;$('topStreak').textContent=state.streak;$('userLevel').textContent=level();
 $('statUnique').textContent=n;$('statCombos').textContent=state.forges;
 $('missionProgress').style.width=Math.min(unlocked/25,1)*100+'%';$('missionText').textContent=`${Math.min(unlocked,25)} / 25 discoveries`;
 const featured=state.lastDiscovered&&state.elements[state.lastDiscovered]||state.elements['The Masterpiece']||defFor('The Masterpiece');
 $('featureIcon').textContent=featured.icon;$('featureName').textContent=featured.name;$('featureDescription').textContent=featured.description;
 $('featureRarity').textContent=featured.rarity.toUpperCase();$('featureRarity').className='rarity-label '+featured.rarity;
}
function renderCollection(){const names=state.order.slice().reverse();$('collectionHeadline').textContent=names.length;$('collectionLegendary').textContent=names.filter(n=>state.elements[n].rarity==='legendary').length;
 $('collectionGrid').replaceChildren(...names.map((n,i)=>elementCard(n,i)));
}
function renderRecipes(){const recs=Object.values(state.recipes).reverse();$('recipeCount').textContent=`${recs.length} unique recipes discovered`;
 $('recipesList').replaceChildren(...recs.map(r=>{const div=document.createElement('div');div.className='recipe-row';
 const a=state.elements[r.a]||defFor(r.a),b=state.elements[r.b]||defFor(r.b),result=state.elements[r.result]||defFor(r.result);
 div.innerHTML=`<div class="recipe-piece"><span class="r-emoji">${escapeHtml(a.icon)}</span><span>${escapeHtml(r.a)}</span></div><span class="recipe-operator">+</span><div class="recipe-piece"><span class="r-emoji">${escapeHtml(b.icon)}</span><span>${escapeHtml(r.b)}</span></div><span class="recipe-operator">=</span><div class="recipe-piece recipe-result"><span class="r-emoji">${escapeHtml(result.icon)}</span><span>${escapeHtml(r.result)}</span></div><span class="recipe-date">${escapeHtml(r.date)}</span>`;return div}));
 $('recipesEmpty').classList.toggle('hidden',!!recs.length);
}
const ACHIEVEMENTS=[
 ['🎮','First Steps','Forge your very first element',s=>Object.keys(s.recipes).length>=1],
 ['⚗️','The Alchemist','Discover 10 new elements',s=>s.order.length-STARTERS.length>=10],
 ['🧪','Mad Scientist','Discover 25 new elements',s=>s.order.length-STARTERS.length>=25],
 ['🌀','Reality Bender','Discover 50 new elements',s=>s.order.length-STARTERS.length>=50],
 ['♾️','Infinite Imagination','Discover 100 new elements',s=>s.order.length-STARTERS.length>=100],
 ['👑','Legendary Creator','Forge your first legendary element',s=>s.order.some(n=>!STARTERS.some(x=>x[0]===n)&&s.elements[n]?.rarity==='legendary')],
 ['🧱','Block Universe','Discover the game Minecraft',s=>!!s.elements.Minecraft],
 ['🟥','Experience Creator','Discover Roblox',s=>!!s.elements.Roblox],
 ['🏆','The Masterpiece','Forge The Masterpiece',s=>!!s.elements['The Masterpiece']],
 ['🚀','Game Studio Mogul','Forge at least 100 times',s=>s.forges>=100],
 ['🌠','Creative Streak','Forge across 3 consecutive days',s=>s.streak>=3],
 ['💎','Diamond Hands','Discover 10 epic or legendary elements',s=>s.order.filter(n=>['epic','legendary'].includes(s.elements[n]?.rarity)).length>=10]
];
function renderAchievements(){$('achievementsGrid').replaceChildren(...ACHIEVEMENTS.map(([icon,title,description,test])=>{
 const done=test(state),card=document.createElement('div');card.className='achievement panel'+(done?'':' locked');
 card.innerHTML=`<div class="achievement-icon">${icon}</div><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p><div class="achievement-badge">${done?'✦ UNLOCKED':'🔒 LOCKED'}</div></div>`;return card}));}
function navigate(to){view=to;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hidden',v.id!==to+'View'));document.querySelectorAll('.nav-button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===to));$('crumbPage').textContent={forge:'Forge Lab',collection:'Collection',recipes:'Recipe Book',achievements:'Achievements'}[to]||'Forge Lab';$('sidebar').classList.remove('open');
 if(to==='collection')renderCollection();if(to==='recipes')renderRecipes();if(to==='achievements')renderAchievements();if(to==='forge')renderGrid();window.scrollTo({top:0,behavior:'smooth'});
}
function generatedResult(a,b){
 // A deterministic, on-device generative fallback: no API, no loading, unlimited novel pairings.
 const key=pairKey(a,b),h=hash(key),s1=a.replace(/^(the|super|ultimate|hyper|infinite|project|pixel|neon)\s+/i,'').split(/\s+/).slice(-2).join(' '),s2=b.replace(/^(the|super|ultimate|hyper|infinite|project|pixel|neon)\s+/i,'').split(/\s+/).slice(-2).join(' ');
 const aCore=s1.length>18?s1.split(' ').slice(-1)[0]:s1,bCore=s2.length>18?s2.split(' ').slice(-1)[0]:s2;
 const adjectives=['Neon','Quantum','Shadow','Dream','Cosmic','Midnight','Crystal','Turbo','Infinite','Mythic','Digital','Phantom','Starlight','Glitched','Epic','Solar','Hyper','Arcane','Cyber','Astral'];
 const nouns=['Odyssey','Chronicles','Legends','Arena','Protocol','Quest','Universe','Frontier','Reborn','Eclipse','Dimension','Showdown','Rush','Legacy','Saga','Revolution','Ascension','Uprising','Circuit','Tales'];
 const mode=h%8;let name;
 switch(mode){
  case 0:name=`${aCore} ${bCore} Chronicles`;break;
  case 1:name=`${adjectives[h%adjectives.length]} ${bCore}`;break;
  case 2:name=`${aCore} ${nouns[(h>>>5)%nouns.length]}`;break;
  case 3:name=`${bCore} ${nouns[(h>>>7)%nouns.length]}`;break;
  case 4:name=`${adjectives[h%adjectives.length]} ${nouns[(h>>>9)%nouns.length]}`;break;
  case 5:name=`${aCore} × ${bCore}`;break;
  case 6:name=`Project ${aCore}`;break;
  default:name=`${bCore} ${aCore} Saga`;
 }
 if(a===b)name=`Hyper ${aCore}`;
 name=name.replace(/\s+/g,' ').trim().slice(0,49);
 // Include a short deterministic suffix if a randomly named result is already taken, ensuring new combinations stay discoverable.
 if(state.elements[name]&&!Object.values(state.recipes).some(r=>r.result===name&&pairKey(r.a,r.b)===key))name=`${name.slice(0,42)} ${((h>>>14)%999)+1}`;
 const rank=h%26===0?'legendary':h%6===0?'epic':'rare',type=classifyName(name);
 const descriptions=[`A wild fusion of ${a} and ${b}. One unforgettable gaming experience.`,`What happens when ${a} meets ${b}? This spectacular new creation.`,`Two gaming ideas collide into an entirely new universe.`,`An unexpected mix of ${a} and ${b}. The possibilities are endless.`,`The ultimate crossover: ${a} with a twist of ${b}.`];
 return {name,icon:iconFor(name,type),type,rarity:rank,description:descriptions[h%descriptions.length]};
}
async function getAIResult(a,b){
 let endpoint=state.settings.endpoint.trim();if(!endpoint){if(location.protocol==='file:'||location.hostname.endsWith('github.io'))return null;endpoint=new URL('api/combine',location.href).href}
 try{const url=new URL(endpoint,location.href);if(!['https:','http:'].includes(url.protocol))return null;if(location.protocol==='https:'&&url.protocol!=='https:')return null;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),11000);
  try{const res=await fetch(url.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a,b}),signal:controller.signal});if(!res.ok)return null;const json=await res.json();if(!json?.name)return null;return normalizeElement(json)}finally{clearTimeout(timeout)}
 }catch(e){console.warn('AI API unavailable, using local generator',e);return null}
}
function markActivity(){const d=today();if(state.lastDay===d)return;
 const previous=new Date();previous.setDate(previous.getDate()-1);
 state.streak=state.lastDay===previous.toLocaleDateString('en-CA')?state.streak+1:1;state.lastDay=d;
}
async function forge(){if(busy||!slots[0]||!slots[1])return;
 const [a,b]=slots,key=pairKey(a,b);busy=true;renderSlots();$('forgeButton').classList.add('working');$('engineStatus').textContent='Synthesizing game concepts…';playSound('forge');
 let resultName=RECIPE_MAP.get(key)||state.recipes[key]?.result;
 let result=resultName?(state.elements[resultName]||defFor(resultName)):null;
 try{
 if(!result){const ai=await getAIResult(a,b);result=ai||generatedResult(a,b)}
 if(!result?.name)throw new Error('No creation returned');
 const isNew=!state.elements[result.name];state.forges++;markActivity();
 if(isNew){state.elements[result.name]=result;state.order.push(result.name);state.lastDiscovered=result.name;}
 if(!state.recipes[key])state.recipes[key]={a,b,result:result.name,date:today()};
 save();renderStats();renderGrid();renderSlots();
 if(isNew){playSound('discover');if(state.settings.motion)showDiscovery(result,a,b);else toast(`Discovered ${result.name}!`,result.description,result.icon)}
 else{toast('Already discovered',`${a} + ${b} = ${result.name}`,result.icon);playSound('tap')}
 }catch(e){console.error(e);toast('Something went wrong','Try the forge again.','⚠️');playSound('error')}
 finally{busy=false;renderSlots();$('forgeButton').classList.remove('working');$('engineStatus').textContent='Alchemy engine online'}
}
function showDiscovery(result,a,b){$('discoveryOverlay').classList.remove('hidden');$('discoveryIcon').textContent=result.icon;$('discoveryName').textContent=result.name;$('discoveryDesc').textContent=result.description;
 $('discoveryRarity').textContent=result.rarity.toUpperCase();$('discoveryRarity').className='rarity-label '+result.rarity;
 $('discoveryFormula').textContent=`${a}   +   ${b}   =   ${result.name}`;
 const confetti=$('confetti');confetti.replaceChildren();for(let i=0;i<54;i++){
 const bit=document.createElement('div');bit.className='confetti-bit';bit.style.cssText=`--left:${Math.random()*100}%;--delay:${Math.random()*.5}s;--duration:${2+Math.random()*2.4}s;--piece-color:${['#ac80ff','#ffb4ee','#ffe08c','#8cebd0'][i%4]}`;confetti.appendChild(bit);
 }
 $('discoveryContinue').focus();
}
function closeDiscovery(){$('discoveryOverlay').classList.add('hidden');$('confetti').replaceChildren();slots=[null,null];activeSlot=0;renderSlots();renderGrid()}
function hint(){const possible=[];for(const [key,result] of RECIPE_MAP){if(state.elements[result])continue;const [a,b]=key.split('::');const aa=state.order.find(n=>n.toLowerCase()===a),bb=state.order.find(n=>n.toLowerCase()===b);if(aa&&bb)possible.push({a:aa,b:bb,result})}
 if(possible.length){const h=possible[Math.floor(Math.random()*possible.length)];toast('A little inspiration…',`Try combining ${h.a} + ${h.b}`,'💡')}
 else toast('Invent your own worlds', 'Try mixing two unexpected elements.', '💡');playSound('tap');
}
function closeDialogs(){document.querySelectorAll('.dialog-overlay').forEach(x=>x.classList.add('hidden'))}
function openDialog(id){closeDialogs();$(id).classList.remove('hidden');if(id==='settingsOverlay'){$('apiEndpoint').value=state.settings.endpoint;updateToggles()}}
function updateToggles(){for(const [id,value] of [['soundToggle',state.settings.sound],['motionToggle',state.settings.motion]]){$(id).classList.toggle('on',value);$(id).setAttribute('aria-checked',String(value))}}
function toggleSound(){state.settings.sound=!state.settings.sound;save();$('soundButton').textContent=state.settings.sound?'♫':'♪̸';$('soundButton').title=state.settings.sound?'Mute sound':'Enable sound';updateToggles();if(state.settings.sound)playSound('tap')}
function exportSave(){const blob=new Blob([JSON.stringify({game:'GameForge',version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='gameforge-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Save exported','Keep this file somewhere safe.','💾')}
async function importSave(file){try{if(!file||file.size>2e6)throw new Error('Invalid file size');const data=JSON.parse(await file.text());if(data.game!=='GameForge'||!data.state)throw new Error('Not a GameForge save');const old=localStorage.getItem(STORAGE_KEY);localStorage.setItem(STORAGE_KEY,JSON.stringify(data.state));const loaded=loadState();if(loaded.order.length<STARTERS.length){if(old!==null)localStorage.setItem(STORAGE_KEY,old);throw new Error('Invalid save data')}
 state=loaded;save();closeDialogs();slots=[null,null];activeSlot=0;renderAll();toast('Save imported',`${state.order.length} elements restored.`,'💾')
 }catch{toast('Import failed','Choose a valid GameForge save file.','⚠️')}}
function renderAll(){renderStats();renderSlots();renderGrid();renderCollection();renderRecipes();renderAchievements();$('soundButton').textContent=state.settings.sound?'♫':'♪̸'}
// Navigation and interactions
for(const b of document.querySelectorAll('.nav-button[data-view]'))b.addEventListener('click',()=>navigate(b.dataset.view));
for(const b of document.querySelectorAll('[data-go-forge]'))b.addEventListener('click',()=>navigate('forge'));
$('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
$('elementSearch').addEventListener('input',()=>{showAll=true;renderGrid()});$('sortElements').addEventListener('change',renderGrid);
for(const b of document.querySelectorAll('.filter'))b.addEventListener('click',()=>{activeFilter=b.dataset.filter;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));showAll=false;renderGrid()});
$('expandLibrary').addEventListener('click',()=>{showAll=!showAll;renderGrid()});
for(let i=0;i<2;i++){$('slot'+(i?'Two':'One')).addEventListener('click',()=>removeSlot(i));const s=$('slot'+(i?'Two':'One'));
 s.addEventListener('dragover',e=>{e.preventDefault();s.classList.add('drag-over')});s.addEventListener('dragleave',()=>s.classList.remove('drag-over'));
 s.addEventListener('drop',e=>{e.preventDefault();s.classList.remove('drag-over');const name=e.dataTransfer.getData('text/plain');if(state.elements[name]){activeSlot=i;selectElement(name)}});
}
$('clearButton').addEventListener('click',()=>{slots=[null,null];activeSlot=0;renderSlots();renderGrid();playSound('tap')});$('forgeButton').addEventListener('click',forge);
$('hintButton').addEventListener('click',hint);$('settingsButton').addEventListener('click',()=>openDialog('settingsOverlay'));$('howButton').addEventListener('click',()=>openDialog('howOverlay'));$('soundButton').addEventListener('click',toggleSound);
$('discoveryContinue').addEventListener('click',closeDiscovery);
$('settingsOverlay').addEventListener('click',e=>{if(e.target===$('settingsOverlay'))closeDialogs()});$('howOverlay').addEventListener('click',e=>{if(e.target===$('howOverlay'))closeDialogs()});
for(const b of document.querySelectorAll('[data-close-dialog]'))b.addEventListener('click',closeDialogs);
$('soundToggle').addEventListener('click',toggleSound);$('motionToggle').addEventListener('click',()=>{state.settings.motion=!state.settings.motion;save();updateToggles()});
$('saveSettings').addEventListener('click',()=>{const value=$('apiEndpoint').value.trim();if(value){try{const u=new URL(value);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&/^(localhost|127\.0\.0\.1)$/.test(u.hostname)))throw new Error()}catch{toast('Invalid API URL','Use a valid HTTPS endpoint.','⚠️');return}}
 state.settings.endpoint=value;save();closeDialogs();toast('Settings saved',value?'External AI endpoint configured':'Local generator enabled','⚙️')});
$('exportButton').addEventListener('click',exportSave);$('exportSettingsButton').addEventListener('click',exportSave);
$('importButton').addEventListener('click',()=>$('importInput').click());$('importInput').addEventListener('change',e=>{importSave(e.target.files[0]);e.target.value='' });
$('resetButton').addEventListener('click',()=>{if(!confirm('Delete every discovered element and recipe? You can’t undo this unless you exported a save.'))return;state=seedState();save();slots=[null,null];activeSlot=0;closeDialogs();navigate('forge');renderAll();toast('Studio reset','A fresh world awaits.','🔄')});
document.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName?.toLowerCase();const typing=tag==='input'||tag==='textarea'||tag==='select';
 if(e.key==='Escape'){if(!$('discoveryOverlay').classList.contains('hidden'))closeDiscovery();else closeDialogs();return}
 if(!$('discoveryOverlay').classList.contains('hidden')){if(e.key==='Enter'||e.code==='Space'){e.preventDefault();closeDiscovery()}return}
 if(!$('settingsOverlay').classList.contains('hidden')||!$('howOverlay').classList.contains('hidden'))return;
 if(typing)return;if(e.key==='/'){e.preventDefault();navigate('forge');$('elementSearch').focus()}else if(e.key.toLowerCase()==='h')hint();else if(e.key==='Enter'&&view==='forge'&&slots.every(Boolean))forge();
});
renderAll();
window.GameForge={get stats(){return {elements:state.order.length,recipes:Object.keys(state.recipes).length,forges:state.forges}},get curatedRecipes(){return RECIPE_MAP.size}};
})();
