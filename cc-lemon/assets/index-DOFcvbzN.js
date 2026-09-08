(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const l of i.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&r(l)}).observe(document,{childList:!0,subtree:!0});function a(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(o){if(o.ep)return;o.ep=!0;const i=a(o);fetch(o.href,i)}})();const O=["charge","barrier","wave","mirror","bomb"],f=Object.freeze({charge:{key:"charge",name:"CCレモン",cost:0,short:"🍋+1",description:"🍋を1個ためる"},barrier:{key:"barrier",name:"CCバリア",cost:0,short:"防波",description:"CC波だけ防ぐ"},wave:{key:"wave",name:"CC波",cost:2,short:"波",description:"🍋2消費で攻撃"},mirror:{key:"mirror",name:"CCミラー",cost:2,short:"反射",description:"攻撃を跳ね返す"},bomb:{key:"bomb",name:"CC爆弾",cost:5,short:"爆",description:"🍋5消費のバリア無視攻撃"}});function N(){return{round:1,finished:!1,winner:null,players:{left:{lemons:0,lastAction:null},right:{lemons:0,lastAction:null}},lastResolution:null}}function B(e,t=8){return Math.min(t,Math.max(0,e))}function L(e){return O.filter(t=>e>=f[t].cost)}function ae(e){return e==="wave"||e==="bomb"}function W(e,t){if(!(t in f))throw new Error(`Unknown action: ${t}`);if(e<f[t].cost)throw new Error(`Not enough lemons for ${t}`)}function H(e,t){let a=e-f[t].cost;return t==="charge"&&(a+=1),a}function V(e,t){return ae(e)?t==="mirror"?"reflected":e==="wave"&&t==="barrier"?"blocked":"hit":"none"}function D(e,t,a){if(e.finished)throw new Error("Game already finished");W(e.players.left.lemons,t),W(e.players.right.lemons,a);const r=H(e.players.left.lemons,t),o=H(e.players.right.lemons,a),i=V(t,a),l=V(a,t);let c=!1,s=!1;i==="hit"&&(s=!0),l==="hit"&&(c=!0),i==="reflected"&&(c=!0),l==="reflected"&&(s=!0);let u=null,m=!1;c&&s?(u="draw",m=!0):s?(u="left",m=!0):c&&(u="right",m=!0);const h={round:e.round,leftAction:t,rightAction:a,leftOutcome:i,rightOutcome:l,winner:u,finished:m,nextLemons:{left:r,right:o}};return{state:{round:m?e.round:e.round+1,finished:m,winner:u,players:{left:{lemons:r,lastAction:t},right:{lemons:o,lastAction:a}},lastResolution:h},resolution:h}}function X(e,t={left:"上",right:"下"}){const a=t.left,r=t.right,o=[`${a}は${f[e.leftAction].name}、${r}は${f[e.rightAction].name}。`];return e.leftAction==="charge"&&o.push(`${a}は🍋を1個ためた。`),e.rightAction==="charge"&&o.push(`${r}は🍋を1個ためた。`),e.leftOutcome==="blocked"&&o.push(`${a}のCC波は防がれた。`),e.rightOutcome==="blocked"&&o.push(`${r}のCC波は防がれた。`),e.leftOutcome==="reflected"&&o.push(`${a}の攻撃はCCミラーで跳ね返された。`),e.rightOutcome==="reflected"&&o.push(`${r}の攻撃はCCミラーで跳ね返された。`),e.leftOutcome==="hit"&&o.push(`${a}の攻撃が通った。`),e.rightOutcome==="hit"&&o.push(`${r}の攻撃が通った。`),e.winner==="draw"?o.push("相打ち。"):e.winner==="left"?o.push(`${a}の勝ち。`):e.winner==="right"&&o.push(`${r}の勝ち。`),o.join(" ")}function J(e,t=8){return{round:e.round,finished:e.finished,winner:e.winner,players:{left:{lemons:B(e.players.left.lemons,t),lastAction:e.players.left.lastAction},right:{lemons:B(e.players.right.lemons,t),lastAction:e.players.right.lastAction}},lastResolution:e.lastResolution}}const Q=.93,re=6,R=new Map;function E(e){return e==="left"?"right":"left"}function P(e,t){return e==="draw"?0:e===t?1:-1}function ie(e,t){const a=E(t),r=e.players[t].lemons,o=e.players[a].lemons;let i=(r-o)*.08;return r>=5&&o<2?i+=.65:r>=5&&(i+=.2),o>=5&&r<2?i-=.72:o>=5&&(i-=.24),o>=2&&r<2&&(i-=.16),r>=2&&o<2&&(i+=.12),Math.max(-.95,Math.min(.95,i))}function Z(e,t,a,r){return t==="left"?D(e,a,r):D(e,r,a)}function le(e,t,a){return[t,a,e.players.left.lemons,e.players.right.lemons,e.finished?1:0,e.winner||"none"].join("|")}function K(e,t,a){const r=J(e);if(r.finished)return P(r.winner,t);if(a<=0)return ie(r,t);const o=le(r,t,a);if(R.has(o))return R.get(o);const i=L(r.players[t].lemons),l=E(t),c=L(r.players[l].lemons);let s=-1/0;for(const u of i){let m=1/0;for(const h of c){const{state:C}=Z(r,t,u,h),A=C.finished?P(C.winner,t):Q*K(C,t,a-1);A<m&&(m=A)}m>s&&(s=m)}return R.set(o,s),s}function se(e,t){return t.worst!==e.worst?t.worst-e.worst:t.average!==e.average?t.average-e.average:t.immediateWins!==e.immediateWins?t.immediateWins-e.immediateWins:e.immediateLosses!==t.immediateLosses?e.immediateLosses-t.immediateLosses:f[e.action].cost!==f[t.action].cost?f[e.action].cost-f[t.action].cost:O.indexOf(e.action)-O.indexOf(t.action)}function ce(e,t,a){const r=E(t),o=a.players[r].lemons,i=a.players[t].lemons;return e.immediateWins>0&&e.worst>.85?`${f[e.action].name}で確定勝ちを狙います。`:e.action==="mirror"&&o>=2?"相手の攻撃期待値が高いのでCCミラーを優先します。":e.action==="barrier"&&o>=2&&i<2?"CC波の即負け筋を消すためCCバリアを選びます。":e.action==="charge"?"最大損失を抑えつつ資源を伸ばすためCCレモンを選びます。":e.action==="bomb"?"CC爆弾が最も高い勝率を作る局面です。":e.action==="wave"?"CC波で圧力をかけるのが最善です。":`最大損失が最も小さい${f[e.action].name}を選びます。`}function M(e,t="left",a=re){const r=J(e),o=L(r.players[t].lemons),i=E(t),l=L(r.players[i].lemons),c=[];for(const u of o){let m=1/0,h=0,C=0,A=0;const U=[];for(const G of l){const{state:S,resolution:p}=Z(r,t,u,G),$=S.finished?P(S.winner,t):Q*K(S,t,a-1);$<m&&(m=$),h+=$,p.winner===t?C+=1:p.winner&&p.winner!=="draw"&&p.winner!==t&&(A+=1),U.push({opponentAction:G,value:$,preview:X(t==="left"?p:{...p,leftAction:p.rightAction,rightAction:p.leftAction,leftOutcome:p.rightOutcome,rightOutcome:p.leftOutcome,winner:p.winner==="left"?"right":p.winner==="right"?"left":p.winner},{left:"CPU",right:"相手"})})}c.push({action:u,worst:m,average:h/l.length,immediateWins:C,immediateLosses:A,matchups:U})}c.sort(se);const s=c[0];return{action:s.action,rationale:ce(s,t,r),candidates:c}}const ue=16,g=document.getElementById("app"),de=[{name:"CC Lemon",body:"Cost 0 / Gain 1 lemon."},{name:"CC Barrier",body:"Cost 0 / Block CC Wave."},{name:"CC Wave",body:"Cost 2 / Attack your opponent."},{name:"CC Mirror",body:"Cost 2 / Reflect the attack back."},{name:"CC Bomb",body:"Cost 5 / Attack your opponent / CC Barrier cannot stop it."}];let w=null;function me(){const e=new Audio("./sounds/se_energy01_2x_fixed.mp3");return e.preload="auto",{charge:e,context:null,masterGain:null,unlocked:!1,volume:.72,lastRoundPlayed:null}}const n={screen:"menu",mode:null,game:N(),log:[],announcer:"CPU / LOCAL を選んでください。",localDrafts:{left:null,right:null},cpuAnalysis:null,audio:me(),panels:{rules:!1,settings:!1}};function d(e){return String(e).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}function fe(e,t){n.log=[{round:e,text:t},...n.log].slice(0,ue)}function x(){w&&(clearTimeout(w),w=null)}function b(){n.panels.rules=!1,n.panels.settings=!1}function pe(e){const t=!n.panels[e];b(),n.panels[e]=t,v()}function ee(){if(n.audio.context)return n.audio.context;const e=window.AudioContext||window.webkitAudioContext;return e?(n.audio.context=new e,n.audio.masterGain=n.audio.context.createGain(),n.audio.masterGain.connect(n.audio.context.destination),T(n.audio.volume),n.audio.context):null}function T(e){const t=Math.max(0,Math.min(1,e));n.audio.volume=t,n.audio.charge.volume=t,n.audio.masterGain&&(n.audio.masterGain.gain.value=t)}function _(){n.audio.unlocked=!0;const e=ee();e?.state==="suspended"&&e.resume().catch(()=>{}),T(n.audio.volume)}function y({start:e=0,duration:t=.12,from:a=440,to:r=a,type:o="square",gain:i=.14}){const l=ee();if(!l||!n.audio.masterGain)return;const c=l.createOscillator(),s=l.createGain(),u=l.currentTime+e,m=Math.max(.001,a),h=Math.max(.001,r);c.type=o,c.frequency.setValueAtTime(m,u),c.frequency.exponentialRampToValueAtTime(h,u+t),s.gain.setValueAtTime(1e-4,u),s.gain.linearRampToValueAtTime(i,u+Math.min(.025,t/2)),s.gain.exponentialRampToValueAtTime(1e-4,u+t),c.connect(s),s.connect(n.audio.masterGain),c.start(u),c.stop(u+t+.03)}function ge(e=0){window.setTimeout(()=>{try{const t=n.audio.charge.cloneNode();t.volume=n.audio.volume;const a=t.play();a&&typeof a.catch=="function"&&a.catch(()=>{})}catch{}},e*1e3)}function k(e,t=0){if(n.audio.unlocked){if(e==="charge"){ge(t);return}if(e==="barrier"){y({start:t,duration:.08,from:420,to:760,type:"triangle",gain:.11}),y({start:t+.08,duration:.12,from:760,to:980,type:"sine",gain:.08});return}if(e==="wave"){y({start:t,duration:.18,from:660,to:210,type:"square",gain:.13}),y({start:t+.04,duration:.22,from:320,to:140,type:"triangle",gain:.09});return}if(e==="mirror"){y({start:t,duration:.06,from:720,to:1260,type:"sine",gain:.1}),y({start:t+.06,duration:.12,from:1260,to:820,type:"triangle",gain:.1});return}e==="bomb"&&(y({start:t,duration:.08,from:160,to:120,type:"sawtooth",gain:.18}),y({start:t+.05,duration:.24,from:260,to:52,type:"square",gain:.16}),y({start:t+.08,duration:.18,from:98,to:40,type:"triangle",gain:.12}))}}function ve(e,t,a){n.audio.unlocked&&n.audio.lastRoundPlayed!==e&&(n.audio.lastRoundPlayed=e,k(t,0),a!==t?k(a,.1):a==="charge"&&k(a,.16))}function I(){n.localDrafts={left:null,right:null}}function te(e){x(),n.mode=e,n.game=N(),n.log=[],n.audio.lastRoundPlayed=null,n.announcer="読み合い開始。",I(),n.cpuAnalysis=e==="cpu"?M(n.game,"left"):null}function he(e){b(),n.screen="battle",te(e),v()}function ye(){x(),b(),n.screen="menu",n.mode=null,n.game=N(),n.log=[],n.announcer="CPU / LOCAL を選んでください。",n.cpuAnalysis=null,n.audio.lastRoundPlayed=null,I(),v()}function Ce(){return n.mode==="cpu"?{left:"CPU",right:"あなた"}:n.mode==="local"?{left:"LOCAL 1",right:"LOCAL 2"}:{left:"LOCAL 1",right:"LOCAL 2"}}function ne(e,t){const{state:a,resolution:r}=D(n.game,e,t);n.game=a;const o=X(r,Ce());fe(r.round,o),n.announcer=o,ve(r.round,r.leftAction,r.rightAction)}function be(e){const t=M(n.game,"left");ne(t.action,e),n.cpuAnalysis=n.game.finished?null:M(n.game,"left"),v()}function Ae(e,t){n.localDrafts[e]=t,v(),n.localDrafts.left&&n.localDrafts.right&&(x(),w=window.setTimeout(()=>{ne(n.localDrafts.left,n.localDrafts.right),I(),v()},220))}function Le(e){n.localDrafts[e]=null,x(),v()}function $e(){return{top:"left",bottom:"right"}}function q(e){return n.mode==="cpu"?e==="left"?"CPU":"YOU":(n.mode==="local",e==="left"?"LOCAL 1":"LOCAL 2")}function we(e){return n.mode==="cpu"&&e==="left"&&n.cpuAnalysis?`AI ${f[n.cpuAnalysis.action].short}`:n.mode==="local"&&n.localDrafts[e]?"LOCKED":"READY"}function Oe(e){return e>=5?`<span class="lemon-overflow">🍋 x ${e}</span>`:Array.from({length:e},()=>'<img class="lemon-pip" src="/images/lemon-icon.svg" alt="Lemon">').join("")}function Ee(e){return e>=5?`🍋 x ${e}`:e<=0?"0":"🍋".repeat(e)}function xe(e){const t=n.game.players[e].lastAction;return t?f[t].name:"待機中"}function j(e,t){return`
    <div class="player-head ${t}">
      <div class="player-meta">
        <div class="player-name">${d(q(e))}</div>
        <div class="player-state">${d(we(e))}</div>
      </div>
      <div class="lemon-row">${Oe(n.game.players[e].lemons)}</div>
      <div class="paddle"></div>
    </div>
  `}function F(e){return`
    <div class="action-chip">
      <strong>${d(q(e))}</strong>
      <span>${d(xe(e))}</span>
    </div>
  `}function Te(){const e=$e(),t=n.game.finished?n.game.winner==="draw"?"DRAW":`${q(n.game.winner)} WIN`:"BATTLE";return`
    <section class="pixel-card arena-card">
      <div class="status-strip">
        <div class="status-tile"><strong>MODE</strong><span>${d((n.mode||"menu").toUpperCase())}</span></div>
        <div class="status-tile"><strong>ROUND</strong><span>${n.game.round}</span></div>
        <div class="status-tile"><strong>STATE</strong><span>${d(t)}</span></div>
      </div>
      <div class="arena-wrap">
        <div class="arena">
          <div class="table-zone"></div>
          ${j(e.top,"top")}
          ${j(e.bottom,"bottom")}
          <div class="vs-core">
            <div class="round-chip">CCLEMON ROUND ${n.game.round}</div>
            <div class="message-chip">${d(n.announcer)}</div>
            <div class="last-actions">
              ${F(e.top)}
              ${F(e.bottom)}
            </div>
          </div>
        </div>
      </div>
    </section>
  `}function Se(e){return`
    <div class="reserve-card">
      <strong>LEMON STOCK</strong>
      <span class="reserve-value">${d(Ee(n.game.players[e].lemons))}</span>
    </div>
  `}function Re(e,t,a=!1){const r=new Set(L(n.game.players[e].lemons));return`
    <div class="action-stack">
      ${O.map(o=>{const i=f[o],l=a||!r.has(o);return`
          <button
            class="action-button compact"
            type="button"
            data-${t}-side="${e}"
            data-action="${o}"
            ${l?"disabled":""}
          >
            <strong>${d(i.name)}</strong>
            <span>${d(i.short)}</span>
            <small>${d(i.description)}</small>
          </button>
        `}).join("")}
    </div>
  `}function oe({title:e,status:t,side:a,eventPrefix:r,disabledExtra:o,locked:i,lockTitle:l,lockText:c,note:s,footer:u}){return`
    <section class="pixel-card controls-card">
      <div class="control-header">
        <div>
          <strong>${d(e)}</strong>
          <span>${d(t)}</span>
        </div>
      </div>
      ${Se(a)}
      ${s?`<div class="control-note">${d(s)}</div>`:""}
      ${i?`
            <div class="lock-card">
              <strong>${d(l)}</strong>
              <span>${d(c)}</span>
            </div>
          `:Re(a,r,o)}
      ${u||""}
    </section>
  `}function Y(e){const t=!!n.localDrafts[e];return oe({title:e==="left"?"LOCAL 1 PAD":"LOCAL 2 PAD",status:t?"LOCKED IN":"SELECT ACTION",side:e,eventPrefix:"local",disabledExtra:n.game.finished,locked:t,lockTitle:"CHOICE HIDDEN",lockText:"入力済み。相手を待っています。",footer:t?`
          <div class="mini-row">
            <button class="mini-button" type="button" data-local-cancel="${e}">やり直す</button>
          </div>
        `:""})}function ke(){return oe({title:"PLAYER PAD",status:"SELECT ACTION",side:"right",eventPrefix:"human",disabledExtra:n.game.finished,locked:!1,lockTitle:"",lockText:"",note:n.cpuAnalysis?.rationale||"AI解析中..."})}function z(){return`
    <section class="pixel-card log-card">
      <h2>LOG</h2>
      <div class="log-list">${n.log.length?n.log.map(t=>`<div class="log-entry"><strong>ROUND ${t.round}</strong><span>${d(t.text)}</span></div>`).join(""):'<div class="log-entry"><strong>ROUND 0</strong><span>まだログはありません。</span></div>'}</div>
    </section>
  `}function De(){return`
    <div class="overlay-shell" data-overlay-close>
      <section class="pixel-card modal-card" role="dialog" aria-modal="true" aria-label="Rules">
        <div class="modal-header">
          <div>
            <strong>RULES</strong>
            <span>English move guide</span>
          </div>
          <button class="pixel-button icon-button" type="button" data-close-panel aria-label="Close rules">×</button>
        </div>
        <div class="modal-body rule-modal-list">
          ${de.map(e=>`
            <div class="rule-entry">
              <strong>${d(e.name)}</strong>
              <span>${d(e.body)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `}function Pe(){return`
    <div class="overlay-shell" data-overlay-close>
      <section class="pixel-card modal-card" role="dialog" aria-modal="true" aria-label="Settings">
        <div class="modal-header">
          <div>
            <strong>SETTINGS</strong>
            <span>Sound volume</span>
          </div>
          <button class="pixel-button icon-button" type="button" data-close-panel aria-label="Close settings">×</button>
        </div>
        <div class="modal-body">
          <div class="setting-row">
            <label for="volume-slider">MASTER VOLUME</label>
            <strong data-volume-value>${Math.round(n.audio.volume*100)}%</strong>
          </div>
          <input
            id="volume-slider"
            class="volume-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value="${Math.round(n.audio.volume*100)}"
          >
          <p class="panel-copy">
            CC Lemon uses your mp3. The other moves use retro synth sound effects.
          </p>
        </div>
      </section>
    </div>
  `}function Me(){return n.panels.rules?De():n.panels.settings?Pe():""}function Ne(){return n.mode==="cpu"?`
      <div class="side-column">
        ${ke()}
        ${z()}
      </div>
    `:n.mode==="local"?`
      <div class="side-column">
        ${Y("left")}
        ${Y("right")}
        ${z()}
      </div>
    `:""}function Ie(){return`
    <div class="app-shell">
      <header class="pixel-card battle-topbar">
        <div class="topbar-title">
          <strong>CCLEMON</strong>
          <span>RETRO TABLE MATCH</span>
        </div>
        <div class="topbar-actions">
          <button class="pixel-button secondary" type="button" data-open-panel="rules">RULES</button>
          <button class="pixel-button icon-button" type="button" data-open-panel="settings" aria-label="Settings">⚙</button>
          <button class="pixel-button secondary" type="button" data-reset-mode>最初から</button>
          <button class="pixel-button warn" type="button" data-go-home>HOME</button>
        </div>
      </header>
      <div class="battle-layout">
        <div class="arena-column">${Te()}</div>
        ${Ne()}
      </div>
      ${Me()}
    </div>
  `}function qe(){return`
    <div class="app-shell menu-screen">
      <div class="title-block">
        <p class="game-kicker">RETRO YELLOW TABLE MATCH</p>
        <h1 class="game-title"><img src="/images/lemon-icon.svg" alt="" aria-hidden="true">CC レモン</h1>
        <p class="menu-foot">読み合いで🍋をためて、波と爆弾を打ち返す 8bit 風バトル。</p>
      </div>
      <section class="pixel-card menu-panel">
        <div class="mode-grid">
          <button class="mode-button red" type="button" data-mode="cpu">
            <span class="label">CPU</span>
            <span class="sub">合理 AI<br>対戦</span>
          </button>
          <button class="mode-button green" type="button" data-mode="local">
            <span class="label">LOCAL</span>
            <span class="sub">同じ端末で<br>2人対戦</span>
          </button>
        </div>
      </section>
    </div>
  `}function v(){g.innerHTML=n.screen==="menu"?qe():Ie(),Ue()}function Ue(){g.querySelectorAll("button").forEach(e=>{e.addEventListener("click",_,{once:!0})}),g.querySelectorAll("[data-mode]").forEach(e=>{e.addEventListener("click",()=>he(e.dataset.mode))}),g.querySelectorAll("[data-open-panel]").forEach(e=>{e.addEventListener("click",()=>pe(e.dataset.openPanel))}),g.querySelector("[data-close-panel]")?.addEventListener("click",()=>{b(),v()}),g.querySelector("[data-overlay-close]")?.addEventListener("click",e=>{e.target.hasAttribute("data-overlay-close")&&(b(),v())}),g.querySelector("#volume-slider")?.addEventListener("input",e=>{_(),T(Number(e.target.value)/100);const t=g.querySelector("[data-volume-value]");t&&(t.textContent=`${e.target.value}%`)}),g.querySelector("[data-go-home]")?.addEventListener("click",ye),g.querySelector("[data-reset-mode]")?.addEventListener("click",()=>{b(),te(n.mode),v()}),g.querySelectorAll("[data-human-side]").forEach(e=>{e.addEventListener("click",()=>be(e.dataset.action))}),g.querySelectorAll("[data-local-side]").forEach(e=>{e.addEventListener("click",()=>Ae(e.dataset.localSide,e.dataset.action))}),g.querySelectorAll("[data-local-cancel]").forEach(e=>{e.addEventListener("click",()=>Le(e.dataset.localCancel))})}T(n.audio.volume);v();
