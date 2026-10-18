import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import './style.css';

// =====================================================================
//  TODE: NIGHT OF THE SWARM
//  A moonlit 3D arcade survival game. Z is UP, the ground is the X/Y plane.
// =====================================================================

// ==========================================
// 0. CONFIG
// ==========================================
// Works on localhost AND in sub-folders (GitHub Pages etc.) as long as vite.config.js has base: './'
const BASE = import.meta.env.BASE_URL || '/';
const MODEL_URLS = {
    tode: `${BASE}models/tode.glb`,
    house: `${BASE}models/small_house.glb`,
    enemy: `${BASE}models/enemy.glb`
};

const BEST_KEY = 'tode-night-swarm-best';

// Player
const MOVE_SPEED = 80;
const TURN_SPEED = 14;
// Which way each model looks. If a model faces backwards, change its value by Math.PI
// (for example -Math.PI / 2  <->  Math.PI / 2).
const PLAYER_FACING_OFFSET = Math.PI / 2;  // Tode
const ENEMY_FACING_OFFSET = -Math.PI / 2;  // insects
const START_LIVES = 3;
const BASE_MAX_LIVES = 5;
const HARD_MAX_LIVES = 8;
const INVULNERABLE_TIME = 1.5;
const FRENZY_TIME = 6;
const FRENZY_SPEED = 1.4;

// Map (everything stays inside the fence)
const MAP_LIMIT = 580;
const PLAYER_EDGE = MAP_LIMIT - 22;
const ENEMY_EDGE = MAP_LIMIT - 18;
const SPAWN_EDGE = MAP_LIMIT - 30;
const SAFE_ZONE_RADIUS = 50;

// Houses & doors
const HOUSE_COUNT = 10;
const HOUSE_SIZE = 34;
const HOUSE_COLLISION_RADIUS = 19;
const MIN_HOUSE_GAP = 70;
const HOUSE_SPAWN_RANGE = 160;
const DOOR_WIDTH = 7;
const DOOR_HEIGHT = 12;
const DOOR_Y_NUDGE = 0;
const DOOR_SWING = 1.72;
const DOOR_SPEED = 3;
const DOOR_RANGE = 16;
const HIDE_WALK_SPEED = 55;
const WANDER_SPEED_FACTOR = 0.6;

// Hiding: risk and reward
const HIDE_HEAL_INTERVAL = 5;   // seconds per heart while resting inside a house
const HIDE_LOCK_TIME = 8;       // doors are locked this long after you leave a house
const SIEGE_DELAY = 3;          // seconds before the swarm figures out where you are
const SIEGE_RAMP = 12;          // seconds until the whole swarm is waiting outside

// Trees
const TREE_COUNT = 50;
const TREE_SPAWN_RANGE = 380;
const TREE_COLLISION_RADIUS = 7;
const TREE_MIN_GAP = 18;
const TREE_HOUSE_GAP = 10;
const TREE_MIN_SCALE = 0.8;
const TREE_MAX_SCALE = 1.35;

// Combat
const ENEMY_SIZE = 9;
const CATCH_RADIUS = 6.5;
const ATTACK_RADIUS = 42;
const ATTACK_DURATION = 0.28;
const SHOCK_COOLDOWN = 0.8;

// Pickups (fallen apples)
const PICKUP_MAX = 3;
const PICKUP_INTERVAL = 9;
const PICKUP_LIFETIME = 28;
const PICKUP_RADIUS = 8;

// Enemy variants
const ENEMY_TYPES = {
    normal: { scale: 1.0, speed: 1.0, hp: 1, score: 10, tint: null, color: 0xff5555, name: 'Insect' },
    fast: { scale: 0.72, speed: 1.55, hp: 1, score: 15, tint: 0xff9a1a, color: 0xffa31a, name: 'Dasher' },
    big: { scale: 1.6, speed: 0.72, hp: 2, score: 30, tint: 0xa63cff, color: 0xb347ff, name: 'Brute' },
    boss: { scale: 3.4, speed: 0.55, hp: 8, score: 200, tint: 0xff1f44, color: 0xff2244, name: 'Swarm Queen' }
};

// Levels (5 total)
const LEVEL_CONFIGS = [
    { level: 1, killsRequired: 15, enemySpeed: 28, maxSwarm: 20, waveInterval: 1.5, fastChance: 0.0, bigChance: 0.0, boss: false },
    { level: 2, killsRequired: 25, enemySpeed: 32, maxSwarm: 24, waveInterval: 1.3, fastChance: 0.2, bigChance: 0.0, boss: false },
    { level: 3, killsRequired: 35, enemySpeed: 36, maxSwarm: 28, waveInterval: 1.1, fastChance: 0.25, bigChance: 0.12, boss: false },
    { level: 4, killsRequired: 45, enemySpeed: 40, maxSwarm: 32, waveInterval: 1.0, fastChance: 0.3, bigChance: 0.18, boss: false },
    { level: 5, killsRequired: 45, enemySpeed: 44, maxSwarm: 34, waveInterval: 0.9, fastChance: 0.3, bigChance: 0.2, boss: true }
];

// Upgrades offered after every level (pick 1 of 3)
const UPGRADES = [
    { id: 'radius', icon: '💥', name: 'Wide Shockwave', desc: '+20% shockwave range', max: 4 },
    { id: 'recharge', icon: '⚡', name: 'Quick Recharge', desc: 'Shockwave recharges 18% faster', max: 4 },
    { id: 'speed', icon: '👟', name: 'Swift Paws', desc: '+12% move speed', max: 4 },
    { id: 'heart', icon: '❤️', name: 'Iron Heart', desc: '+1 max heart and heal 1', max: 3 },
    { id: 'damage', icon: '🔱', name: 'Heavy Zap', desc: 'Shockwave hits twice as hard', max: 1 },
    { id: 'apples', icon: '🍎', name: 'Apple Season', desc: 'Apples fall 30% more often', max: 2 },
    { id: 'burrow', icon: '🏠', name: 'Cozy Burrow', desc: 'Heal 40% faster while hiding', max: 3 }
];

// Camera
const CAM_OFFSET = new THREE.Vector3(0, -130, 50);
const CAM_LOOK = new THREE.Vector3(0, 40, 25);
const FOG_COLOR = 0x142849;

// ==========================================
// 1. RENDERER, SCENE, CAMERA & NIGHT SKY
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);
scene.fog = new THREE.Fog(FOG_COLOR, 240, 900);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 3000);
camera.up.set(0, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x02040a, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

document.title = 'Tode: Night of the Swarm';
document.documentElement.style.background = '#000000';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000000';

const existingCanvas = document.querySelector('canvas');
if (existingCanvas) existingCanvas.remove();
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

function makeRadialTexture(inner, outer) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// Everything in the sky follows the camera so it always feels infinitely far away
const skyGroup = new THREE.Group();
scene.add(skyGroup);

const skyCanvas = document.createElement('canvas');
skyCanvas.width = 16;
skyCanvas.height = 256;
const sctx = skyCanvas.getContext('2d');
const skyGrad = sctx.createLinearGradient(0, 0, 0, 256);
skyGrad.addColorStop(0.0, '#01030a');
skyGrad.addColorStop(0.3, '#050c1e');
skyGrad.addColorStop(0.44, '#0e1c3a');
skyGrad.addColorStop(0.5, '#142849'); // horizon, matches the fog
skyGrad.addColorStop(0.56, '#0a1428');
skyGrad.addColorStop(1.0, '#01030a');
sctx.fillStyle = skyGrad;
sctx.fillRect(0, 0, 16, 256);
const skyTex = new THREE.CanvasTexture(skyCanvas);
skyTex.colorSpace = THREE.SRGBColorSpace;

const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(1200, 32, 24),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false })
);
skyDome.rotation.x = Math.PI / 2; // poles point up the Z axis
skyDome.renderOrder = -30;
skyGroup.add(skyDome);

// Stars: most of them live low in the sky, where the camera can actually see them
const STAR_COUNT = 900;
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT * 3; i += 3) {
    const theta = Math.random() * Math.PI * 2;
    const elevation = (3 + Math.pow(Math.random(), 1.8) * 57) * (Math.PI / 180);
    const r = 1150;
    starPositions[i] = r * Math.cos(elevation) * Math.cos(theta);
    starPositions[i + 1] = r * Math.cos(elevation) * Math.sin(theta);
    starPositions[i + 2] = r * Math.sin(elevation);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({
    color: 0xe5f5ff,
    size: 3,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
});
skyGroup.add(new THREE.Points(starGeo, starMat));

// Moon, placed low enough to sit inside the camera's view
const MOON_POS = new THREE.Vector3(300, 1000, 277);
const moon = new THREE.Mesh(
    new THREE.IcosahedronGeometry(52, 2),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false })
);
moon.position.copy(MOON_POS);
skyGroup.add(moon);

const moonGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: makeRadialTexture('rgba(190,215,255,0.55)', 'rgba(190,215,255,0)'),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
    })
);
moonGlow.scale.set(360, 360, 1);
moonGlow.position.copy(MOON_POS);
skyGroup.add(moonGlow);

// ==========================================
// 2. UI OVERLAY
// ==========================================
const styleEl = document.createElement('style');
styleEl.textContent = `
  #arcade-ui { font-family: 'Trebuchet MS','Segoe UI',Arial,sans-serif; color:#fff; user-select:none; -webkit-user-select:none; }
  #arcade-ui .glass { background:rgba(6,12,28,0.62); border:1px solid rgba(140,200,255,0.28); border-radius:14px; box-shadow:0 6px 24px rgba(0,0,0,0.45); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
  #arcade-ui .bar { height:10px; border-radius:6px; background:rgba(255,255,255,0.12); overflow:hidden; }
  #arcade-ui .bar > div { height:100%; border-radius:6px; width:0%; }
  #hud-top { position:fixed; top:16px; left:20px; display:flex; gap:22px; align-items:center; padding:10px 18px; z-index:999; font-weight:bold; text-shadow:1px 1px 0 #000; }
  #hud-mid { position:fixed; top:78px; left:20px; width:300px; padding:10px 16px; z-index:999; font-weight:bold; font-size:14px; text-shadow:1px 1px 0 #000; }
  #hud-mid .row { display:flex; align-items:center; gap:10px; margin-top:8px; }
  #hud-mid .row .bar { flex:1; }
  #status-chip { display:none; margin-top:8px; padding:4px 10px; border-radius:20px; background:rgba(255,211,77,0.2); border:1px solid #ffd34d; color:#ffd34d; font-size:13px; text-align:center; }
  #hint { position:fixed; bottom:14px; left:20px; z-index:999; font-size:13px; color:rgba(200,255,225,0.85); text-shadow:1px 1px 0 #000; font-weight:bold; }
  #hint b { display:inline-block; padding:1px 7px; margin:0 2px; border-radius:5px; background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.3); }
  #boss-bar { display:none; position:fixed; top:16px; left:50%; transform:translateX(-50%); width:min(420px,40vw); z-index:999; text-align:center; font-weight:bold; text-shadow:2px 2px 0 #000; }
  #boss-bar .bar { height:14px; margin-top:4px; border:1px solid rgba(255,80,110,0.6); }
  #boss-fill { background:linear-gradient(90deg,#ff1f44,#ff7a5a); }
  #kills-fill { background:linear-gradient(90deg,#ffd34d,#ff9f1a); }
  #charge-fill { background:linear-gradient(90deg,#00ff88,#7dffd0); }
  #tip-toast { display:none; position:fixed; bottom:120px; left:50%; transform:translateX(-50%); max-width:min(640px,90vw); text-align:center; padding:10px 20px; font-size:18px; font-weight:bold; z-index:999; border-color:#ffd34d !important; color:#fff8d6; text-shadow:1px 1px 0 #000; }
  #door-prompt { display:none; position:fixed; bottom:70px; left:50%; transform:translateX(-50%); font-size:22px; font-weight:bold; z-index:999; padding:10px 24px; white-space:nowrap; border-color:#00ff88 !important; text-shadow:1px 1px 0 #000; }
  #level-announcement { display:none; position:fixed; top:34%; left:50%; transform:translate(-50%,-50%); text-align:center; z-index:1002; pointer-events:none; animation:bannerIn .5s ease-out; }
  #announce-title { font-size:68px; margin:0; letter-spacing:4px; text-shadow:0 0 24px rgba(0,255,136,0.7), 4px 4px 0 #000; }
  #announce-sub { font-size:24px; margin:8px 0 0 0; text-shadow:2px 2px 0 #000; }
  .modal { display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; z-index:1001; padding:34px 54px; background:rgba(4,8,20,0.9); border-radius:16px; }
  .modal h1 { margin:0; font-size:60px; letter-spacing:3px; text-shadow:3px 3px 0 #000; }
  .modal p { margin:12px 0 0 0; font-size:22px; }
  .modal .stats { display:flex; justify-content:center; gap:26px; margin-top:14px; font-size:22px; }
  #damage-flash { position:fixed; inset:0; z-index:998; pointer-events:none; opacity:0; background:radial-gradient(ellipse at center, rgba(255,0,0,0) 35%, rgba(255,20,20,0.75) 100%); }
  #vignette { position:fixed; inset:0; z-index:990; pointer-events:none; background:radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,10,0.55) 100%); }
  .float-text { position:fixed; z-index:1000; pointer-events:none; font-weight:bold; font-size:22px; transform:translate(-50%,-50%); text-shadow:2px 2px 0 #000; animation:floatUp .9s ease-out forwards; }
  .float-text.big { font-size:34px; }
  @keyframes floatUp { from { opacity:1; margin-top:0; } to { opacity:0; margin-top:-60px; } }
  @keyframes bannerIn { from { opacity:0; transform:translate(-50%,-30%) scale(0.8); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
  #title-screen { position:fixed; inset:0; z-index:2000; display:flex; align-items:center; justify-content:center; background:radial-gradient(ellipse at center, rgba(2,4,10,0.35) 0%, rgba(2,4,10,0.8) 100%); cursor:pointer; }
  .title-card { text-align:center; max-width:640px; padding:20px; }
  .title-eyebrow { color:#7dffd0; letter-spacing:6px; font-size:14px; font-weight:bold; }
  .title-card h1 { margin:6px 0 0 0; font-size:120px; line-height:1; letter-spacing:14px; color:#00ff88; text-shadow:0 0 40px rgba(0,255,136,0.55), 6px 6px 0 #000; }
  .title-card h2 { margin:0; font-size:30px; letter-spacing:10px; color:#ffd34d; text-shadow:3px 3px 0 #000; }
  .blurb { margin:22px 0 0 0; font-size:18px; color:#dfe9ff; line-height:1.5; text-shadow:1px 1px 0 #000; }
  .controls { display:grid; grid-template-columns:1fr 1fr; gap:8px 26px; margin:22px auto 0 auto; text-align:left; width:fit-content; font-size:16px; color:#fff; }
  .key { display:inline-block; min-width:26px; padding:2px 8px; margin-right:8px; text-align:center; border-radius:6px; background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.35); font-weight:bold; font-size:14px; }
  #load-wrap { width:300px; height:8px; margin:28px auto 0 auto; border-radius:6px; background:rgba(255,255,255,0.14); overflow:hidden; }
  #load-fill { width:0%; height:100%; background:linear-gradient(90deg,#00ff88,#7dffd0); transition:width .2s; }
  #start-prompt { margin-top:16px; font-size:22px; font-weight:bold; color:#fff; text-shadow:2px 2px 0 #000; }
  #start-prompt.ready { animation:pulse 1.2s infinite ease-in-out; color:#00ff88; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
  #upgrade-cards { display:flex; gap:16px; justify-content:center; margin-top:20px; }
  .u-card { width:210px; padding:16px 14px; border-radius:14px; background:rgba(255,255,255,0.07); border:2px solid rgba(125,255,208,0.4); cursor:pointer; transition:transform .15s, border-color .15s, background .15s; }
  .u-card:hover { transform:translateY(-6px); border-color:#7dffd0; background:rgba(125,255,208,0.14); }
  .u-icon { font-size:44px; }
  .u-name { margin-top:6px; font-size:20px; font-weight:bold; color:#fff; }
  .u-desc { margin-top:6px; min-height:38px; font-size:14px; color:#cfe3ff; }
  .u-lvl { margin-top:8px; font-size:13px; font-weight:bold; color:#ffd34d; }
  .u-key { margin-top:4px; font-size:13px; font-weight:bold; color:#7dffd0; }
`;
document.head.appendChild(styleEl);

let uiContainer = document.getElementById('arcade-ui');
if (uiContainer) uiContainer.remove();

uiContainer = document.createElement('div');
uiContainer.id = 'arcade-ui';
uiContainer.innerHTML = `
  <div id="vignette"></div>
  <div id="damage-flash"></div>

  <div id="hud" style="display:none;">
    <div id="hud-top" class="glass">
      <div id="lives-board" style="font-size:24px; letter-spacing:2px;"></div>
      <div id="level-board" style="color:#00ff88; font-size:24px;">LEVEL 1/5</div>
      <div id="score-board" style="font-size:24px;">Score 0</div>
      <div id="best-board" style="font-size:16px; color:#ffd34d;">Best 0</div>
    </div>
    <div id="hud-mid" class="glass">
      <div id="kills-board" style="color:#ffd34d;">Target 0/15</div>
      <div class="bar" style="margin-top:6px;"><div id="kills-fill"></div></div>
      <div class="row"><span style="color:#7dffd0;">Shockwave</span><div class="bar"><div id="charge-fill" style="width:100%;"></div></div></div>
      <div id="status-chip"></div>
      <div id="upgrade-line" style="margin-top:8px; font-size:14px; color:#cfe3ff;"></div>
    </div>
    <div id="boss-bar">
      <div style="color:#ff5a7a; font-size:18px; letter-spacing:3px;">SWARM QUEEN</div>
      <div class="bar"><div id="boss-fill" style="width:100%;"></div></div>
    </div>
    <div id="hint"><b>WASD</b> Move <b>SPACE</b> Shockwave <b>E</b> Door <b>M</b> Mute <b>P</b> Pause</div>
  </div>

  <div id="level-announcement">
    <h1 id="announce-title" style="color:#00ff88;">LEVEL 1</h1>
    <p id="announce-sub" style="color:#ffffff;">Eliminate 15 insects!</p>
  </div>

  <div id="door-prompt" class="glass"></div>
  <div id="tip-toast" class="glass"></div>

  <div id="pause-modal" class="modal glass" style="border-color:#00ff88;">
    <h1 style="color:#00ff88;">PAUSED</h1>
    <p>Press <b>[P]</b> or <b>[ESC]</b> to resume</p>
  </div>

  <div id="game-over-modal" class="modal glass" style="border-color:#ff4444;">
    <h1 style="color:#ff3333; font-size:64px;">GAME OVER</h1>
    <div class="stats"><span id="final-score">Score 0</span><span id="final-kills" style="color:#ffd34d;">Kills 0</span></div>
    <p id="final-best" style="color:#ffd34d; font-size:20px;"></p>
    <p>Press <b>[R]</b> or <b>[ENTER]</b> to restart</p>
  </div>

  <div id="victory-modal" class="modal glass" style="border-color:#ffd34d;">
    <h1 style="color:#ffd34d; font-size:64px;">VICTORY!</h1>
    <p style="color:#00ff88; font-size:26px;">The swarm is defeated. All 5 levels cleared!</p>
    <div class="stats"><span id="vic-score">Score 0</span><span id="vic-kills" style="color:#ffd34d;">Kills 0</span></div>
    <p id="vic-best" style="color:#ffd34d; font-size:20px;"></p>
    <p>Press <b>[R]</b> or <b>[ENTER]</b> to play again</p>
  </div>

  <div id="upgrade-modal" class="modal glass" style="border-color:#7dffd0; width:min(760px, 92vw);">
    <h1 style="color:#7dffd0; font-size:44px;">LEVEL CLEARED!</h1>
    <p style="font-size:18px;">Choose an upgrade (click a card or press 1, 2 or 3)</p>
    <div id="upgrade-cards"></div>
  </div>

  <div id="title-screen">
    <div class="title-card">
      <div class="title-eyebrow">A MOONLIT SURVIVAL ARCADE</div>
      <h1>TODE</h1>
      <h2>NIGHT OF THE SWARM</h2>
      <p class="blurb">Survive five levels. Zap the insects, hide inside houses when it gets scary, grab fallen apples, and take down the Swarm Queen.</p>
      <div class="controls">
        <div><span class="key">WASD</span>Move</div>
        <div><span class="key">SPACE</span>Shockwave</div>
        <div><span class="key">E</span>Open door / hide</div>
        <div><span class="key">P</span>Pause</div>
        <div><span class="key">M</span>Mute</div>
        <div><span class="key">🍎</span>Walk over to collect</div>
      </div>
      <div id="load-wrap"><div id="load-fill"></div></div>
      <div id="start-prompt">Loading...</div>
    </div>
  </div>
`;
document.body.appendChild(uiContainer);

document.querySelectorAll('#score, #game-over, .score, .game-over').forEach((el) => {
    el.style.display = 'none';
});

const $ = (id) => document.getElementById(id);
const hud = $('hud');
const livesBoard = $('lives-board');
const levelBoard = $('level-board');
const scoreBoard = $('score-board');
const bestBoard = $('best-board');
const killsBoard = $('kills-board');
const killsFill = $('kills-fill');
const chargeFill = $('charge-fill');
const statusChip = $('status-chip');
const bossBar = $('boss-bar');
const bossFill = $('boss-fill');
const doorPrompt = $('door-prompt');
const tipToast = $('tip-toast');
const levelAnnouncement = $('level-announcement');
const announceTitle = $('announce-title');
const announceSub = $('announce-sub');
const pauseModal = $('pause-modal');
const gameOverModal = $('game-over-modal');
const victoryModal = $('victory-modal');
const finalScore = $('final-score');
const finalKills = $('final-kills');
const finalBest = $('final-best');
const vicScore = $('vic-score');
const vicKills = $('vic-kills');
const vicBest = $('vic-best');
const damageFlash = $('damage-flash');
const titleScreen = $('title-screen');
const loadFill = $('load-fill');
const startPrompt = $('start-prompt');
const upgradeModal = $('upgrade-modal');
const upgradeCards = $('upgrade-cards');
const upgradeLine = $('upgrade-line');

let lastPromptText = '';
function setPrompt(text) {
    if (text === lastPromptText) return;
    lastPromptText = text;
    doorPrompt.textContent = text;
    doorPrompt.style.display = text ? 'block' : 'none';
}

// One-time hints (they stay off after being shown once per page load)
const tipsShown = { hide: false, inside: false };
let tipTimer = null;
let playTime = 0;
function showTip(text) {
    tipToast.textContent = text;
    tipToast.style.display = 'block';
    if (tipTimer) clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
        tipToast.style.display = 'none';
    }, 6500);
}

let bannerTimer = null;
function showBanner(title, subtitle, color) {
    announceTitle.textContent = title;
    announceTitle.style.color = color || '#00ff88';
    announceSub.textContent = subtitle;
    levelAnnouncement.style.display = 'none';
    void levelAnnouncement.offsetWidth; // restart the CSS animation
    levelAnnouncement.style.display = 'block';
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
        levelAnnouncement.style.display = 'none';
    }, 2400);
}

const tmpV = new THREE.Vector3();
function floatText(worldPos, text, color, big) {
    tmpV.copy(worldPos);
    tmpV.z += 8;
    tmpV.project(camera);
    if (tmpV.z > 1) return;
    const el = document.createElement('div');
    el.className = big ? 'float-text big' : 'float-text';
    el.textContent = text;
    el.style.left = `${(tmpV.x * 0.5 + 0.5) * window.innerWidth}px`;
    el.style.top = `${(-tmpV.y * 0.5 + 0.5) * window.innerHeight}px`;
    el.style.color = color || '#ffffff';
    uiContainer.appendChild(el);
    setTimeout(() => el.remove(), 950);
}

function flashDamage() {
    damageFlash.style.transition = 'none';
    damageFlash.style.opacity = '0.9';
    void damageFlash.offsetWidth;
    damageFlash.style.transition = 'opacity 0.55s ease-out';
    damageFlash.style.opacity = '0';
}

// ==========================================
// 3. LIGHTING, TERRAIN, OUTER FOREST & FIREFLIES
// ==========================================
const hemi = new THREE.HemisphereLight(0x8fb0ff, 0x1a2a22, 0.95);
hemi.position.set(0, 0, 1);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xcfdcff, 1.5); // from behind the camera so faces are lit
keyLight.position.set(-80, -120, 200);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x6f9bff, 0.8); // moonlight from the front for glowing edges
rimLight.position.set(220, 500, 140);
scene.add(rimLight);

function makeCheckerTexture(a, b, repeat) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = a;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = b;
    g.fillRect(0, 0, 64, 64);
    g.fillRect(64, 64, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const playableGround = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_LIMIT * 2, MAP_LIMIT * 2),
    new THREE.MeshStandardMaterial({ map: makeCheckerTexture('#8fd16a', '#40a64b', 45) })
);
scene.add(playableGround);

const outerGarden = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    new THREE.MeshStandardMaterial({ map: makeCheckerTexture('#224e23', '#183b19', 80) })
);
outerGarden.position.z = -0.5;
scene.add(outerGarden);

// Dark pine forest outside the fence: one InstancedMesh = one draw call
function spawnOuterForest() {
    const coneGeo = new THREE.ConeGeometry(16, 46, 7);
    coneGeo.rotateX(Math.PI / 2);
    coneGeo.translate(0, 0, 23);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0f2a1a, flatShading: true });
    const count = 260;
    const forest = new THREE.InstancedMesh(coneGeo, mat, count);
    forest.frustumCulled = false;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i += 1) {
        let x = 0;
        let y = 0;
        do {
            x = (Math.random() * 2 - 1) * 950;
            y = (Math.random() * 2 - 1) * 950;
        } while (Math.abs(x) < MAP_LIMIT + 30 && Math.abs(y) < MAP_LIMIT + 30);

        const s = 0.8 + Math.random() * 1.1;
        dummy.position.set(x, y, 0);
        dummy.rotation.set(0, 0, Math.random() * Math.PI * 2);
        dummy.scale.set(s, s, s * (0.9 + Math.random() * 0.5));
        dummy.updateMatrix();
        forest.setMatrixAt(i, dummy.matrix);
    }
    forest.instanceMatrix.needsUpdate = true;
    scene.add(forest);
}

// Fireflies drift around the player and wrap, so they are always nearby
const FIREFLY_COUNT = 120;
const FIREFLY_RANGE = 300;
const fireflyGeo = new THREE.BufferGeometry();
const fireflyPositions = new Float32Array(FIREFLY_COUNT * 3);
const fireflyBaseZ = new Float32Array(FIREFLY_COUNT);
const fireflyDrift = new Float32Array(FIREFLY_COUNT * 2);
for (let i = 0; i < FIREFLY_COUNT; i += 1) {
    fireflyPositions[i * 3] = (Math.random() - 0.5) * FIREFLY_RANGE * 2;
    fireflyPositions[i * 3 + 1] = (Math.random() - 0.5) * FIREFLY_RANGE * 2;
    fireflyBaseZ[i] = 3 + Math.random() * 14;
    fireflyPositions[i * 3 + 2] = fireflyBaseZ[i];
    fireflyDrift[i * 2] = (Math.random() - 0.5) * 4;
    fireflyDrift[i * 2 + 1] = (Math.random() - 0.5) * 4;
}
fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
const fireflyMat = new THREE.PointsMaterial({
    color: 0xaaff55,
    size: 5,
    map: makeRadialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});
const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
fireflies.frustumCulled = false;
scene.add(fireflies);

function updateFireflies(dt, time) {
    const arr = fireflyGeo.attributes.position.array;
    for (let i = 0; i < FIREFLY_COUNT; i += 1) {
        const ix = i * 3;
        arr[ix] += fireflyDrift[i * 2] * dt;
        arr[ix + 1] += fireflyDrift[i * 2 + 1] * dt;
        arr[ix + 2] = fireflyBaseZ[i] + Math.sin(time * 1.6 + i) * 2.5;

        // wrap around the player
        if (arr[ix] - player.position.x > FIREFLY_RANGE) arr[ix] -= FIREFLY_RANGE * 2;
        if (arr[ix] - player.position.x < -FIREFLY_RANGE) arr[ix] += FIREFLY_RANGE * 2;
        if (arr[ix + 1] - player.position.y > FIREFLY_RANGE) arr[ix + 1] -= FIREFLY_RANGE * 2;
        if (arr[ix + 1] - player.position.y < -FIREFLY_RANGE) arr[ix + 1] += FIREFLY_RANGE * 2;
    }
    fireflyGeo.attributes.position.needsUpdate = true;
    fireflyMat.opacity = 0.65 + Math.sin(time * 2.2) * 0.25;
}

// ==========================================
// 4. AUDIO (SFX + PROCEDURAL MUSIC)
// ==========================================
let audioCtx = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;
let muted = false;

function initAudio() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = muted ? 0 : 1;
        masterGain.connect(audioCtx.destination);
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 1;
        sfxGain.connect(masterGain);
        musicGain = audioCtx.createGain();
        musicGain.gain.value = 0.5;
        musicGain.connect(masterGain);
        startMusic();
    } else if (audioCtx.state === 'suspended' && gameState !== 'paused') {
        audioCtx.resume();
    }
}

function toggleMute() {
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 1;
    floatText(player.position, muted ? 'MUTED' : 'SOUND ON', '#ffffff', false);
}

function tone(type, f0, f1, dur, vol, delay, dest) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
}

function playSound(name) {
    if (!audioCtx) return;
    if (name === 'zap') tone('sawtooth', 320, 40, 0.22, 0.22);
    else if (name === 'hit') tone('square', 120, 30, 0.3, 0.3);
    else if (name === 'kill') tone('triangle', 520, 200, 0.12, 0.14);
    else if (name === 'pickup') { tone('sine', 600, 900, 0.1, 0.25); tone('sine', 900, 1400, 0.14, 0.25, 0.08); }
    else if (name === 'door') tone('sine', 190, 110, 0.28, 0.2);
    else if (name === 'combo') { tone('triangle', 440, 440, 0.1, 0.22); tone('triangle', 660, 660, 0.1, 0.22, 0.09); tone('triangle', 880, 880, 0.16, 0.22, 0.18); }
    else if (name === 'boss') { tone('sawtooth', 70, 38, 1.0, 0.35); tone('square', 55, 30, 1.0, 0.2); }
    else if (name === 'levelup') { tone('triangle', 260, 260, 0.12, 0.28); tone('triangle', 380, 380, 0.12, 0.28, 0.11); tone('triangle', 520, 520, 0.25, 0.28, 0.22); }
    else if (name === 'win') { [392, 523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.3, 0.28, i * 0.14)); }
    else if (name === 'lose') { tone('sawtooth', 300, 60, 0.9, 0.3); }
}

// A slow, moody pentatonic loop that speeds up a little each level
const MUSIC_SCALE = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
const MUSIC_BASS = [110.0, 87.31, 130.81, 98.0];
const MUSIC_ARP = [0, 2, 4, 2, 5, 4, 2, 4, 3, 2, 0, 2, 4, 5, 6, 5];
const MUSIC_SHIFT = [0, 3, 2, 4];

function musicTick() {
    if (!audioCtx) return;
    const step = musicStep % 64;
    const bar = Math.floor(step / 16);
    const i = step % 16;
    if (i === 0) tone('sine', MUSIC_BASS[bar], MUSIC_BASS[bar], 1.6, 0.16, 0, musicGain);
    if (i % 2 === 0 || Math.random() < 0.25) {
        const note = MUSIC_SCALE[(MUSIC_ARP[i] + MUSIC_SHIFT[bar]) % MUSIC_SCALE.length];
        tone('triangle', note * 2, note * 2, 0.35, 0.07, 0, musicGain);
    }
    musicStep += 1;
}

function musicLoop() {
    musicTick();
    const interval = Math.max(0.17, 0.32 - levelIndex * 0.03);
    musicTimer = setTimeout(musicLoop, interval * 1000);
}

function startMusic() {
    if (audioCtx && !musicTimer) musicLoop();
}

function stopMusic() {
    if (musicTimer) clearTimeout(musicTimer);
    musicTimer = null;
}

// ==========================================
// 5. MODEL HELPERS, FALLBACKS & LOADING
// ==========================================
// glTF is Y-up, this game is Z-up. Deep-clone, stand upright, scale, center on X/Y, sit on z = 0.
function buildCleanModel(gltfScene, targetSize) {
    const container = new THREE.Group();
    const raw = SkeletonUtils.clone(gltfScene);

    raw.position.set(0, 0, 0);
    raw.scale.set(1, 1, 1);
    raw.rotation.set(Math.PI / 2, 0, 0);
    raw.updateMatrixWorld(true);

    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(raw).getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    raw.scale.setScalar(targetSize / maxDim);
    raw.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(raw);
    const center = new THREE.Vector3();
    box.getCenter(center);
    raw.position.set(-center.x, -center.y, -box.min.z);

    container.add(raw);
    return container;
}

// If a .glb is missing or fails to load, the game still runs with simple stand-ins (they face -Z)
function makeFallbackScene(kind) {
    const g = new THREE.Group();
    const std = (c, e) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, emissive: e || 0x000000 });

    if (kind === 'house') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 10), std(0xd9c7a0));
        body.position.y = 4;
        g.add(body);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 5, 4), std(0x9b3b2e));
        roof.position.y = 10.5;
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
    } else if (kind === 'tode') {
        const body = new THREE.Mesh(new THREE.SphereGeometry(4, 14, 12), std(0x3fbf4f));
        body.position.y = 4;
        body.scale.set(1, 0.8, 1.2);
        g.add(body);
        for (const sx of [-1.6, 1.6]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), std(0xffffff));
            eye.position.set(sx, 6.6, -2.4);
            g.add(eye);
        }
    } else {
        const body = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 10), std(0x2a2630));
        body.position.y = 3;
        body.scale.set(1, 0.8, 1.3);
        g.add(body);
        for (const sx of [-1.1, 1.1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), std(0xff3333, 0xff2222));
            eye.position.set(sx, 4, -2.6);
            g.add(eye);
        }
    }
    return g;
}

function prepareHouseScene(houseScene) {
    houseScene.traverse((child) => {
        if (child.isMesh && child.material && !Array.isArray(child.material)) {
            const matName = (child.material.name || child.name || '').toLowerCase();
            if (matName.includes('window') || matName.includes('glass') || matName.includes('light')) {
                child.material = child.material.clone();
                if (child.material.emissive) {
                    child.material.emissive = new THREE.Color(0xff9922);
                    child.material.emissiveIntensity = 0.9;
                    child.material.roughness = 0.2;
                }
            }
        }
    });
}

let rawTodeScene = null;
let rawHouseScene = null;
let rawEnemyScene = null;
let assetsReady = false;

const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
    const pct = Math.round((loaded / total) * 100);
    loadFill.style.width = `${pct}%`;
    startPrompt.textContent = `Loading... ${pct}%`;
};
manager.onLoad = () => onAssetsReady();
const loader = new GLTFLoader(manager);

function loadModel(url, kind, onDone) {
    loader.load(
        url,
        (gltf) => onDone(gltf.scene),
        undefined,
        (err) => {
            console.warn(`Could not load ${url}, using a simple stand-in.`, err);
            onDone(makeFallbackScene(kind));
        }
    );
}

loadModel(MODEL_URLS.tode, 'tode', (s) => { rawTodeScene = s; });
loadModel(MODEL_URLS.house, 'house', (s) => { rawHouseScene = s; });
loadModel(MODEL_URLS.enemy, 'enemy', (s) => { rawEnemyScene = s; });

// Never get stuck on the loading screen
setTimeout(() => {
    if (!assetsReady) onAssetsReady();
}, 15000);

// ==========================================
// 6. GAME STATE
// ==========================================
// gameState: 'loading' | 'title' | 'playing' | 'paused' | 'gameover' | 'victory'
let gameState = 'loading';

let levelIndex = 0;
let levelKills = 0;
let totalKills = 0;
let score = 0;
let lives = START_LIVES;
let invulnerableTimer = 0;
let shockCooldown = 0;
let shockCooldownMax = SHOCK_COOLDOWN;
let frenzyTimer = 0;
let spawnTimer = 0;
let pickupTimer = PICKUP_INTERVAL;
let playerAngle = 0;
let boss = null;
let bossDead = false;
let bossHintShown = false;

let maxLives = BASE_MAX_LIVES;
const upg = { radius: 0, recharge: 0, speed: 0, heart: 0, damage: 0, apples: 0, burrow: 0 };
let upgradeChoices = [];
let siegeTime = 0;      // seconds spent hiding (drives the swarm gathering outside)
let hideHealTimer = 0;  // progress toward the next rested heart
let hideLock = 0;       // doors are locked while this is above 0

let bestScore = 0;
try {
    bestScore = Number(window.localStorage.getItem(BEST_KEY)) || 0;
} catch (err) {
    bestScore = 0;
}

// Hiding state machine:
//   out -> opening_in -> entering -> inside -> opening_out -> exiting -> out
let hideState = 'out';
let hideHouse = null;
let hideTargets = [];
let hideTargetIndex = 0;

const keys = {};
const houses = [];
const trees = [];
const enemies = [];
const shockwaves = [];
const pickups = [];
const particles = [];

const player = new THREE.Group();
scene.add(player);

// Flashlight: SpotLight intensity is in physical units, so it needs to be large
const flashlight = new THREE.SpotLight(0xfff1cf, 160, 110, Math.PI / 5, 0.5, 1.2);
flashlight.position.set(0, 0, 6);
const flashlightTarget = new THREE.Object3D();
flashlightTarget.position.set(0, 20, 0);
player.add(flashlight);
player.add(flashlightTarget);
flashlight.target = flashlightTarget;

const hideMarker = new THREE.Mesh(
    new THREE.SphereGeometry(2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff88 })
);
hideMarker.visible = false;
scene.add(hideMarker);

function updateUI() {
    const cfg = LEVEL_CONFIGS[levelIndex];
    levelBoard.textContent = `LEVEL ${cfg.level}/${LEVEL_CONFIGS.length}`;
    killsBoard.textContent = cfg.boss ? `Target ${levelKills}/${cfg.killsRequired} + BOSS` : `Target ${levelKills}/${cfg.killsRequired}`;
    killsFill.style.width = `${Math.min(100, (levelKills / cfg.killsRequired) * 100)}%`;
    scoreBoard.textContent = `Score ${score}`;
    bestBoard.textContent = `Best ${Math.max(bestScore, score)}`;
    upgradeLine.textContent = UPGRADES.filter((u) => upg[u.id] > 0).map((u) => `${u.icon}${upg[u.id]}`).join('  ');
    livesBoard.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, maxLives - lives));
}

function saveBest() {
    if (score > bestScore) {
        bestScore = score;
        try {
            window.localStorage.setItem(BEST_KEY, String(bestScore));
        } catch (err) {
            // storage can be blocked, that is fine
        }
        return true;
    }
    return false;
}

function lerpAngle(current, target, t) {
    let diff = target - current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return current + diff * t;
}

// ==========================================
// 7. HOUSES, DOORS & LAMPS
// ==========================================
const lampGeo = new THREE.SphereGeometry(0.9, 10, 10);
const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
const glowTex = makeRadialTexture('rgba(255,190,90,0.9)', 'rgba(255,150,40,0)');
const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.75
});
const glowGeo = new THREE.PlaneGeometry(30, 30);

function addNamePlaque(house, cx, frontY, zPos) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#4a2f1a';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#c9a15e';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#ffe9b8';
    ctx.font = 'bold 58px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("Tode's Home", 256, 66);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;

    const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(13, 3.4),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: 0.05 })
    );
    plaque.rotation.x = Math.PI / 2;
    plaque.position.set(cx, frontY - 0.25, zPos);
    house.add(plaque);
}

// Hinged door on the camera-facing (-Y) side. Call while the house is still at the origin.
function addDoor(house) {
    const box = new THREE.Box3().setFromObject(house);
    const cx = (box.min.x + box.max.x) / 2;
    const frontY = box.min.y + DOOR_Y_NUDGE;

    const doorway = new THREE.Mesh(
        new THREE.PlaneGeometry(DOOR_WIDTH, DOOR_HEIGHT),
        new THREE.MeshBasicMaterial({ color: 0x120c06, side: THREE.DoubleSide })
    );
    doorway.rotation.x = Math.PI / 2;
    doorway.position.set(cx, frontY - 0.1, DOOR_HEIGHT / 2);
    house.add(doorway);

    const pivot = new THREE.Group();
    pivot.position.set(cx - DOOR_WIDTH / 2, frontY - 0.4, 0);

    const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(DOOR_WIDTH, 0.8, DOOR_HEIGHT),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    leaf.position.set(DOOR_WIDTH / 2, 0, DOOR_HEIGHT / 2);
    pivot.add(leaf);

    const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffd34d })
    );
    knob.position.set(DOOR_WIDTH - 1, -0.6, DOOR_HEIGHT / 2);
    pivot.add(knob);
    house.add(pivot);

    // Porch lamp: a glowing bulb plus a warm pool of light on the ground (no real light = fast)
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(cx, frontY - 1.2, 14);
    house.add(lamp);

    const pool = new THREE.Mesh(glowGeo, glowMat);
    pool.position.set(cx, frontY - 9, 0.25);
    house.add(pool);

    addNamePlaque(house, cx, frontY, 15.5);

    house.userData.door = { pivot: pivot, open: 0, target: 0 };
    house.userData.doorLocalX = cx;
    house.userData.doorLocalY = frontY;
    house.userData.topZ = box.max.z;
}

function spawnHouses() {
    houses.forEach((h) => scene.remove(h));
    houses.length = 0;
    if (!rawHouseScene) return;

    for (let i = 0; i < HOUSE_COUNT; i += 1) {
        let x = 0;
        let y = 0;
        let valid = false;
        let tries = 0;

        while (!valid && tries < 300) {
            x = (Math.random() * 2 - 1) * HOUSE_SPAWN_RANGE;
            y = (Math.random() * 2 - 1) * HOUSE_SPAWN_RANGE;
            valid = true;

            if (Math.hypot(x, y) < SAFE_ZONE_RADIUS) valid = false;

            for (const h of houses) {
                if (Math.hypot(x - h.position.x, y - h.position.y) < MIN_HOUSE_GAP) {
                    valid = false;
                    break;
                }
            }

            for (const t of trees) {
                const minDist = HOUSE_COLLISION_RADIUS + t.userData.radius + TREE_HOUSE_GAP;
                if (Math.hypot(x - t.position.x, y - t.position.y) < minDist) {
                    valid = false;
                    break;
                }
            }
            tries += 1;
        }

        if (!valid) continue;

        const house = buildCleanModel(rawHouseScene, HOUSE_SIZE);
        addDoor(house);
        house.position.set(x, y, 0);
        scene.add(house);
        houses.push(house);
    }
}

function pushOutOfCircle(obj, cx, cy, radius) {
    const ddx = obj.position.x - cx;
    const ddy = obj.position.y - cy;
    const d = Math.hypot(ddx, ddy);
    if (d < radius) {
        if (d > 0.001) {
            obj.position.x = cx + (ddx / d) * radius;
            obj.position.y = cy + (ddy / d) * radius;
        } else {
            obj.position.x = cx + radius;
        }
    }
}

function pushOutOfObstacles(obj) {
    for (const house of houses) {
        pushOutOfCircle(obj, house.position.x, house.position.y, HOUSE_COLLISION_RADIUS);
    }
    for (const tree of trees) {
        pushOutOfCircle(obj, tree.position.x, tree.position.y, tree.userData.radius);
    }
}

function isFreeSpot(x, y, margin) {
    for (const h of houses) {
        if (Math.hypot(x - h.position.x, y - h.position.y) < HOUSE_COLLISION_RADIUS + margin) return false;
    }
    for (const t of trees) {
        if (Math.hypot(x - t.position.x, y - t.position.y) < t.userData.radius + margin) return false;
    }
    return true;
}

function updateDoors(dt) {
    for (const house of houses) {
        const door = house.userData.door;
        if (!door) continue;
        if (door.open < door.target) door.open = Math.min(door.open + DOOR_SPEED * dt, door.target);
        else if (door.open > door.target) door.open = Math.max(door.open - DOOR_SPEED * dt, door.target);
        door.pivot.rotation.z = -door.open * DOOR_SWING; // negative = swings outward
    }
}

// ==========================================
// 8. TREES (SHARED GEOMETRY, SOLID TRUNKS)
// ==========================================
const trunkGeo = new THREE.CylinderGeometry(1.6, 2.2, 8, 8).translate(0, 4, 0);
const pineGeos = [
    new THREE.ConeGeometry(11, 14, 8).translate(0, 14, 0),
    new THREE.ConeGeometry(8.5, 12, 8).translate(0, 21, 0),
    new THREE.ConeGeometry(6, 10, 8).translate(0, 27, 0)
];
const roundGeoBig = new THREE.IcosahedronGeometry(10, 1).translate(0, 17, 0);
const roundGeoSmall = new THREE.IcosahedronGeometry(6.5, 1).translate(5, 14, 3);
const treeAppleGeo = new THREE.SphereGeometry(1.1, 8, 8);
const treeAppleMat = new THREE.MeshStandardMaterial({ color: 0xff2222, roughness: 0.3 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true });
const pineMat = new THREE.MeshStandardMaterial({ color: 0x1b5e32, flatShading: true });
const leafMats = [0x2e8b3d, 0x3f9e4a, 0x5ab552].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true })
);
const blobGeo = new THREE.CircleGeometry(10, 24);
const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });

function buildTree() {
    const tree = new THREE.Group();
    const inner = new THREE.Group();
    inner.rotation.x = Math.PI / 2; // Y-up -> Z-up
    inner.add(new THREE.Mesh(trunkGeo, trunkMat));

    if (Math.random() < 0.5) {
        for (const g of pineGeos) inner.add(new THREE.Mesh(g, pineMat));
    } else {
        const mat = leafMats[Math.floor(Math.random() * leafMats.length)];
        inner.add(new THREE.Mesh(roundGeoBig, mat));
        inner.add(new THREE.Mesh(roundGeoSmall, mat));

        const appleCount = 5 + Math.floor(Math.random() * 4);
        for (let a = 0; a < appleCount; a += 1) {
            const apple = new THREE.Mesh(treeAppleGeo, treeAppleMat);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const rad = 7.5 + Math.random() * 2.5;
            apple.position.set(
                Math.sin(phi) * Math.cos(theta) * rad,
                17 + Math.cos(phi) * rad,
                Math.sin(phi) * Math.sin(theta) * rad
            );
            inner.add(apple);
        }
        tree.userData.leafy = true;
    }
    tree.add(inner);

    const blob = new THREE.Mesh(blobGeo, blobMat);
    blob.position.z = 0.15;
    tree.add(blob);
    return tree;
}

function spawnTrees() {
    trees.forEach((t) => scene.remove(t));
    trees.length = 0;

    for (let i = 0; i < TREE_COUNT; i += 1) {
        const s = TREE_MIN_SCALE + Math.random() * (TREE_MAX_SCALE - TREE_MIN_SCALE);
        let x = 0;
        let y = 0;
        let valid = false;
        let tries = 0;

        while (!valid && tries < 100) {
            x = (Math.random() * 2 - 1) * TREE_SPAWN_RANGE;
            y = (Math.random() * 2 - 1) * TREE_SPAWN_RANGE;
            valid = true;

            if (Math.hypot(x, y) < SAFE_ZONE_RADIUS) valid = false;

            for (const t of trees) {
                if (Math.hypot(x - t.position.x, y - t.position.y) < TREE_MIN_GAP) {
                    valid = false;
                    break;
                }
            }
            tries += 1;
        }
        if (!valid) continue;

        const tree = buildTree();
        tree.scale.setScalar(s);
        tree.rotation.z = Math.random() * Math.PI * 2;
        tree.position.set(x, y, 0);
        tree.userData.radius = TREE_COLLISION_RADIUS * s;
        scene.add(tree);
        trees.push(tree);
    }
}

// ==========================================
// 9. PERIMETER FENCE (INSTANCED = 2 DRAW CALLS)
// ==========================================
function spawnPerimeterFence() {
    const limit = MAP_LIMIT - 10;
    const step = 10;
    const spots = [];
    for (let pos = -limit; pos <= limit; pos += step) {
        spots.push([pos, limit, true]);
        spots.push([pos, -limit, true]);
        spots.push([-limit, pos, false]);
        spots.push([limit, pos, false]);
    }

    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.8 });
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 2.2, 10), fenceMat, spots.length);
    const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(10, 0.8, 1.8), fenceMat, spots.length * 2);
    posts.frustumCulled = false;
    rails.frustumCulled = false;

    const dummy = new THREE.Object3D();
    let r = 0;
    spots.forEach((spot, i) => {
        const x = spot[0];
        const y = spot[1];
        const horizontal = spot[2];

        dummy.rotation.set(0, 0, 0);
        dummy.position.set(x, y, 5);
        dummy.updateMatrix();
        posts.setMatrixAt(i, dummy.matrix);

        for (const z of [3, 7]) {
            dummy.rotation.set(0, 0, horizontal ? 0 : Math.PI / 2);
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            rails.setMatrixAt(r, dummy.matrix);
            r += 1;
        }
    });
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    scene.add(posts);
    scene.add(rails);
}

// ==========================================
// 10. HIDING IN HOUSES
// ==========================================
function getDoorFront(house) {
    return new THREE.Vector3(
        house.position.x + house.userData.doorLocalX,
        house.position.y + house.userData.doorLocalY - 3,
        0
    );
}

function getExitPoint(house) {
    const outDist = Math.max(HOUSE_COLLISION_RADIUS + 2, Math.abs(house.userData.doorLocalY) + 6);
    return new THREE.Vector3(house.position.x + house.userData.doorLocalX, house.position.y - outDist, 0);
}

function findNearbyDoorHouse() {
    let best = null;
    let bestDist = DOOR_RANGE;
    for (const h of houses) {
        const p = getDoorFront(h);
        const d = Math.hypot(player.position.x - p.x, player.position.y - p.y);
        if (d < bestDist) {
            bestDist = d;
            best = h;
        }
    }
    return best;
}

function startHiding(house) {
    tipsShown.hide = true;
    hideHouse = house;
    siegeTime = 0;
    hideHealTimer = 0;
    hideState = 'opening_in';
    house.userData.door.target = 1;
    playSound('door');
}

function startExit() {
    if (!hideHouse) return;
    hideState = 'opening_out';
    hideHouse.userData.door.target = 1;
    playSound('door');
}

function moveAlongTargets(dt) {
    const target = hideTargets[hideTargetIndex];
    const tx = target.x - player.position.x;
    const ty = target.y - player.position.y;
    const dist = Math.hypot(tx, ty);
    const step = HIDE_WALK_SPEED * dt;

    if (dist <= step) {
        player.position.x = target.x;
        player.position.y = target.y;
        hideTargetIndex += 1;
        return hideTargetIndex >= hideTargets.length;
    }

    player.position.x += (tx / dist) * step;
    player.position.y += (ty / dist) * step;
    const targetAngle = Math.atan2(ty, tx) + PLAYER_FACING_OFFSET;
    playerAngle = lerpAngle(playerAngle, targetAngle, 1 - Math.exp(-TURN_SPEED * dt));
    return false;
}

function updateHiding(dt) {
    if (hideState === 'out' || !hideHouse) return;
    const door = hideHouse.userData.door;

    if (hideState === 'opening_in') {
        if (door.open >= 0.98) {
            hideTargets = [getDoorFront(hideHouse), new THREE.Vector3(hideHouse.position.x, hideHouse.position.y, 0)];
            hideTargetIndex = 0;
            hideState = 'entering';
        }
    } else if (hideState === 'entering') {
        if (moveAlongTargets(dt)) {
            hideState = 'inside';
            door.target = 0; // close the door behind him
            hideMarker.visible = true;
            if (!tipsShown.inside) {
                tipsShown.inside = true;
                showTip('Resting heals you, but the swarm gathers outside. Press [E] to burst out with a free shockwave!');
            }
        }
    } else if (hideState === 'opening_out') {
        if (door.open >= 0.98) {
            hideTargets = [getExitPoint(hideHouse)];
            hideTargetIndex = 0;
            hideMarker.visible = false;
            hideState = 'exiting';
            hideLock = HIDE_LOCK_TIME;
        }
    } else if (hideState === 'exiting') {
        if (moveAlongTargets(dt)) {
            hideState = 'out';
            door.target = 0;
            hideHouse = null;
            siegeTime = 0;
            hideHealTimer = 0;
            ambushBurst(); // free shockwave on the doorstep
        }
    }
}

function resetHiding() {
    hideState = 'out';
    hideHouse = null;
    hideTargets = [];
    hideTargetIndex = 0;
    hideMarker.visible = false;
}

// How much of the swarm has worked out where Tode is hiding (0 = nobody, 1 = everybody)
function siegeFraction() {
    if (hideState === 'out' || hideState === 'opening_in' || hideState === 'exiting') return 0;
    return Math.max(0, Math.min(1, (siegeTime - SIEGE_DELAY) / SIEGE_RAMP));
}

function getHealInterval() {
    return HIDE_HEAL_INTERVAL / (1 + 0.4 * upg.burrow);
}

// Resting inside a house slowly heals Tode
function updateResting(dt) {
    if (lives >= maxLives) {
        hideHealTimer = 0;
        return;
    }
    hideHealTimer += dt;
    if (hideHealTimer >= getHealInterval()) {
        hideHealTimer = 0;
        lives += 1;
        playSound('pickup');
        floatText(hideHouse.position, '+1 ❤️ rested', '#ff9a9a', true);
        updateUI();
    }
}

function countInsectsOutside() {
    if (!hideHouse) return 0;
    let n = 0;
    for (const e of enemies) {
        if (Math.hypot(e.position.x - hideHouse.position.x, e.position.y - hideHouse.position.y) < 60) n += 1;
    }
    return n;
}

// Stepping out of the door fires a free shockwave into the part of the swarm waiting in front of it
function ambushBurst() {
    floatText(player.position, 'AMBUSH!', '#7dffd0', true);
    triggerShockwave(true);
}

// The swarm only chases while Tode is exposed; otherwise it wanders randomly (or gathers at the door).
function isSwarmChasing() {
    return hideState === 'out' || hideState === 'opening_in' || hideState === 'exiting';
}

// ==========================================
// 11. INSECT SWARM (4 VARIANTS)
// ==========================================
function clampToMap(obj, edge) {
    obj.position.x = Math.max(-edge, Math.min(edge, obj.position.x));
    obj.position.y = Math.max(-edge, Math.min(edge, obj.position.y));
}

function createEnemy(typeKey, x, y) {
    const type = ENEMY_TYPES[typeKey];
    const enemy = buildCleanModel(rawEnemyScene, ENEMY_SIZE * type.scale);

    // Each enemy gets its own materials so it can be tinted and flash when hit
    const mats = [];
    enemy.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        const wasArray = Array.isArray(child.material);
        const list = wasArray ? child.material : [child.material];
        const cloned = list.map((m) => {
            const c = m.clone();
            if (c.emissive) {
                if (type.tint !== null) {
                    c.emissive.setHex(type.tint);
                    c.emissiveIntensity = 0.45;
                }
                mats.push({ m: c, color: c.emissive.clone(), intensity: c.emissiveIntensity });
            }
            return c;
        });
        child.material = wasArray ? cloned : cloned[0];
    });

    enemy.position.set(x, y, 0);
    enemy.rotation.z = Math.atan2(player.position.y - y, player.position.x - x) + ENEMY_FACING_OFFSET;
    Object.assign(enemy.userData, {
        typeKey: typeKey,
        hp: type.hp,
        maxHp: type.hp,
        radius: 3.5 * type.scale,
        catchRadius: CATCH_RADIUS * Math.pow(type.scale, 0.7),
        wanderAngle: Math.random() * Math.PI * 2,
        wanderTimer: Math.random() * 2,
        flash: 0,
        siegeRank: Math.random(),
        gatherAngle: Math.random() < 0.75 ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3 : Math.random() * Math.PI * 2,
        mats: mats
    });

    scene.add(enemy);
    enemies.push(enemy);
    return enemy;
}

function removeEnemy(enemy) {
    scene.remove(enemy);
    for (const o of enemy.userData.mats) o.m.dispose();
    const idx = enemies.indexOf(enemy);
    if (idx !== -1) enemies.splice(idx, 1);
}

function clearEnemies() {
    while (enemies.length > 0) removeEnemy(enemies[enemies.length - 1]);
}

function pickEnemyType() {
    const cfg = LEVEL_CONFIGS[levelIndex];
    const r = Math.random();
    if (r < cfg.bigChance) return 'big';
    if (r < cfg.bigChance + cfg.fastChance) return 'fast';
    return 'normal';
}

function spawnEnemy(distMin, distMax, typeKey) {
    const cfg = LEVEL_CONFIGS[levelIndex];
    if (!rawEnemyScene || enemies.length >= cfg.maxSwarm) return null;

    let x = 0;
    let y = 0;
    let found = false;
    for (let attempt = 0; attempt < 20 && !found; attempt += 1) {
        // 70% of the swarm arrives from the far (visible) side of the screen
        const angle = Math.random() < 0.7
            ? Math.PI * (0.1 + Math.random() * 0.8)
            : Math.random() * Math.PI * 2;
        const dist = distMin + Math.random() * (distMax - distMin);
        x = Math.max(-SPAWN_EDGE, Math.min(SPAWN_EDGE, player.position.x + Math.cos(angle) * dist));
        y = Math.max(-SPAWN_EDGE, Math.min(SPAWN_EDGE, player.position.y + Math.sin(angle) * dist));

        const farEnough = Math.hypot(x - player.position.x, y - player.position.y) >= 40;
        found = farEnough && isFreeSpot(x, y, 3);
    }
    if (!found) return null;

    return createEnemy(typeKey || 'normal', x, y);
}

function spawnInitialSwarm() {
    clearEnemies();
    const cfg = LEVEL_CONFIGS[levelIndex];
    const count = Math.min(cfg.maxSwarm, 14 + levelIndex * 2);
    for (let i = 0; i < count; i += 1) {
        spawnEnemy(55, 110, pickEnemyType());
    }
}

function spawnBoss() {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 30; attempt += 1) {
        const angle = Math.PI * (0.3 + Math.random() * 0.4);
        x = Math.max(-SPAWN_EDGE, Math.min(SPAWN_EDGE, player.position.x + Math.cos(angle) * 110));
        y = Math.max(-SPAWN_EDGE, Math.min(SPAWN_EDGE, player.position.y + Math.sin(angle) * 110));
        if (isFreeSpot(x, y, 12)) break;
    }
    boss = createEnemy('boss', x, y);
    bossDead = false;
    playSound('boss');
    addShake(1.2);
}

function chaseEnemy(enemy, dt) {
    const speed = LEVEL_CONFIGS[levelIndex].enemySpeed * ENEMY_TYPES[enemy.userData.typeKey].speed;
    const ex = player.position.x - enemy.position.x;
    const ey = player.position.y - enemy.position.y;
    const dist = Math.hypot(ex, ey);
    if (dist > 0.1) {
        enemy.position.x += (ex / dist) * speed * dt;
        enemy.position.y += (ey / dist) * speed * dt;
        enemy.rotation.z = Math.atan2(ey, ex) + ENEMY_FACING_OFFSET;
    }
}

function wanderEnemy(enemy, dt) {
    const data = enemy.userData;
    data.wanderTimer -= dt;
    if (data.wanderTimer <= 0) {
        data.wanderAngle = Math.random() * Math.PI * 2;
        data.wanderTimer = 0.8 + Math.random() * 1.6;
    }
    if (Math.abs(enemy.position.x) > ENEMY_EDGE - 10 || Math.abs(enemy.position.y) > ENEMY_EDGE - 10) {
        data.wanderAngle = Math.atan2(-enemy.position.y, -enemy.position.x);
        data.wanderTimer = 1.5;
    }
    const speed = LEVEL_CONFIGS[levelIndex].enemySpeed * ENEMY_TYPES[data.typeKey].speed * WANDER_SPEED_FACTOR;
    enemy.position.x += Math.cos(data.wanderAngle) * speed * dt;
    enemy.position.y += Math.sin(data.wanderAngle) * speed * dt;
    enemy.rotation.z = lerpAngle(enemy.rotation.z, data.wanderAngle + ENEMY_FACING_OFFSET, 1 - Math.exp(-8 * dt));
}

// While Tode hides, part of the swarm crowds around the house
function gatherEnemy(enemy, dt) {
    const d = enemy.userData;
    const ring = HOUSE_COLLISION_RADIUS + 8 + d.siegeRank * 13;
    const tx = hideHouse.position.x + Math.cos(d.gatherAngle) * ring;
    const ty = hideHouse.position.y + Math.sin(d.gatherAngle) * ring;
    const ex = tx - enemy.position.x;
    const ey = ty - enemy.position.y;
    const dist = Math.hypot(ex, ey);

    if (dist > 1.5) {
        const speed = LEVEL_CONFIGS[levelIndex].enemySpeed * ENEMY_TYPES[d.typeKey].speed * 0.9;
        const step = Math.min(dist, speed * dt);
        enemy.position.x += (ex / dist) * step;
        enemy.position.y += (ey / dist) * step;
    }
    const lookAt = Math.atan2(hideHouse.position.y - enemy.position.y, hideHouse.position.x - enemy.position.x);
    enemy.rotation.z = lerpAngle(enemy.rotation.z, lookAt + ENEMY_FACING_OFFSET, 1 - Math.exp(-8 * dt));
}

function flashEnemy(enemy) {
    enemy.userData.flash = 0.15;
    for (const o of enemy.userData.mats) {
        o.m.emissive.setHex(0xffffff);
        o.m.emissiveIntensity = 1.2;
    }
}

function updateEnemyFlash(dt) {
    for (const enemy of enemies) {
        if (enemy.userData.flash > 0) {
            enemy.userData.flash -= dt;
            if (enemy.userData.flash <= 0) {
                for (const o of enemy.userData.mats) {
                    o.m.emissive.copy(o.color);
                    o.m.emissiveIntensity = o.intensity;
                }
            }
        }
    }
}

// ==========================================
// 12. PICKUPS (FALLEN APPLES)
// ==========================================
const pickupAppleGeo = new THREE.SphereGeometry(2.3, 12, 12);
const pickupStemGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.4, 6).rotateX(Math.PI / 2);
const pickupHaloGeo = new THREE.CircleGeometry(7, 24);
const pickupMats = {
    heal: new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1111, emissiveIntensity: 0.6, roughness: 0.3 }),
    frenzy: new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffaa00, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.5 })
};
const pickupStemMat = new THREE.MeshStandardMaterial({ color: 0x4a2e12 });
const pickupHaloMats = {
    heal: new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }),
    frenzy: new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
};

function spawnPickup() {
    if (pickups.length >= PICKUP_MAX) return;
    const kind = Math.random() < 0.3 ? 'frenzy' : 'heal';
    const leafy = trees.filter((t) => t.userData.leafy);

    let x = 0;
    let y = 0;
    let ok = false;
    for (let tries = 0; tries < 24 && !ok; tries += 1) {
        if (leafy.length > 0 && tries < 16) {
            const t = leafy[Math.floor(Math.random() * leafy.length)];
            const a = Math.random() * Math.PI * 2;
            const d = t.userData.radius + 8 + Math.random() * 8;
            x = t.position.x + Math.cos(a) * d;
            y = t.position.y + Math.sin(a) * d;
        } else {
            x = (Math.random() * 2 - 1) * 300;
            y = (Math.random() * 2 - 1) * 300;
        }
        ok = Math.abs(x) < MAP_LIMIT - 40
            && Math.abs(y) < MAP_LIMIT - 40
            && Math.hypot(x - player.position.x, y - player.position.y) > 25
            && isFreeSpot(x, y, 6);
    }
    if (!ok) return;

    const group = new THREE.Group();
    const apple = new THREE.Mesh(pickupAppleGeo, pickupMats[kind]);
    apple.position.z = 4;
    group.add(apple);
    const stem = new THREE.Mesh(pickupStemGeo, pickupStemMat);
    stem.position.z = 6.6;
    apple.userData.stem = stem;
    group.add(stem);
    const halo = new THREE.Mesh(pickupHaloGeo, pickupHaloMats[kind]);
    halo.position.z = 0.3;
    group.add(halo);

    group.position.set(x, y, 0);
    group.userData = { kind: kind, age: 0, apple: apple, stem: stem, halo: halo };
    scene.add(group);
    pickups.push(group);
    burst(new THREE.Vector3(x, y, 4), kind === 'frenzy' ? 0xffd34d : 0xff4444, 6, 20, 1);
}

function collectPickup(p) {
    const pos = p.position.clone();
    if (p.userData.kind === 'heal') {
        if (lives < maxLives) {
            lives += 1;
            floatText(pos, '+1 ❤️', '#ff6b6b', true);
        } else {
            score += 50;
            floatText(pos, '+50', '#ffd34d', true);
        }
    } else {
        frenzyTimer = FRENZY_TIME;
        score += 25;
        floatText(pos, 'FRENZY!', '#ffd34d', true);
    }
    playSound('pickup');
    burst(new THREE.Vector3(pos.x, pos.y, 4), p.userData.kind === 'frenzy' ? 0xffd34d : 0xff5555, 14, 45, 1.2);
    removePickup(p);
    updateUI();
}

function removePickup(p) {
    scene.remove(p);
    const idx = pickups.indexOf(p);
    if (idx !== -1) pickups.splice(idx, 1);
}

function clearPickups() {
    while (pickups.length > 0) removePickup(pickups[pickups.length - 1]);
}

function updatePickups(dt, time) {
    for (let i = pickups.length - 1; i >= 0; i -= 1) {
        const p = pickups[i];
        p.userData.age += dt;
        const bob = Math.sin(time * 3 + i) * 1.2;
        p.userData.apple.position.z = 4 + bob;
        p.userData.stem.position.z = 6.6 + bob;
        p.userData.apple.rotation.z += dt * 1.5;
        p.userData.halo.scale.setScalar(1 + Math.sin(time * 4 + i) * 0.12);

        if (p.userData.age > PICKUP_LIFETIME) {
            removePickup(p);
            continue;
        }

        if (gameState === 'playing' && hideState === 'out') {
            const d = Math.hypot(player.position.x - p.position.x, player.position.y - p.position.y);
            if (d < PICKUP_RADIUS) collectPickup(p);
        }
    }
}

// ==========================================
// 13. EFFECTS (PARTICLES, SHAKE, SHOCKWAVES)
// ==========================================
const particleGeo = new THREE.IcosahedronGeometry(1, 0);
const particleMatCache = {};

function getParticleMat(color) {
    if (!particleMatCache[color]) {
        particleMatCache[color] = new THREE.MeshBasicMaterial({ color: color });
    }
    return particleMatCache[color];
}

function burst(pos, color, count, power, size) {
    const mat = getParticleMat(color);
    for (let i = 0; i < count; i += 1) {
        const mesh = new THREE.Mesh(particleGeo, mat);
        const baseScale = size * (0.6 + Math.random() * 0.9);
        mesh.scale.setScalar(baseScale);
        mesh.position.set(pos.x, pos.y, Math.max(pos.z, 1.5));

        const a = Math.random() * Math.PI * 2;
        const speed = power * (0.4 + Math.random() * 0.8);
        mesh.userData = {
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            vz: 20 + Math.random() * power * 0.9,
            life: 0.45 + Math.random() * 0.35,
            maxLife: 0.8,
            baseScale: baseScale
        };
        mesh.userData.maxLife = mesh.userData.life;
        scene.add(mesh);
        particles.push(mesh);
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        const d = p.userData;
        d.life -= dt;
        if (d.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
            continue;
        }
        d.vz -= 120 * dt;
        p.position.x += d.vx * dt;
        p.position.y += d.vy * dt;
        p.position.z += d.vz * dt;
        if (p.position.z < 0.5) {
            p.position.z = 0.5;
            d.vz *= -0.35;
            d.vx *= 0.7;
            d.vy *= 0.7;
        }
        p.scale.setScalar(Math.max(0.01, d.baseScale * (d.life / d.maxLife)));
    }
}

function clearParticles() {
    for (const p of particles) scene.remove(p);
    particles.length = 0;
}

let shake = 0;
function addShake(amount) {
    shake = Math.min(2.5, Math.max(shake, amount));
}

function updateShockwaves(dt) {
    for (let i = shockwaves.length - 1; i >= 0; i -= 1) {
        const sw = shockwaves[i];
        sw.age += dt;
        const t = Math.min(sw.age / ATTACK_DURATION, 1);
        const eased = 1 - (1 - t) * (1 - t);
        const radius = Math.max(sw.radius * eased, 0.01);
        sw.mesh.scale.set(radius, radius, 1);
        sw.mesh.position.x = player.position.x;
        sw.mesh.position.y = player.position.y;
        sw.mat.opacity = 0.9 * (1 - t);

        if (t >= 1) {
            scene.remove(sw.mesh);
            sw.geo.dispose();
            sw.mat.dispose();
            shockwaves.splice(i, 1);
        }
    }
}

function clearShockwaves() {
    for (const sw of shockwaves) {
        scene.remove(sw.mesh);
        sw.geo.dispose();
        sw.mat.dispose();
    }
    shockwaves.length = 0;
}

// ==========================================
// 14. COMBAT & LEVEL PROGRESSION
// ==========================================
function getAttackRadius() {
    return ATTACK_RADIUS * (1 + 0.2 * upg.radius);
}

function getShockCooldown() {
    const base = Math.max(0.3, SHOCK_COOLDOWN * Math.pow(0.82, upg.recharge));
    return frenzyTimer > 0 ? base * 0.5 : base;
}

// force = true is used by the door ambush: it fires even while the shockwave is recharging
function triggerShockwave(force) {
    if (shockCooldown > 0 && !force) return;
    shockCooldownMax = getShockCooldown();
    shockCooldown = shockCooldownMax;
    const attackRadius = getAttackRadius();
    const damage = 1 + upg.damage;
    playSound('zap');
    addShake(0.35);

    const geo = new THREE.RingGeometry(0.75, 1, 64);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(player.position.x, player.position.y, 0.6);
    mesh.scale.set(0.01, 0.01, 1);
    scene.add(mesh);
    shockwaves.push({ mesh: mesh, geo: geo, mat: mat, age: 0, radius: attackRadius });

    let kills = 0;
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
        const enemy = enemies[i];
        const data = enemy.userData;
        const type = ENEMY_TYPES[data.typeKey];
        const dist = Math.hypot(player.position.x - enemy.position.x, player.position.y - enemy.position.y);
        if (dist > attackRadius + data.radius * 0.4) continue;

        data.hp -= damage;
        if (data.hp <= 0) {
            kills += 1;
            score += type.score;
            floatText(enemy.position, `+${type.score}`, '#ffd34d', data.typeKey === 'boss');
            burst(enemy.position, type.color, data.typeKey === 'boss' ? 40 : 10, data.typeKey === 'boss' ? 90 : 45, data.typeKey === 'boss' ? 2.4 : 1.4);
            if (data.typeKey === 'boss') {
                bossDead = true;
                boss = null;
                addShake(2);
                playSound('win');
                floatText(enemy.position, 'SWARM QUEEN DOWN!', '#ff5a7a', true);
            } else {
                playSound('kill');
            }
            removeEnemy(enemy);
        } else {
            // Survived: knock it back and flash it
            const away = Math.atan2(enemy.position.y - player.position.y, enemy.position.x - player.position.x);
            const knock = data.typeKey === 'boss' ? 8 : 22;
            enemy.position.x += Math.cos(away) * knock;
            enemy.position.y += Math.sin(away) * knock;
            clampToMap(enemy, ENEMY_EDGE);
            flashEnemy(enemy);
            burst(enemy.position, type.color, 6, 30, 1.1);
            playSound('kill');
        }
    }

    if (kills > 0) {
        totalKills += kills;
        levelKills += kills;

        if (kills >= 3) {
            const bonus = Math.min(150, (kills - 2) * 15);
            score += bonus;
            floatText(player.position, `COMBO x${kills}! +${bonus}`, '#7dffd0', true);
            playSound('combo');
        }
        updateUI();
        checkLevelComplete();
    }
}

function checkLevelComplete() {
    if (gameState !== 'playing') return;
    const cfg = LEVEL_CONFIGS[levelIndex];
    if (levelKills < cfg.killsRequired) return;

    if (cfg.boss && !bossDead) {
        if (!bossHintShown) {
            bossHintShown = true;
            showBanner('FINISH THE BOSS!', 'Defeat the Swarm Queen to win', '#ff5a7a');
        }
        return;
    }
    advanceLevel();
}

function advanceLevel() {
    if (levelIndex + 1 >= LEVEL_CONFIGS.length) {
        triggerVictory();
        return;
    }
    playSound('levelup');
    if (lives < maxLives) {
        lives += 1;
        floatText(player.position, 'LEVEL BONUS +1 ❤️', '#ff6b6b', true);
    }
    clearEnemies();
    bossBar.style.display = 'none';
    setPrompt('');
    updateUI();
    gameState = 'upgrade';
    showUpgradeChoices();
}

function showUpgradeChoices() {
    const pool = UPGRADES.filter((u) => upg[u.id] < u.max);
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = pool[i];
        pool[i] = pool[j];
        pool[j] = tmp;
    }
    upgradeChoices = pool.slice(0, 3);

    if (upgradeChoices.length === 0) {
        gameState = 'playing';
        startLevel(levelIndex + 1);
        return;
    }

    upgradeCards.innerHTML = upgradeChoices.map((u, i) => `
        <div class="u-card" data-index="${i}">
            <div class="u-icon">${u.icon}</div>
            <div class="u-name">${u.name}</div>
            <div class="u-desc">${u.desc}</div>
            <div class="u-lvl">Level ${upg[u.id]} → ${upg[u.id] + 1}</div>
            <div class="u-key">Press ${i + 1}</div>
        </div>`).join('');
    upgradeModal.style.display = 'block';
}

function chooseUpgrade(index) {
    if (gameState !== 'upgrade') return;
    const u = upgradeChoices[index];
    if (!u) return;

    upg[u.id] += 1;
    if (u.id === 'heart') {
        maxLives = Math.min(HARD_MAX_LIVES, maxLives + 1);
        lives = Math.min(maxLives, lives + 1);
    }

    upgradeModal.style.display = 'none';
    playSound('pickup');
    floatText(player.position, `${u.icon} ${u.name}!`, '#7dffd0', true);
    gameState = 'playing';
    startLevel(levelIndex + 1);
}

function startLevel(idx) {
    levelIndex = idx;
    levelKills = 0;
    boss = null;
    bossDead = false;
    bossHintShown = false;
    spawnTimer = 0;
    const cfg = LEVEL_CONFIGS[idx];

    clearEnemies();
    spawnInitialSwarm();
    if (cfg.boss) spawnBoss();

    updateUI();
    if (cfg.boss) {
        showBanner(`LEVEL ${cfg.level}`, 'BOSS FIGHT! The Swarm Queen has arrived!', '#ff5a7a');
    } else {
        showBanner(`LEVEL ${cfg.level}`, `Eliminate ${cfg.killsRequired} insects!`, '#00ff88');
    }
}

// ==========================================
// 15. GAME FLOW: START, DAMAGE, GAME OVER, VICTORY
// ==========================================
function onAssetsReady() {
    if (assetsReady) return;
    assetsReady = true;

    if (!rawTodeScene) rawTodeScene = makeFallbackScene('tode');
    if (!rawHouseScene) rawHouseScene = makeFallbackScene('house');
    if (!rawEnemyScene) rawEnemyScene = makeFallbackScene('enemy');
    prepareHouseScene(rawHouseScene);

    const model = buildCleanModel(rawTodeScene, 11);
    player.add(model);
    player.userData.model = model;

    spawnHouses();

    loadFill.style.width = '100%';
    startPrompt.textContent = 'Press ENTER or click to start';
    startPrompt.className = 'ready';
    gameState = 'title';
}

function startGame() {
    if (!assetsReady) return;
    initAudio();
    titleScreen.style.display = 'none';
    hud.style.display = 'block';
    gameOverModal.style.display = 'none';
    victoryModal.style.display = 'none';
    pauseModal.style.display = 'none';

    score = 0;
    totalKills = 0;
    lives = START_LIVES;
    maxLives = BASE_MAX_LIVES;
    for (const k in upg) upg[k] = 0;
    upgradeModal.style.display = 'none';
    siegeTime = 0;
    hideHealTimer = 0;
    hideLock = 0;
    playTime = 0;
    tipToast.style.display = 'none';
    invulnerableTimer = 0;
    shockCooldown = 0;
    frenzyTimer = 0;
    pickupTimer = 6;
    playerAngle = 0;
    shake = 0;

    player.position.set(0, 0, 0);
    if (player.userData.model) player.userData.model.rotation.z = 0;
    resetHiding();
    clearShockwaves();
    clearPickups();
    clearParticles();
    spawnTrees();
    spawnHouses();
    camSnap = true;

    startLevel(0);
    gameState = 'playing';
}

function takeDamage() {
    if (invulnerableTimer > 0) return;

    lives -= 1;
    invulnerableTimer = INVULNERABLE_TIME;
    playSound('hit');
    flashDamage();
    addShake(1.1);
    updateUI();

    // Shove nearby insects away so Tode gets room to breathe
    for (const enemy of enemies) {
        const dist = Math.hypot(player.position.x - enemy.position.x, player.position.y - enemy.position.y);
        if (dist < 40) {
            const angle = Math.atan2(enemy.position.y - player.position.y, enemy.position.x - player.position.x);
            enemy.position.x = player.position.x + Math.cos(angle) * 45;
            enemy.position.y = player.position.y + Math.sin(angle) * 45;
            clampToMap(enemy, ENEMY_EDGE);
        }
    }

    if (lives <= 0) triggerGameOver();
}

function triggerGameOver() {
    gameState = 'gameover';
    setPrompt('');
    bossBar.style.display = 'none';
    const isNew = saveBest();
    finalScore.textContent = `Score ${score}`;
    finalKills.textContent = `Kills ${totalKills}`;
    finalBest.textContent = isNew ? 'NEW BEST SCORE!' : `Best ${bestScore}`;
    gameOverModal.style.display = 'block';
    playSound('lose');
    updateUI();
}

function triggerVictory() {
    gameState = 'victory';
    setPrompt('');
    bossBar.style.display = 'none';
    const lifeBonus = lives * 100;
    score += lifeBonus;
    const isNew = saveBest();
    vicScore.textContent = `Score ${score} (+${lifeBonus} lives bonus)`;
    vicKills.textContent = `Kills ${totalKills}`;
    vicBest.textContent = isNew ? 'NEW BEST SCORE!' : `Best ${bestScore}`;
    victoryModal.style.display = 'block';
    playSound('win');
    updateUI();
}

function setPaused(wantPause) {
    if (wantPause && gameState === 'playing') {
        gameState = 'paused';
        pauseModal.style.display = 'block';
        stopMusic();
        if (audioCtx) audioCtx.suspend();
    } else if (!wantPause && gameState === 'paused') {
        gameState = 'playing';
        pauseModal.style.display = 'none';
        if (audioCtx) audioCtx.resume();
        startMusic();
    }
}

// ==========================================
// 16. INPUT
// ==========================================
const BLOCKED_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

window.addEventListener('keydown', (e) => {
    if (BLOCKED_KEYS.includes(e.code)) e.preventDefault();
    initAudio(); // browsers only allow audio after the first key press or click

    if (e.code === 'KeyM' && !e.repeat) {
        toggleMute();
        return;
    }

    if (gameState === 'loading') return;

    if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') startGame();
        return;
    }

    if (gameState === 'upgrade') {
        const idx = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
        if (idx !== undefined) chooseUpgrade(idx);
        return;
    }

    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) {
        if (gameState === 'playing') setPaused(true);
        else if (gameState === 'paused') setPaused(false);
        return;
    }

    keys[e.code] = true;

    if (gameState === 'gameover' || gameState === 'victory') {
        if (e.code === 'KeyR' || e.code === 'Enter') startGame();
        return;
    }

    if (gameState !== 'playing') return;

    if (e.code === 'Space' && !e.repeat && hideState === 'out') {
        triggerShockwave();
    }

    if (e.code === 'KeyE' && !e.repeat) {
        if (hideState === 'out') {
            const house = findNearbyDoorHouse();
            if (house && hideLock > 0) floatText(player.position, 'Door locked', '#ff9a9a', false);
            else if (house) startHiding(house);
        } else if (hideState === 'inside') {
            startExit();
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
});

upgradeCards.addEventListener('click', (e) => {
    const card = e.target && e.target.closest ? e.target.closest('.u-card') : null;
    if (card) chooseUpgrade(Number(card.dataset.index));
});

titleScreen.addEventListener('pointerdown', () => {
    initAudio();
    if (gameState === 'title') startGame();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPaused(true);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// 17. MAIN LOOP
// ==========================================
const clock = new THREE.Clock();
const camBase = new THREE.Vector3();
const camLook = new THREE.Vector3();
const camDesired = new THREE.Vector3();
const camLookDesired = new THREE.Vector3();
let camSnap = true;

function updateGame(dt) {
    if (shockCooldown > 0) shockCooldown = Math.max(0, shockCooldown - dt);
    if (frenzyTimer > 0) frenzyTimer = Math.max(0, frenzyTimer - dt);
    if (invulnerableTimer > 0) invulnerableTimer = Math.max(0, invulnerableTimer - dt);

    playTime += dt;
    if (!tipsShown.hide && playTime > 14 && hideState === 'out') {
        tipsShown.hide = true;
        showTip('TIP: Walk up to a house door and press [E] to hide, heal and ambush the swarm!');
    }

    updateHiding(dt);
    if (hideLock > 0) hideLock = Math.max(0, hideLock - dt);
    if (hideState === 'entering' || hideState === 'inside' || hideState === 'opening_out') siegeTime += dt;
    if (hideState === 'inside') updateResting(dt);

    // ---- Tode movement ----
    if (hideState === 'out') {
        let dx = 0;
        let dy = 0;
        if (keys['KeyW'] || keys['ArrowUp']) dy += 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy -= 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;
            const speed = MOVE_SPEED * (1 + 0.12 * upg.speed) * (frenzyTimer > 0 ? FRENZY_SPEED : 1);
            player.position.x += dx * speed * dt;
            player.position.y += dy * speed * dt;

            const targetAngle = Math.atan2(dy, dx) + PLAYER_FACING_OFFSET;
            playerAngle = lerpAngle(playerAngle, targetAngle, 1 - Math.exp(-TURN_SPEED * dt));
        }

        clampToMap(player, PLAYER_EDGE);
        pushOutOfObstacles(player);
    }

    // ---- Tode model: rotation, hiding visibility, damage blink ----
    const model = player.userData.model;
    if (model) {
        model.rotation.z = playerAngle;
        let visible = !(hideState === 'inside' || hideState === 'opening_out');
        if (visible && invulnerableTimer > 0) {
            visible = Math.floor(invulnerableTimer * 12) % 2 === 0;
        }
        model.visible = visible;
    }

    const moveAngle = playerAngle - PLAYER_FACING_OFFSET;
    flashlightTarget.position.set(Math.cos(moveAngle) * 30, Math.sin(moveAngle) * 30, 0);

    // ---- Waves & pickups ----
    const cfg = LEVEL_CONFIGS[levelIndex];
    spawnTimer += dt;
    if (spawnTimer >= cfg.waveInterval) {
        spawnTimer -= cfg.waveInterval;
        spawnEnemy(55, 110, pickEnemyType());
        spawnEnemy(55, 110, pickEnemyType());
    }

    pickupTimer -= dt;
    if (pickupTimer <= 0) {
        pickupTimer = PICKUP_INTERVAL * Math.pow(0.7, upg.apples);
        spawnPickup();
    }

    // ---- Insects: chase while Tode is exposed, wander while he hides ----
    const chasing = isSwarmChasing();
    const siege = siegeFraction();
    for (const enemy of enemies) {
        if (chasing) chaseEnemy(enemy, dt);
        else if (hideHouse && enemy.userData.siegeRank < siege) gatherEnemy(enemy, dt);
        else wanderEnemy(enemy, dt);
    }
    updateEnemyFlash(dt);

    // ---- Swarm separation ----
    for (let i = 0; i < enemies.length; i += 1) {
        const a = enemies[i];
        for (let j = i + 1; j < enemies.length; j += 1) {
            const b = enemies[j];
            const gap = a.userData.radius + b.userData.radius;
            let sx = a.position.x - b.position.x;
            let sy = a.position.y - b.position.y;
            let sd = Math.hypot(sx, sy);

            if (sd < gap) {
                if (sd < 0.001) {
                    const ra = Math.random() * Math.PI * 2;
                    sx = Math.cos(ra);
                    sy = Math.sin(ra);
                    sd = 1;
                }
                const push = (gap - sd) * 0.5;
                a.position.x += (sx / sd) * push;
                a.position.y += (sy / sd) * push;
                b.position.x -= (sx / sd) * push;
                b.position.y -= (sy / sd) * push;
            }
        }
    }

    // ---- Solid obstacles, map edge, and catch check ----
    for (const enemy of enemies) {
        pushOutOfObstacles(enemy);
        clampToMap(enemy, ENEMY_EDGE);

        if (chasing) {
            const catchDist = Math.hypot(player.position.x - enemy.position.x, player.position.y - enemy.position.y);
            if (catchDist < enemy.userData.catchRadius) {
                takeDamage();
                break;
            }
        }
    }
    if (gameState !== 'playing') return;

    // ---- HUD bits that change every frame ----
    chargeFill.style.width = `${shockCooldown > 0 ? (1 - shockCooldown / shockCooldownMax) * 100 : 100}%`;

    if (frenzyTimer > 0) {
        statusChip.style.display = 'block';
        statusChip.textContent = `⚡ FRENZY ${Math.ceil(frenzyTimer)}s`;
    } else {
        statusChip.style.display = 'none';
    }

    if (boss && boss.userData) {
        bossBar.style.display = 'block';
        bossFill.style.width = `${(boss.userData.hp / boss.userData.maxHp) * 100}%`;
    } else {
        bossBar.style.display = 'none';
    }

    if (hideState === 'out') {
        if (!findNearbyDoorHouse()) setPrompt('');
        else if (hideLock > 0) setPrompt(`Door locked (${Math.ceil(hideLock)}s)`);
        else setPrompt('[E] Open door & hide');
    } else if (hideState === 'inside') {
        const heal = lives >= maxLives ? 'fully rested' : `next ❤️ in ${Math.max(1, Math.ceil(getHealInterval() - hideHealTimer))}s`;
        setPrompt(`Resting: ${heal}  |  ${countInsectsOutside()} insects waiting outside  |  [E] Burst out!`);
    } else {
        setPrompt('');
    }
}

function updateCamera(dt, time) {
    if (gameState === 'loading' || gameState === 'title') {
        // Slow cinematic pan behind the title card
        camera.position.set(Math.sin(time * 0.22) * 140, -150, 70);
        camera.lookAt(0, 30, 25);
        camSnap = true;
    } else {
        camDesired.copy(player.position).add(CAM_OFFSET);
        camLookDesired.copy(player.position).add(CAM_LOOK);

        if (camSnap) {
            camBase.copy(camDesired);
            camLook.copy(camLookDesired);
            camSnap = false;
        } else {
            const k = 1 - Math.exp(-9 * dt);
            camBase.lerp(camDesired, k);
            camLook.lerp(camLookDesired, k);
        }

        camera.position.copy(camBase);
        if (shake > 0) {
            camera.position.x += (Math.random() - 0.5) * shake * 4;
            camera.position.y += (Math.random() - 0.5) * shake * 4;
            camera.position.z += (Math.random() - 0.5) * shake * 2;
            shake = Math.max(0, shake - dt * 2.2);
        }
        camera.lookAt(camLook);
    }

    skyGroup.position.set(camera.position.x, camera.position.y, 0);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;

    if (gameState === 'playing') updateGame(dt);

    if (gameState !== 'paused') {
        updateDoors(dt);
        updateShockwaves(dt);
        updateParticles(dt);
        updatePickups(dt, time);
        updateFireflies(dt, time);
        starMat.opacity = 0.75 + Math.sin(time * 3) * 0.2;

        if (hideMarker.visible && hideHouse) {
            hideMarker.position.set(
                hideHouse.position.x,
                hideHouse.position.y,
                hideHouse.userData.topZ + 6 + Math.sin(time * 4)
            );
        }
    }

    updateCamera(dt, time);
    renderer.render(scene, camera);
}

// ==========================================
// 18. BOOT
// ==========================================
spawnOuterForest();
spawnPerimeterFence();
spawnTrees();
updateUI();
animate();