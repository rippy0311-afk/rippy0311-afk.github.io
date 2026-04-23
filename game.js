(function () {
  const app = document.getElementById("app");
  const API_BASE_STORAGE_KEY = "smashApiBaseUrl";

  function normalizeApiBaseUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    let normalized = raw.replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    try {
      const url = new URL(normalized);
      return url.origin;
    } catch (error) {
      return "";
    }
  }

  function isGitHubPagesHost() {
    return /\.github\.io$/i.test(window.location.hostname || "");
  }

  function readInitialApiBaseUrl() {
    const query = new URLSearchParams(window.location.search);
    const queryValue = query.has("api") ? normalizeApiBaseUrl(query.get("api")) : "";
    if (query.has("api")) {
      try {
        if (queryValue) {
          window.localStorage.setItem(API_BASE_STORAGE_KEY, queryValue);
        } else {
          window.localStorage.removeItem(API_BASE_STORAGE_KEY);
        }
      } catch (error) {
      }
      return queryValue;
    }

    const runtimeValue = normalizeApiBaseUrl(window.SMASH_API_BASE_URL || (window.SMASH_CONFIG && window.SMASH_CONFIG.apiBaseUrl));
    if (runtimeValue) {
      return runtimeValue;
    }

    try {
      return normalizeApiBaseUrl(window.localStorage.getItem(API_BASE_STORAGE_KEY));
    } catch (error) {
      return "";
    }
  }

  const state = {
    screen: "title",
    matchMode: "local",
    lifeCount: 3,
    lifeTime: 3,
    timeLimit: 3,
    hpValue: 300,
    gachaResult: null,
    onlineSession: null,
    onlineJoinCode: "",
    onlineBusy: false,
    onlineError: "",
    onlineNotice: "",
    apiBaseUrl: readInitialApiBaseUrl(),
    publicShareUrl: "",
    stageSelect: null,
    characterSelect: null,
    battle: null,
    lastBattleStage: "sky-arena",
    lastCharacters: {
      p1: "fighter",
      p2: "swordsman"
    }
  };

  const arrays = {
    timeOptions: [1, 3, 5, 8, 10, "infinite"],
    limitedTimeOptions: [1, 3, 5, 8, 10],
    hpOptions: [100, 200, 300, 400, 500, 600, 700, 800, 900]
  };

  const stageData = {
    "sky-arena": {
      label: "Sky Arena",
      summary: "The current platform stage with one center platform and two side platforms.",
      detail: "Balanced movement, platform routes, and open side blast zones."
    },
    "wall-chamber": {
      label: "Wall Chamber",
      summary: "No platforms. Floor and tall side walls keep the fight boxed in, with only the top open.",
      detail: "Great for close-range pressure, juggles, and vertical finishes."
    },
    "air-dome": {
      label: "Air Dome",
      summary: "No floor, no walls, and no platforms. The arena is just open air.",
      detail: "A constant updraft rises from below, pushing fighters back upward the lower they fall."
    }
  };

  const characterData = {
    fighter: {
      label: "Fighter",
      weapon: "Fists",
      accent: "#ff8c61",
      summary: "Close-range pressure with heavy punches and fast knockback bursts.",
      colors: { body: "#ff654f", trim: "#ffe1a7", weapon: "#fff1ca" },
      moves: [
        "L Click: Jab Burst",
        "A/D + L Click: Back Fist / Dash Hook",
        "Dash + A/D + L Click: Blitz Lariat",
        "S/W + L Click: Floor Sweep / Sky Upper",
        "Air: Palm Snap / Cross Air / Dive Kick / Rising Palm",
        "E + A/S/D/W: Meteor / Quake / Rocket / Comet"
      ]
    },
    swordsman: {
      label: "Swordsman",
      weapon: "Blade",
      accent: "#78d2ff",
      summary: "Wide sword arcs, long reach, and sharp launch power.",
      colors: { body: "#48a6d9", trim: "#d5f3ff", weapon: "#f4fbff" },
      moves: [
        "L Click: Quick Slash",
        "A/D + L Click: Reverse Cut / Piercing Thrust",
        "Dash + A/D + L Click: Dash Cleaver",
        "S/W + L Click: Blade Sweep / Sky Cleaver",
        "Air: Air Slice / Gale Return / Air Lance / Crescent Lift",
        "E + A/S/D/W: Shadow / Guard Break / Arc Dash / White Rise"
      ]
    },
    gunner: {
      label: "Gunner",
      weapon: "Cannon",
      accent: "#f0cf4b",
      summary: "Projectile pressure, traps, and strong burst specials.",
      colors: { body: "#f2c43d", trim: "#fff0b0", weapon: "#fff8d7" },
      moves: [
        "L Click: Burst Shot",
        "A/D + L Click: Back Shot / Impact Blast",
        "Dash + A/D + L Click: Slide Burst",
        "S/W + L Click: Mine Drop / Anti-Air Shot",
        "Air: Air Shot / Drift Shot / Dive Bomb / Sky Spark",
        "E + A/S/D/W: Boom Shot / Mortar / Charge Beam / Jet Burst"
      ]
    }
  };

  const moveLibrary = {
    fighter: {
      neutral: { name: "Jab Burst", type: "melee", damage: 8, cooldown: 0.28, width: 84, height: 42, offsetX: 56, offsetY: -10, forceX: 330, forceY: -150, color: "#ffe09c", life: 0.12 },
      left: { name: "Back Fist", type: "melee", damage: 10, cooldown: 0.38, width: 92, height: 44, offsetX: 58, offsetY: -8, forceX: 360, forceY: -180, color: "#ffd0a8", life: 0.14 },
      right: { name: "Dash Hook", type: "melee", damage: 12, cooldown: 0.46, width: 116, height: 48, offsetX: 76, offsetY: -8, forceX: 520, forceY: -210, selfVx: 220, color: "#ffc173", life: 0.14 },
      dash: { name: "Blitz Lariat", type: "melee", damage: 14, cooldown: 0.56, width: 144, height: 54, offsetX: 92, offsetY: -8, forceX: 620, forceY: -150, selfVx: 340, color: "#ffb46f", life: 0.16 },
      down: { name: "Floor Sweep", type: "melee", damage: 9, cooldown: 0.34, width: 118, height: 30, offsetX: 40, offsetY: 22, forceX: 280, forceY: -70, color: "#ffd793", life: 0.12 },
      up: { name: "Sky Upper", type: "melee", damage: 11, cooldown: 0.42, width: 70, height: 96, offsetX: 10, offsetY: -58, forceX: 140, forceY: -360, selfVy: -110, hitstunBonus: 0.15, color: "#fff0bd", life: 0.14 },
      airNeutral: { name: "Palm Snap", type: "aerial-spin", damage: 9, cooldown: 0.26, radius: 74, ringRadius: 62, forceX: 320, forceY: -120, color: "#ffe8a8", life: 0.22, spinStart: -Math.PI / 2, swordLength: 58 },
      airLeft: { name: "Cross Air", type: "aerial-sweep", damage: 11, cooldown: 0.32, forceX: 320, forceY: 170, color: "#ffd59c", life: 0.22, offsetX: 10, offsetY: -8, sweepStart: -Math.PI / 4, sweepEnd: Math.PI / 4, sweepInnerRadius: 14, sweepRadius: 82, sweepThickness: 26, swordLength: 34, sweepSpeed: 1.75 },
      airRight: { name: "Drive Palm", type: "aerial-sweep", damage: 12, cooldown: 0.34, forceX: 360, forceY: 210, color: "#ffc27f", life: 0.22, offsetX: 12, offsetY: -8, sweepStart: -Math.PI / 4, sweepEnd: Math.PI / 4, sweepInnerRadius: 14, sweepRadius: 86, sweepThickness: 28, swordLength: 36, sweepSpeed: 1.8 },
      airDown: { name: "Dive Kick", type: "aerial-spin", damage: 13, cooldown: 0.38, radius: 80, ringRadius: 68, forceX: 180, forceY: 320, selfVy: 180, color: "#ffd68d", life: 0.26, spinStart: Math.PI / 2, swordLength: 64 },
      airUp: { name: "Rising Palm", type: "aerial-spin", damage: 10, cooldown: 0.32, radius: 76, ringRadius: 64, forceX: 120, forceY: -420, hitstunBonus: 0.18, color: "#fff0c1", life: 0.24, spinStart: -Math.PI / 2, swordLength: 60 },
      specialLeft: { name: "Meteor Knuckle", type: "melee", damage: 18, cooldown: 0.9, width: 144, height: 54, offsetX: 88, offsetY: -6, forceX: 700, forceY: -240, selfVx: 280, color: "#ffab69", life: 0.16 },
      specialDown: { name: "Quake Punch", type: "burst", damage: 15, cooldown: 0.92, width: 170, height: 54, offsetX: 0, offsetY: 18, forceX: 320, forceY: -260, color: "#ffca75", life: 0.2 },
      specialRight: { name: "Rocket Rush", type: "melee", damage: 20, cooldown: 1.0, width: 156, height: 58, offsetX: 92, offsetY: -8, forceX: 760, forceY: -260, selfVx: 320, color: "#ff8d50", life: 0.18 },
      specialUp: { name: "Comet Upper", type: "melee", damage: 17, cooldown: 1.0, width: 84, height: 132, offsetX: 8, offsetY: -72, forceX: 180, forceY: -560, selfVy: -620, color: "#fff1ad", life: 0.18 }
    },
    swordsman: {
      neutral: { name: "Quick Slash", type: "melee", damage: 9, cooldown: 0.3, width: 118, height: 38, offsetX: 72, offsetY: -8, forceX: 360, forceY: -160, color: "#d9f7ff", life: 0.12 },
      left: { name: "Reverse Cut", type: "melee", damage: 10, cooldown: 0.36, width: 112, height: 42, offsetX: 70, offsetY: -10, forceX: 380, forceY: -180, color: "#e5fbff", life: 0.14 },
      right: { name: "Piercing Thrust", type: "melee", damage: 12, cooldown: 0.28, width: 150, height: 34, offsetX: 96, offsetY: -10, forceX: 410, forceY: -130, selfVx: 140, color: "#b8edff", life: 0.14 },
      dash: { name: "Dash Cleaver", type: "melee", damage: 15, cooldown: 0.6, width: 174, height: 50, offsetX: 108, offsetY: -10, forceX: 700, forceY: -170, selfVx: 320, color: "#9be8ff", life: 0.16 },
      down: { name: "Blade Sweep", type: "melee", damage: 10, cooldown: 0.4, width: 138, height: 30, offsetX: 46, offsetY: 20, forceX: 300, forceY: -90, color: "#c7f2ff", life: 0.14 },
      up: { name: "Sky Cleaver", type: "aerial-sweep", damage: 12, cooldown: 0.46, forceX: 180, forceY: -390, hitstunBonus: 0.15, color: "#effcff", life: 0.18, offsetX: 10, offsetY: -6, sweepStart: Math.PI * 0.16, sweepEnd: -Math.PI * 0.6, sweepInnerRadius: 18, sweepRadius: 92, sweepThickness: 24, swordLength: 72 },
      airNeutral: { name: "Air Slice", type: "aerial-spin", damage: 10, cooldown: 0.28, radius: 78, ringRadius: 66, forceX: 360, forceY: -130, color: "#def8ff", life: 0.22, spinStart: -Math.PI / 2, swordLength: 66 },
      airLeft: { name: "Gale Return", type: "aerial-sweep", damage: 11, cooldown: 0.32, forceX: 180, forceY: 300, hitstunBonus: 0.05, meteor: true, meteorMinFallSpeed: 380, meteorImpactHitstun: 0.24, color: "#d5f7ff", life: 0.24, sweepSpeed: 2, sweepStart: -Math.PI / 4, sweepEnd: Math.PI / 4, sweepInnerRadius: 20, sweepRadius: 92, sweepThickness: 26, swordLength: 76 },
      airRight: { name: "Air Lance", type: "aerial-sweep", damage: 13, cooldown: 0.34, forceX: 210, forceY: 340, hitstunBonus: 0.06, meteor: true, meteorMinFallSpeed: 420, meteorImpactHitstun: 0.26, color: "#bfefff", life: 0.24, sweepSpeed: 2, sweepStart: -Math.PI / 4, sweepEnd: Math.PI / 4, sweepInnerRadius: 20, sweepRadius: 96, sweepThickness: 28, swordLength: 80 },
      airDown: { name: "Falling Arc", type: "aerial-spin", damage: 13, cooldown: 0.24, radius: 82, ringRadius: 70, forceX: 90, forceY: 460, selfVy: 160, hitstunBonus: 0.1, meteor: true, meteorMinFallSpeed: 520, meteorImpactHitstun: 0.3, color: "#c8f5ff", life: 0.26, spinStart: Math.PI / 2, swordLength: 68 },
      airUp: { name: "Crescent Lift", type: "aerial-sweep", damage: 12, cooldown: 0.4, forceX: 200, forceY: -520, selfVx: 165, selfVy: -560, hitstunBonus: 0.22, color: "#f2fdff", life: 0.2, offsetX: 18, offsetY: -18, sweepStart: Math.PI * 0.34, sweepEnd: -Math.PI * 0.34, sweepInnerRadius: 14, sweepRadius: 102, sweepThickness: 24, swordLength: 82, sweepSpeed: 1.35 },
      specialLeft: { name: "Shadow Slash", type: "melee", damage: 18, cooldown: 0.96, width: 164, height: 46, offsetX: 94, offsetY: -10, forceX: 660, forceY: -230, selfVx: 220, color: "#9fe8ff", life: 0.16 },
      specialDown: { name: "Guard Break", type: "burst", damage: 16, cooldown: 0.94, width: 156, height: 58, offsetX: 0, offsetY: 14, forceX: 340, forceY: -230, color: "#d7fbff", life: 0.18 },
      specialRight: { name: "Arc Dash", type: "melee", damage: 18, cooldown: 0.96, width: 170, height: 48, offsetX: 98, offsetY: -10, forceX: 700, forceY: -240, selfVx: 250, color: "#84ddff", life: 0.16 },
      specialUp: { name: "White Rise", type: "burst", damage: 17, cooldown: 0.98, width: 168, height: 156, offsetX: 0, offsetY: -10, forceX: 90, forceY: -700, hitstunBonus: 0.24, color: "#ffffff", life: 0.22 }
    },
    gunner: {
      neutral: { name: "Burst Shot", type: "projectile", damage: 6, cooldown: 0.24, radius: 12, spawnX: 54, spawnY: -18, speedX: 560, speedY: 0, forceX: 260, forceY: -120, gravity: 0, color: "#ffe28e", life: 1.0 },
      left: { name: "Back Shot", type: "projectile", damage: 7, cooldown: 0.3, radius: 12, spawnX: 54, spawnY: -12, speedX: 520, speedY: -20, forceX: 300, forceY: -120, gravity: 0, color: "#fff3bc", life: 1.0 },
      right: { name: "Impact Blast", type: "projectile", damage: 9, cooldown: 0.34, radius: 15, spawnX: 60, spawnY: -16, speedX: 640, speedY: -12, forceX: 420, forceY: -180, gravity: 0, color: "#ffd25a", life: 1.1 },
      dash: { name: "Slide Burst", type: "melee", damage: 13, cooldown: 0.52, width: 148, height: 44, offsetX: 96, offsetY: -6, forceX: 560, forceY: -120, selfVx: 300, color: "#ffe277", life: 0.16 },
      down: { name: "Mine Drop", type: "projectile", damage: 14, cooldown: 0.62, radius: 20, spawnX: 16, spawnY: 20, speedX: 0, speedY: 20, forceX: 260, forceY: -180, gravity: 90, color: "#ffd76e", life: 3.4, stickyGround: true },
      up: { name: "Anti-Air Shot", type: "projectile", damage: 10, cooldown: 0.46, radius: 14, spawnX: 14, spawnY: -42, speedX: 80, speedY: -520, forceX: 120, forceY: -360, hitstunBonus: 0.15, gravity: 420, color: "#fff1ac", life: 1.2 },
      airNeutral: { name: "Air Shot", type: "projectile", damage: 7, cooldown: 0.22, radius: 13, spawnX: 52, spawnY: -20, speedX: 620, speedY: -20, forceX: 290, forceY: -140, gravity: 0, color: "#ffeaa4", life: 1.0 },
      airLeft: { name: "Drift Shot", type: "aerial-spin", damage: 8, cooldown: 0.28, radius: 74, ringRadius: 62, forceX: 300, forceY: -130, color: "#fff0b6", life: 0.24, spinStart: Math.PI, swordLength: 58 },
      airRight: { name: "Jet Round", type: "aerial-spin", damage: 10, cooldown: 0.3, radius: 76, ringRadius: 64, forceX: 420, forceY: -160, color: "#ffd663", life: 0.24, spinStart: 0, swordLength: 60 },
      airDown: { name: "Dive Bomb", type: "aerial-spin", damage: 12, cooldown: 0.24, radius: 78, ringRadius: 66, forceX: 180, forceY: 280, selfVy: 150, color: "#ffd56a", life: 0.26, spinStart: Math.PI / 2, swordLength: 62 },
      airUp: { name: "Sky Spark", type: "aerial-spin", damage: 9, cooldown: 0.34, radius: 74, ringRadius: 62, forceX: 120, forceY: -380, hitstunBonus: 0.18, color: "#fff2b5", life: 0.24, spinStart: -Math.PI / 2, swordLength: 58 },
      specialLeft: { name: "Boom Shot", type: "projectile", damage: 16, cooldown: 0.96, radius: 18, spawnX: 64, spawnY: -18, speedX: 380, speedY: -40, forceX: 480, forceY: -200, gravity: 90, color: "#ffb451", life: 1.3 },
      specialDown: { name: "Mortar", type: "projectile", damage: 17, cooldown: 1.0, radius: 18, spawnX: 20, spawnY: -38, speedX: 160, speedY: -540, forceX: 260, forceY: -320, gravity: 700, color: "#ffd36c", life: 1.4 },
      specialRight: { name: "Charge Beam", type: "projectile", damage: 18, cooldown: 1.0, radius: 20, spawnX: 70, spawnY: -18, speedX: 760, speedY: 0, forceX: 720, forceY: -220, gravity: 0, color: "#fff3aa", life: 1.2 },
      specialUp: { name: "Jet Burst", type: "melee", damage: 14, cooldown: 0.96, width: 90, height: 106, offsetX: 8, offsetY: -56, forceX: 150, forceY: -480, selfVy: -520, color: "#ffe99e", life: 0.18 }
    }
  };

  const gachaPool = [
    { name: "Golden Trophy", rarity: "Legend", copy: "The opening trophy appears as the top prize." },
    { name: "Arena Flame", rarity: "Epic", copy: "A red crest inspired by the Battle panel." },
    { name: "Training Core", rarity: "Rare", copy: "A cool blue chip built for Practice mode." },
    { name: "Photo Stamp", rarity: "Common", copy: "A souvenir stamp from the Photos corner." }
  ];

  let rafId = 0;
  let activeCanvas = null;
  const keys = new Set();
  const mouseState = { right: false };
  let onlineLobbyPollTimer = 0;

  function createInputState() {
    return { left: false, right: false, jump: false, fall: false, dash: false, shield: false };
  }

  function createCpuReadState() {
    return {
      observedTime: 0,
      airborneRate: 0,
      jumpiness: 0,
      dashRate: 0,
      shieldRate: 0,
      approachRate: 0,
      retreatRate: 0,
      closeRate: 0,
      farRate: 0,
      prevOpponentGrounded: true
    };
  }

  function getLocalInputState() {
    return {
      left: keys.has("KeyA"),
      right: keys.has("KeyD"),
      jump: keys.has("KeyW") || keys.has("Space"),
      fall: keys.has("KeyS"),
      dash: keys.has("ShiftLeft") || keys.has("ShiftRight"),
      shield: mouseState.right
    };
  }

  function isOnlineSessionActive() {
    return Boolean(state.onlineSession);
  }

  function isOnlineHostFlow() {
    return state.matchMode === "online-host";
  }

  function isOnlineHostBattle() {
    return Boolean(state.battle && state.battle.networkRole === "host");
  }

  function isOnlineGuestBattle() {
    return Boolean(state.battle && state.battle.networkRole === "client");
  }

  function clearOnlineLobbyTimer() {
    if (onlineLobbyPollTimer) {
      window.clearTimeout(onlineLobbyPollTimer);
      onlineLobbyPollTimer = 0;
    }
  }

  function resetOnlineSession(clearJoinCode) {
    clearOnlineLobbyTimer();
    state.onlineSession = null;
    state.onlineBusy = false;
    state.onlineError = "";
    state.onlineNotice = "";
    if (clearJoinCode) {
      state.onlineJoinCode = "";
    }
  }

  const resizeHandler = () => {
    if (state.battle && activeCanvas) {
      resizeCanvas(activeCanvas);
      if (state.battle.networkRole !== "client") {
        layoutStage(state.battle);
      }
    }
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderOptionChips(values, selectedValue, action) {
    return values
      .map((value) => {
        const selected = value === selectedValue ? "selected" : "";
        const label = typeof value === "number" ? `${value}` : "Infinite";
        return `<button class="option-chip ${selected}" data-action="${action}" data-value="${value}">${label}</button>`;
      })
      .join("");
  }

  function formatTimeChoice(value) {
    return value === "infinite" ? "Infinite minute(s)" : `${value} minute(s)`;
  }

  function getStageInfo(stageKey) {
    return stageData[stageKey] || stageData["sky-arena"];
  }

  function summarizeConfig(config) {
    if (!config) {
      return "";
    }

    if (config.rule === "life") {
      return `Life / ${config.lives} stocks / ${config.timeLimit === null ? "Infinite" : `${Math.round(config.timeLimit / 60)} min`}`;
    }

    if (config.rule === "time") {
      return `Time Limit / ${Math.round(config.timeLimit / 60)} min`;
    }

    if (config.rule === "hp") {
      return `HP / ${config.hp}%`;
    }

    return "Practice / Target dummy";
  }

  function getOnlineOpponentLabel() {
    return isOnlineHostFlow() ? "remote player" : "target dummy";
  }

  function renderTitle() {
    return `
      <section class="screen title-screen grain" data-action="start-menu">
        <div class="title-hero">
          <img class="title-trophy" src="assets/trophy.png" alt="Trophy">
        </div>
        <div class="title-floor">
          <div class="press-start">Press Anywhere to Start</div>
        </div>
      </section>
    `;
  }

  function renderModeSelect() {
    return `
      <section class="screen">
        <div class="mode-grid">
          <button class="mode-tile red" data-action="open-rule-select"><span class="mode-label">Battle</span></button>
          <button class="mode-tile blue" data-action="open-practice"><span class="mode-label">Practice</span></button>
          <button class="mode-tile green" data-action="open-online-menu"><span class="mode-label mode-label-online">Online Battle</span></button>
          <button class="mode-tile yellow" data-action="open-photos"><span class="mode-label">Photos</span></button>
        </div>
      </section>
    `;
  }

  function renderOnlineMenu() {
    const apiBaseLabel = state.apiBaseUrl || "Same Origin";
    const apiHint = state.apiBaseUrl
      ? "Online Battle API requests will go to this server URL."
      : isGitHubPagesHost()
        ? "GitHub Pages cannot run the Node room server. Set the Online Server URL first."
        : "Same-origin mode. If you open this from GitHub Pages, set the Online Server URL first.";

    return `
      <section class="screen panel-screen grain">
        <div class="top-bar">
          <button class="back-button" data-action="go-mode-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Online Battle</div>
        </div>
        <div class="panel-body">
          <div class="info-screen selection-summary">
            <h2 class="info-title">Internet Match</h2>
            <p class="info-copy">Create a room as the host, or join a friend's room code as player two. The host runs the match and sends the live battle state to the guest.</p>
          </div>
          <div class="stack-column">
            <div class="config-card">
              <div class="config-title">Online Server</div>
              <div class="value-display share-url-display">${escapeHtml(apiBaseLabel)}</div>
              <p class="small-note">${escapeHtml(apiHint)}</p>
              <div class="option-grid">
                <button class="option-chip selected" data-action="set-online-api-base">Set Server URL</button>
                ${state.apiBaseUrl ? '<button class="option-chip" data-action="reset-online-api-base">Use Same Origin</button>' : ""}
              </div>
            </div>
          </div>
          <div class="rule-row">
            <button class="rule-card" data-action="open-online-host">Host Room</button>
            <button class="rule-card" data-action="open-online-join">Join Room</button>
          </div>
          ${state.onlineError ? `<div class="status-banner error">${escapeHtml(state.onlineError)}</div>` : ""}
          ${state.onlineNotice ? `<div class="status-banner">${escapeHtml(state.onlineNotice)}</div>` : ""}
        </div>
      </section>
    `;
  }

  function renderOnlineJoin() {
    return `
      <section class="screen panel-screen grain">
        <div class="top-bar">
          <button class="back-button" data-action="back-to-online-menu" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Join Room</div>
        </div>
        <div class="panel-body">
          <div class="stack-column">
            <div class="config-card">
              <div class="config-title">Room Code</div>
              <input
                class="room-code-input"
                type="text"
                maxlength="6"
                spellcheck="false"
                autocomplete="off"
                data-action="online-join-code-input"
                value="${escapeHtml(state.onlineJoinCode)}"
                placeholder="ABC123"
              >
              <p class="small-note">Enter the 6-character room code from the host.</p>
            </div>
          </div>
          ${state.onlineError ? `<div class="status-banner error">${escapeHtml(state.onlineError)}</div>` : ""}
          <button class="play-button" data-action="join-online-room"${state.onlineBusy ? " disabled" : ""}>${state.onlineBusy ? "Joining..." : "Join Room"}</button>
        </div>
      </section>
    `;
  }

  function renderOnlineRoom() {
    const session = state.onlineSession;
    const lobby = session ? session.lobby : null;
    const stageInfo = lobby && lobby.config && lobby.config.stageKey ? getStageInfo(lobby.config.stageKey) : null;
    const canStart = Boolean(session && session.role === "host" && session.guestConnected && !state.onlineBusy);
    const title = session && session.role === "host" ? "Host Room" : "Waiting Room";
    const copy =
      session && session.role === "host"
        ? session.guestConnected
          ? "A guest connected. Start the match when both sides are ready."
          : "Share this room code with the other player and wait for them to join."
        : "Connected to the room. Waiting for the host to begin the match.";

    return `
      <section class="screen panel-screen grain character-select-screen online-room-screen">
        <div class="top-bar">
          <button class="back-button" data-action="leave-online-room" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">${title}</div>
        </div>
        <div class="panel-body">
          <div class="info-screen selection-summary">
            <h2 class="info-title">Room ${escapeHtml(session ? session.roomCode : "------")}</h2>
            <p class="info-copy">${copy}</p>
          </div>
          <div class="stack-column">
            <div class="config-card">
              <div class="config-title">Room Code</div>
              <div class="value-display">${escapeHtml(session ? session.roomCode : "------")}</div>
              <div class="option-grid">
                <button class="option-chip selected" data-action="copy-online-room-code"${session && session.roomCode ? "" : " disabled"}>Copy Room Code</button>
              </div>
            </div>
            <div class="config-card">
              <div class="config-title">Connection</div>
              <div class="value-display">${session && session.role === "host" ? (session.guestConnected ? "Guest Joined" : "Waiting for Guest") : "Connected as Guest"}</div>
              <div class="option-grid">
                <div class="option-chip selected">${session ? escapeHtml(session.role === "host" ? "Host" : "Guest") : ""}</div>
              </div>
            </div>
            ${
              session && session.role === "host"
                ? `
                  <div class="config-card">
                    <div class="config-title">Share URL</div>
                    <div class="value-display share-url-display">${state.publicShareUrl ? escapeHtml(state.publicShareUrl) : "Run the internet share script to get a public URL"}</div>
                    <p class="small-note">The guest opens this URL in their browser, then joins with room code ${escapeHtml(session.roomCode)}.</p>
                  </div>
                `
                : ""
            }
            ${
              lobby
                ? `
                  <div class="config-card">
                    <div class="config-title">Match Setup</div>
                    <div class="value-display">${escapeHtml(summarizeConfig(lobby.config))}${stageInfo ? ` / ${escapeHtml(stageInfo.label)}` : ""}</div>
                    <div class="option-grid">
                      <div class="option-chip selected">Host: ${escapeHtml(characterData[getLobbyCharacterKey(lobby, "p1", "fighter")].label)}</div>
                      <div class="option-chip selected">Guest: ${escapeHtml(characterData[getLobbyCharacterKey(lobby, "p2", "fighter")].label)}</div>
                    </div>
                    <div class="small-note">Rules and stage come from the host. The guest picks only their own fighter.</div>
                  </div>
                  ${
                    session && session.role === "guest" && !session.started
                      ? `
                        <div class="config-card">
                          <div class="config-title">Choose Your Fighter</div>
                          <div class="value-display">${escapeHtml(characterData[getLobbyCharacterKey(lobby, "p2", "fighter")].label)}</div>
                          <p class="small-note">Pick your character here before the host starts the match.</p>
                          <div class="character-card-grid online-character-grid">
                            ${renderCharacterCards("p2", getLobbyCharacterKey(lobby, "p2", "fighter"), "select-online-character")}
                          </div>
                        </div>
                      `
                      : ""
                  }
                `
                : ""
            }
          </div>
          <div class="online-room-footer">
            ${state.onlineNotice ? `<div class="status-banner">${escapeHtml(state.onlineNotice)}</div>` : ""}
            ${state.onlineError ? `<div class="status-banner error">${escapeHtml(state.onlineError)}</div>` : ""}
            ${
              session && session.role === "host"
                ? `<button class="play-button" data-action="start-online-match"${canStart ? "" : " disabled"}>${state.onlineBusy ? "Starting..." : "Start Online Match"}</button>`
                : `<div class="status-banner">${session && session.started ? "Match is starting..." : "Waiting for host..."}</div>`
            }
          </div>
        </div>
      </section>
    `;
  }

  function renderRuleSelect() {
    const onlineNote = isOnlineHostFlow()
      ? `
        <div class="info-screen selection-summary compact-summary">
          <h2 class="info-title">Online Host Setup</h2>
          <p class="info-copy">Choose the rules for the internet match. After character select, you will get a room code to share.</p>
        </div>
      `
      : "";
    return `
      <section class="screen panel-screen grain">
        <div class="top-bar">
          <button class="back-button" data-action="go-mode-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Which Rule</div>
        </div>
        <div class="panel-body">
          ${onlineNote}
          <div class="rule-row">
            <button class="rule-card" data-action="open-life">Life</button>
            <button class="rule-card" data-action="open-time">Time Limit</button>
            <button class="rule-card" data-action="open-hp">HP</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderLifeConfig() {
    const nextLabel = isOnlineHostFlow() ? "Stage Select (Online)" : "Play";
    return `
      <section class="screen panel-screen grain">
        <div class="top-bar">
          <button class="back-button" data-action="go-rule-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Life</div>
        </div>
        <div class="panel-body">
          <div class="stack-column">
            <div class="config-card">
              <div class="config-title">1~99 Life</div>
              <div class="counter-wrap">
                <button class="counter-button" data-action="life-minus" aria-label="Decrease life">-</button>
                <div class="value-display">${state.lifeCount} Life</div>
                <button class="counter-button" data-action="life-plus" aria-label="Increase life">+</button>
              </div>
            </div>
            <div class="config-card">
              <div class="config-title">1 / 3 / 5 / 8 / 10 / Infinite minute(s)</div>
              <div class="value-display">${formatTimeChoice(state.lifeTime)}</div>
              <div class="option-grid">
                ${renderOptionChips(arrays.timeOptions, state.lifeTime, "pick-life-time")}
              </div>
            </div>
          </div>
          <button class="play-button" data-action="prepare-life-match">${nextLabel}</button>
        </div>
      </section>
    `;
  }

  function renderTimeConfig() {
    const nextLabel = isOnlineHostFlow() ? "Stage Select (Online)" : "Play";
    return `
      <section class="screen panel-screen grain">
        <div class="top-bar">
          <button class="back-button" data-action="go-rule-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Time Limit</div>
        </div>
        <div class="panel-body">
          <div class="stack-column">
            <div class="config-card">
              <div class="config-title">1 / 3 / 5 / 8 / 10 minute(s)</div>
              <div class="value-display">${state.timeLimit} minute(s)</div>
              <div class="option-grid">
                ${renderOptionChips(arrays.limitedTimeOptions, state.timeLimit, "pick-time-limit")}
              </div>
            </div>
          </div>
          <button class="play-button" data-action="prepare-time-match">${nextLabel}</button>
        </div>
      </section>
    `;
  }

  function renderHpConfig() {
    const nextLabel = isOnlineHostFlow() ? "Stage Select (Online)" : "Play";
    return `
      <section class="screen panel-screen grain">
        <div class="top-bar">
          <button class="back-button" data-action="go-rule-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">HP</div>
        </div>
        <div class="panel-body">
          <div class="stack-column">
            <div class="config-card">
              <div class="config-title">100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900% HP</div>
              <div class="value-display">${state.hpValue}% HP</div>
              <div class="option-grid">
                ${renderOptionChips(arrays.hpOptions, state.hpValue, "pick-hp")}
              </div>
            </div>
          </div>
          <button class="play-button" data-action="prepare-hp-match">${nextLabel}</button>
        </div>
      </section>
    `;
  }

  function renderPractice() {
    return `
      <section class="screen panel-screen grain">
        <div class="top-bar">
          <button class="back-button" data-action="go-mode-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Practice</div>
        </div>
        <div class="panel-body">
          <div class="info-screen">
            <h2 class="info-title">Training Room</h2>
            <p class="info-copy">Choose a stage, pick your character, then practice every move on a still target dummy.</p>
          </div>
          <button class="play-button" data-action="prepare-practice-match">Stage Select</button>
        </div>
      </section>
    `;
  }

  function renderStageCards(selectedKey) {
    return Object.entries(stageData)
      .map(([key, info]) => {
        const selected = key === selectedKey ? "selected" : "";
        const preview =
          key === "sky-arena"
            ? `
              <div class="stage-preview sky-arena">
                <div class="stage-preview-floor"></div>
                <div class="stage-preview-platform center"></div>
                <div class="stage-preview-platform left"></div>
                <div class="stage-preview-platform right"></div>
              </div>
            `
            : key === "air-dome"
              ? `
                <div class="stage-preview air-dome">
                  <div class="stage-preview-stream left"></div>
                  <div class="stage-preview-stream center"></div>
                  <div class="stage-preview-stream right"></div>
                </div>
              `
            : `
              <div class="stage-preview wall-chamber">
                <div class="stage-preview-floor"></div>
                <div class="stage-preview-wall left"></div>
                <div class="stage-preview-wall right"></div>
              </div>
            `;

        return `
          <button class="stage-card ${selected}" data-action="select-stage" data-stage="${key}">
            ${preview}
            <div class="stage-card-name">${escapeHtml(info.label)}</div>
            <div class="stage-card-summary">${escapeHtml(info.summary)}</div>
            <div class="stage-card-detail">${escapeHtml(info.detail)}</div>
          </button>
        `;
      })
      .join("");
  }

  function renderStageSelect() {
    const draft = state.stageSelect;
    const selectedStage = getStageInfo(draft ? draft.selectedStage : state.lastBattleStage);
    const nextLabel = isOnlineHostFlow() ? "Character Select (Online)" : "Character Select";
    const onlineNote = isOnlineHostFlow()
      ? `
        <div class="info-screen selection-summary compact-summary">
          <h2 class="info-title">Online Host Setup</h2>
          <p class="info-copy">Choose the arena for the internet match, then move on to character select and room creation.</p>
        </div>
      `
      : "";
    return `
      <section class="screen panel-screen grain stage-select-screen">
        <div class="top-bar">
          <button class="back-button" data-action="back-from-stage-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Stage Select</div>
        </div>
        <div class="panel-body">
          ${onlineNote}
          <div class="info-screen selection-summary">
            <h2 class="info-title">${escapeHtml(summarizeConfig(draft ? draft.config : null))}</h2>
            <p class="info-copy">Choose the arena before moving on to character select. The selected stage will be used for this battle setup.</p>
          </div>
          <div class="stage-select-grid">
            ${renderStageCards(draft ? draft.selectedStage : state.lastBattleStage)}
          </div>
          <div class="info-screen selection-summary">
            <h2 class="info-title">${escapeHtml(selectedStage.label)}</h2>
            <p class="info-copy">${escapeHtml(selectedStage.summary)} ${escapeHtml(selectedStage.detail)}</p>
          </div>
          <button class="play-button" data-action="confirm-stage-select">${nextLabel}</button>
        </div>
      </section>
    `;
  }

  function renderPhotos() {
    return `
      <section class="screen panel-screen grain">
        <div class="top-bar">
          <button class="back-button" data-action="go-mode-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Photos</div>
        </div>
        <div class="panel-body">
          <div class="photos-layout">
            <div class="photo-card">
              <img src="assets/trophy.png" alt="Trophy gallery item">
              <h3 class="info-title">Opening Trophy</h3>
              <p class="info-copy">The first screen still centers the trophy with the black lower panel and the start prompt.</p>
            </div>
            <div class="photo-card">
              <h3 class="info-title">Character Select</h3>
              <p class="info-copy">Every match-starting path now passes through a character-select screen before the battle begins.</p>
            </div>
            <div class="photo-card">
              <h3 class="info-title">Move Sets</h3>
              <p class="info-copy">Fighter, Swordsman, and Gunner each have unique normal attacks, shield, and four directional specials.</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderGacha() {
    const result = state.gachaResult;
    return `
      <section class="screen panel-screen grain">
        <div class="top-bar">
          <button class="back-button" data-action="go-mode-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Gacha</div>
        </div>
        <div class="panel-body">
          <div class="gacha-layout">
            <div class="gacha-card">
              <img class="gacha-trophy" src="assets/trophy.png" alt="Gacha trophy">
              <h3 class="info-title">Prize Draw</h3>
              <p class="info-copy">Draw a random reward card inspired by the menu and arena theme.</p>
              <button class="draw-button" data-action="draw-gacha">Draw</button>
              ${
                result
                  ? `
                    <div class="gacha-rarity">${escapeHtml(result.rarity)}</div>
                    <h3 class="info-title">${escapeHtml(result.name)}</h3>
                    <p class="info-copy">${escapeHtml(result.copy)}</p>
                  `
                  : `<p class="subtle-text">No draw yet. Press Draw to reveal a reward.</p>`
              }
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function getCharacterPortraitDataUri(key) {
    const info = characterData[key];
    if (!info) {
      return "";
    }

    let weaponMarkup = "";
    if (key === "fighter") {
      weaponMarkup = `
        <g transform="translate(206 116) rotate(-18)">
          <rect x="-18" y="-10" width="40" height="20" rx="10" fill="${info.colors.weapon}" opacity="0.95" />
          <rect x="-36" y="-8" width="22" height="16" rx="8" fill="${info.colors.trim}" opacity="0.92" />
        </g>
      `;
    } else if (key === "swordsman") {
      weaponMarkup = `
        <g transform="translate(214 102) rotate(-28)">
          <rect x="-8" y="-54" width="16" height="110" rx="8" fill="${info.colors.weapon}" opacity="0.98" />
          <rect x="-18" y="42" width="36" height="10" rx="5" fill="${info.colors.trim}" />
          <rect x="-8" y="48" width="16" height="24" rx="6" fill="${info.colors.body}" />
        </g>
      `;
    } else {
      weaponMarkup = `
        <g transform="translate(214 112)">
          <rect x="-40" y="-12" width="86" height="24" rx="12" fill="${info.colors.weapon}" opacity="0.96" />
          <rect x="28" y="-22" width="30" height="16" rx="7" fill="${info.colors.trim}" />
          <rect x="-54" y="-8" width="24" height="16" rx="8" fill="${info.colors.body}" />
        </g>
      `;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img" aria-label="${info.label}">
        <defs>
          <linearGradient id="bg-${key}" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="${info.accent}" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#0f1624" stop-opacity="1"/>
          </linearGradient>
          <radialGradient id="glow-${key}" cx="50%" cy="38%" r="58%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.66"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="320" height="180" rx="26" fill="url(#bg-${key})"/>
        <circle cx="88" cy="58" r="72" fill="url(#glow-${key})"/>
        <ellipse cx="164" cy="154" rx="104" ry="18" fill="#0a111d" opacity="0.38"/>
        <g transform="translate(126 28)">
          <circle cx="40" cy="34" r="24" fill="${info.colors.trim}"/>
          <path d="M12 70c0-19 15-34 34-34h8c19 0 34 15 34 34v44H12z" fill="${info.colors.body}"/>
          <rect x="16" y="72" width="20" height="60" rx="10" fill="${info.colors.trim}" opacity="0.92"/>
          <rect x="64" y="72" width="20" height="60" rx="10" fill="${info.colors.trim}" opacity="0.92"/>
          <rect x="28" y="112" width="18" height="34" rx="9" fill="${info.colors.weapon}" opacity="0.9"/>
          <rect x="54" y="112" width="18" height="34" rx="9" fill="${info.colors.weapon}" opacity="0.9"/>
        </g>
        ${weaponMarkup}
        <text x="24" y="154" fill="rgba(255,255,255,0.92)" font-family="Bahnschrift, Yu Gothic UI, sans-serif" font-size="24" font-weight="800" letter-spacing="2">${info.label.toUpperCase()}</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function renderCharacterCards(slotKey, selectedKey, action = "select-character") {
    return Object.entries(characterData)
      .map(([key, info]) => {
        const selected = key === selectedKey ? "selected" : "";
        const moves = info.moves.map((move) => `<div class="character-move">${escapeHtml(move)}</div>`).join("");
        return `
          <button class="character-card ${selected}" data-action="${action}" data-slot="${slotKey}" data-character="${key}">
            <div class="character-name-row">
              <div class="character-name">${escapeHtml(info.label)}</div>
              <div class="character-weapon">${escapeHtml(info.weapon)}</div>
            </div>
            <div class="character-portrait-shell">
              <img class="character-portrait" src="${getCharacterPortraitDataUri(key)}" alt="${escapeHtml(info.label)} portrait">
            </div>
            <div class="character-summary">${escapeHtml(info.summary)}</div>
            <div class="character-moves">${moves}</div>
          </button>
        `;
      })
      .join("");
  }

  function renderCharacterSelect() {
    const draft = state.characterSelect;
    const stageInfo = draft && draft.config.stageKey ? getStageInfo(draft.config.stageKey) : null;
    const onlineHost = isOnlineHostFlow();
    const opponentLabel =
      draft && draft.config.rule === "practice" ? "target dummy" : onlineHost ? "guest player" : "CPU opponent";
    const opponentSlotLabel = draft && draft.config.rule === "practice" ? "Dummy" : onlineHost ? "Guest" : "CPU";
    const startLabel = isOnlineHostFlow() ? (state.onlineBusy ? "Creating Room..." : "Create Online Room (Host)") : "Start Battle";
    const onlineHint = isOnlineHostFlow()
      ? `<p class="info-copy">Choose your own fighter here. The guest will choose their fighter after they join the room.</p>`
      : "";
    const opponentCard = onlineHost
      ? `
        <section class="character-slot">
          <div class="character-slot-head">
            <div class="character-slot-tag">${escapeHtml(opponentSlotLabel)}</div>
            <div class="character-slot-picked">${escapeHtml(characterData[draft.selections.p2].label)}</div>
          </div>
          <div class="sub-card">
            <div class="config-title">Guest Fighter</div>
            <div class="value-display">${escapeHtml(characterData[draft.selections.p2].label)}</div>
            <p class="small-note">This is only the starting default. The guest can change it from the waiting room before the match begins.</p>
          </div>
        </section>
      `
      : `
        <section class="character-slot">
          <div class="character-slot-head">
            <div class="character-slot-tag">${escapeHtml(opponentSlotLabel)}</div>
            <div class="character-slot-picked">${escapeHtml(characterData[draft.selections.p2].label)}</div>
          </div>
          <div class="character-card-grid">
            ${renderCharacterCards("p2", draft.selections.p2)}
          </div>
        </section>
      `;
    return `
      <section class="screen panel-screen grain character-select-screen">
        <div class="top-bar">
          <button class="back-button" data-action="back-from-character-select" aria-label="Back"><span aria-hidden="true">&larr;</span></button>
          <div class="bar-title">Character Select</div>
        </div>
        <div class="panel-body">
          <div class="info-screen selection-summary">
            <h2 class="info-title">${escapeHtml(summarizeConfig(draft.config))}${stageInfo ? ` / ${escapeHtml(stageInfo.label)}` : ""}</h2>
            <p class="info-copy">Pick your fighter and the ${escapeHtml(opponentLabel)}.${stageInfo ? ` Stage: ${escapeHtml(stageInfo.label)}.` : ""}</p>
            ${onlineHint}
          </div>
          <div class="character-select-grid">
            <section class="character-slot">
              <div class="character-slot-head">
                <div class="character-slot-tag">P1</div>
                <div class="character-slot-picked">${escapeHtml(characterData[draft.selections.p1].label)}</div>
              </div>
              <div class="character-card-grid">
                ${renderCharacterCards("p1", draft.selections.p1)}
              </div>
            </section>
            ${opponentCard}
          </div>
          ${isOnlineHostFlow() && state.onlineError ? `<div class="status-banner error">${escapeHtml(state.onlineError)}</div>` : ""}
          <button class="play-button" data-action="start-configured-match"${state.onlineBusy ? " disabled" : ""}>${startLabel}</button>
        </div>
      </section>
    `;
  }

  function renderBattleShell() {
    const battle = state.battle;
    const p1Info = battle ? characterData[battle.selection.p1] : null;
    const p2Info = battle ? characterData[battle.selection.p2] : null;
    const p2Label =
      battle && battle.networkRole === "host"
        ? "Guest"
        : battle && battle.networkRole === "client"
          ? "You"
          : battle && battle.players[1].controlType === "cpu"
            ? "CPU"
            : "Dummy";
    const stageLabel = battle && battle.config.stageKey ? getStageInfo(battle.config.stageKey).label : "";

    return `
      <section class="screen battle-screen">
        <canvas class="battle-canvas"></canvas>
        <div class="hud">
          <div class="hud-panel">
            <div class="hud-name" id="p1-name">${p1Info ? escapeHtml(p1Info.label) : "P1"}</div>
            <div class="hud-value" id="p1-main">0%</div>
            <div class="hud-sub" id="p1-sub">Ready</div>
          </div>
          <div class="hud-panel align-right">
            <div class="hud-name" id="p2-name">${p2Info ? `${escapeHtml(p2Info.label)} ${p2Label}` : p2Label}</div>
            <div class="hud-value" id="p2-main">0%</div>
            <div class="hud-sub" id="p2-sub">Ready</div>
          </div>
        </div>
        <div class="battle-top-center">
          <div class="battle-rule">${escapeHtml(summarizeConfig(battle ? battle.config : null))}${stageLabel ? ` | ${escapeHtml(stageLabel)}` : ""}</div>
          <div class="battle-clock" id="battle-clock">${battle ? formatBattleClock(battle) : "--:--"}</div>
        </div>
        <div class="battle-combo-banner" id="battle-combo-banner" hidden></div>
        <div class="overlay" id="battle-overlay" hidden></div>
      </section>
    `;
  }

  function render() {
    stopBattleLoop();

    if (state.screen === "title") {
      app.innerHTML = renderTitle();
      return;
    }

    if (state.screen === "mode-select") {
      app.innerHTML = renderModeSelect();
      return;
    }

    if (state.screen === "rule-select") {
      app.innerHTML = renderRuleSelect();
      return;
    }

    if (state.screen === "online-menu") {
      app.innerHTML = renderOnlineMenu();
      return;
    }

    if (state.screen === "online-join") {
      app.innerHTML = renderOnlineJoin();
      return;
    }

    if (state.screen === "online-room") {
      app.innerHTML = renderOnlineRoom();
      return;
    }

    if (state.screen === "life-config") {
      app.innerHTML = renderLifeConfig();
      return;
    }

    if (state.screen === "time-config") {
      app.innerHTML = renderTimeConfig();
      return;
    }

    if (state.screen === "hp-config") {
      app.innerHTML = renderHpConfig();
      return;
    }

    if (state.screen === "practice") {
      app.innerHTML = renderPractice();
      return;
    }

    if (state.screen === "photos") {
      app.innerHTML = renderPhotos();
      return;
    }

    if (state.screen === "gacha") {
      app.innerHTML = renderGacha();
      return;
    }

    if (state.screen === "stage-select") {
      app.innerHTML = renderStageSelect();
      return;
    }

    if (state.screen === "character-select") {
      app.innerHTML = renderCharacterSelect();
      return;
    }

    if (state.screen === "battle") {
      app.innerHTML = renderBattleShell();
      mountBattle();
    }
  }

  function buildBattleConfig(rule) {
    if (rule === "life") {
      return {
        rule: "life",
        label: "Life",
        lives: state.lifeCount,
        timeLimit: state.lifeTime === "infinite" ? null : state.lifeTime * 60,
        description: `Stocks ${state.lifeCount} / ${formatTimeChoice(state.lifeTime)}`
      };
    }

    if (rule === "time") {
      return {
        rule: "time",
        label: "Time Limit",
        lives: null,
        timeLimit: state.timeLimit * 60,
        description: `${state.timeLimit} minute score match`
      };
    }

    if (rule === "hp") {
      return {
        rule: "hp",
        label: "HP",
        lives: 1,
        timeLimit: null,
        hp: state.hpValue,
        description: `${state.hpValue}% HP stamina match`
      };
    }

    return {
      rule: "practice",
      label: "Practice",
      lives: 99,
      timeLimit: null,
      practiceTimeScale: 1,
      description: "Free training on a target dummy"
    };
  }

  function normalizeRoomCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  }

  function buildApiUrl(url) {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const path = String(url || "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return state.apiBaseUrl ? `${state.apiBaseUrl}${normalizedPath}` : normalizedPath;
  }

  function setApiBaseUrl(value) {
    state.apiBaseUrl = normalizeApiBaseUrl(value);

    try {
      if (state.apiBaseUrl) {
        window.localStorage.setItem(API_BASE_STORAGE_KEY, state.apiBaseUrl);
      } else {
        window.localStorage.removeItem(API_BASE_STORAGE_KEY);
      }
    } catch (error) {
    }
  }

  function promptForApiBaseUrl() {
    const initialValue = state.apiBaseUrl || state.publicShareUrl || "https://";
    const nextValue = window.prompt("Online Battle server URL", initialValue);
    if (nextValue === null) {
      return;
    }

    const normalized = normalizeApiBaseUrl(nextValue);
    if (!normalized) {
      state.onlineError = "Enter a valid server URL like https://example.com";
      state.onlineNotice = "";
      render();
      return;
    }

    setApiBaseUrl(normalized);
    state.onlineError = "";
    state.onlineNotice = `Online server set to ${normalized}`;
    refreshPublicShareUrl();
    render();
  }

  async function requestJson(url, options) {
    if (!state.apiBaseUrl && isGitHubPagesHost()) {
      throw new Error("Set the Online Server URL from the Online Battle menu first");
    }

    const response = await fetch(buildApiUrl(url), {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || "Network request failed");
    }
    return data;
  }

  async function refreshPublicShareUrl() {
    try {
      const data = await requestJson("/api/online/public-url");
      state.publicShareUrl = data.url || "";
      if (state.screen === "online-room" || state.screen === "online-menu") {
        render();
      }
    } catch (error) {
      state.publicShareUrl = "";
    }
  }

  async function copyTextToClipboard(text) {
    if (!text) {
      throw new Error("Nothing to copy");
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!copied) {
      throw new Error("Clipboard copy failed");
    }
  }

  async function copyOnlineRoomCode() {
    const session = state.onlineSession;
    if (!session || !session.roomCode) {
      state.onlineError = "Room code is not ready yet";
      state.onlineNotice = "";
      render();
      return;
    }

    try {
      await copyTextToClipboard(session.roomCode);
      state.onlineError = "";
      state.onlineNotice = `Room code ${session.roomCode} copied`;
    } catch (error) {
      state.onlineError = error.message || "Failed to copy room code";
      state.onlineNotice = "";
    }

    if (state.screen === "online-room") {
      render();
    }
  }

  function buildLobbyPayload(config, selections) {
    return {
      config: { ...config },
      selection: { ...selections }
    };
  }

  function getLobbyCharacterKey(lobby, slotKey, fallbackKey) {
    const candidate = lobby && lobby.selection ? lobby.selection[slotKey] : null;
    return candidate && characterData[candidate] ? candidate : fallbackKey;
  }

  function scheduleOnlineLobbyPoll(delay) {
    clearOnlineLobbyTimer();
    if (!state.onlineSession || state.battle) {
      return;
    }

    onlineLobbyPollTimer = window.setTimeout(() => {
      pollOnlineLobbyStatus();
    }, delay);
  }

  async function pollOnlineLobbyStatus() {
    const session = state.onlineSession;
    if (!session || session.polling || state.battle) {
      return;
    }

    session.polling = true;

    try {
      const params = new URLSearchParams({
        roomCode: session.roomCode,
        token: session.token,
        snapshotRevision: String(session.lastSnapshotRevision || 0),
        commandRevision: String(session.lastCommandRevision || 0)
      });
      const status = await requestJson(`/api/online/status?${params.toString()}`);

      if (!state.onlineSession || state.onlineSession.token !== session.token) {
        return;
      }

      session.guestConnected = Boolean(status.guestConnected);
      session.started = Boolean(status.started);
      if (status.lobby) {
        session.lobby = status.lobby;
      }

      if (session.role === "guest" && status.snapshotRevision) {
        session.lastSnapshotRevision = status.snapshotRevision;
      }

      state.onlineError = "";

      if (session.role === "guest" && status.snapshot) {
        startOnlineClientBattle(status.snapshot);
        return;
      }

      if (state.screen === "online-room" || state.screen === "online-join") {
        render();
      }
    } catch (error) {
      if (state.onlineSession && state.onlineSession.token === session.token) {
        state.onlineError = error.message || "Online status check failed";
        if (state.screen === "online-room" || state.screen === "online-join") {
          render();
        }
      }
    } finally {
      if (state.onlineSession && state.onlineSession.token === session.token) {
        session.polling = false;
        if (!state.battle) {
          scheduleOnlineLobbyPoll(session.role === "host" ? 500 : 650);
        }
      }
    }
  }

  async function createOnlineRoomFromConfiguredMatch() {
    if (!state.characterSelect || state.onlineBusy) {
      return;
    }

    state.onlineBusy = true;
    state.onlineError = "";
    render();

    try {
      const lobby = buildLobbyPayload(state.characterSelect.config, state.characterSelect.selections);
      const response = await requestJson("/api/online/create", {
        method: "POST",
        body: JSON.stringify({ lobby })
      });

      state.lastCharacters = { ...state.characterSelect.selections };
      if (state.characterSelect.config.stageKey) {
        state.lastBattleStage = state.characterSelect.config.stageKey;
      }

      state.onlineSession = {
        role: "host",
        roomCode: response.roomCode,
        token: response.token,
        guestConnected: false,
        started: false,
        lobby,
        rematchRequested: false,
        lastSnapshotRevision: 0,
        lastCommandRevision: 0,
        polling: false,
        sendingSnapshot: false,
        pollingBattle: false,
        sendingInput: false,
        needsInputSync: false,
        localInput: createInputState()
      };

      state.onlineBusy = false;
      state.characterSelect = null;
      state.screen = "online-room";
      render();
      refreshPublicShareUrl();
      scheduleOnlineLobbyPoll(250);
    } catch (error) {
      state.onlineBusy = false;
      state.onlineError = error.message || "Failed to create room";
      render();
    }
  }

  async function joinOnlineRoom() {
    const roomCode = normalizeRoomCode(state.onlineJoinCode);
    if (!roomCode || state.onlineBusy) {
      state.onlineError = "Enter a valid room code";
      render();
      return;
    }

    state.onlineBusy = true;
    state.onlineError = "";
    render();

    try {
      const response = await requestJson("/api/online/join", {
        method: "POST",
        body: JSON.stringify({ roomCode })
      });

      state.onlineJoinCode = response.roomCode;
      state.onlineSession = {
        role: "guest",
        roomCode: response.roomCode,
        token: response.token,
        guestConnected: true,
        started: Boolean(response.started),
        lobby: response.lobby || null,
        rematchRequested: false,
        lastSnapshotRevision: 0,
        lastCommandRevision: 0,
        polling: false,
        sendingSnapshot: false,
        pollingBattle: false,
        sendingInput: false,
        needsInputSync: false,
        localInput: createInputState()
      };
      state.onlineBusy = false;
      state.screen = "online-room";
      render();
      scheduleOnlineLobbyPoll(250);
    } catch (error) {
      state.onlineBusy = false;
      state.onlineError = error.message || "Failed to join room";
      render();
    }
  }

  async function updateOnlineGuestCharacter(characterKey) {
    const session = state.onlineSession;
    if (!session || session.role !== "guest" || !session.lobby || session.started || !characterData[characterKey]) {
      return;
    }

    session.lobby = {
      ...session.lobby,
      selection: {
        ...session.lobby.selection,
        p2: characterKey
      }
    };
    state.onlineError = "";
    render();

    try {
      const response = await requestJson("/api/online/lobby", {
        method: "POST",
        body: JSON.stringify({
          roomCode: session.roomCode,
          token: session.token,
          selection: { p2: characterKey }
        })
      });

      if (state.onlineSession && state.onlineSession.token === session.token && response.lobby) {
        state.onlineSession.lobby = response.lobby;
        state.onlineError = "";
        render();
      }
    } catch (error) {
      if (state.onlineSession && state.onlineSession.token === session.token) {
        state.onlineError = error.message || "Failed to update character";
        render();
      }
    }
  }

  async function startOnlineMatch() {
    const session = state.onlineSession;
    if (!session || session.role !== "host" || !session.guestConnected || state.onlineBusy) {
      return;
    }

    state.onlineBusy = true;
    state.onlineError = "";
    render();

    try {
      await requestJson("/api/online/start", {
        method: "POST",
        body: JSON.stringify({
          roomCode: session.roomCode,
          token: session.token,
          lobby: session.lobby
        })
      });

      session.started = true;
      session.rematchRequested = false;
      state.onlineBusy = false;
      keys.clear();
      mouseState.right = false;

      const battle = createBattle(
        {
          ...session.lobby.config,
          onlineRole: "host",
          onlineRoomCode: session.roomCode,
          onlineToken: session.token
        },
        session.lobby.selection
      );
      state.battle = battle;
      state.screen = "battle";
      render();
    } catch (error) {
      state.onlineBusy = false;
      state.onlineError = error.message || "Failed to start online match";
      render();
    }
  }

  function openCharacterSelect(config, backScreen) {
    state.characterSelect = {
      config,
      backScreen,
      selections: {
        p1: state.lastCharacters.p1,
        p2: state.lastCharacters.p2
      }
    };
    state.screen = "character-select";
    render();
  }

  function openStageSelect(config, backScreen) {
    state.stageSelect = {
      config,
      backScreen,
      selectedStage: config.stageKey || state.lastBattleStage
    };
    state.screen = "stage-select";
    render();
  }

  function startConfiguredMatch() {
    if (!state.characterSelect) {
      return;
    }

    state.lastCharacters = { ...state.characterSelect.selections };
    if (state.characterSelect.config.stageKey) {
      state.lastBattleStage = state.characterSelect.config.stageKey;
    }
    const battle = createBattle(state.characterSelect.config, state.characterSelect.selections);
    state.characterSelect = null;
    state.stageSelect = null;
    state.battle = battle;
    state.screen = "battle";
    render();
  }

  function createPlayer(options) {
    return {
      id: options.id,
      name: options.name,
      controlType: options.controlType,
      characterKey: options.characterKey,
      colors: characterData[options.characterKey].colors,
      x: options.x,
      y: 220,
      prevY: 220,
      vx: 0,
      vy: 0,
      width: 42,
      height: 76,
      direction: options.direction,
      onGround: false,
      dashActive: false,
      currentPlatform: null,
      inputState: createInputState(),
      remoteCommands: [],
      jumpHeld: false,
      fallHeld: false,
      maxJumps: 2,
      jumpsRemaining: 2,
      damage: 0,
      hp: options.hp,
      maxHp: options.hp,
      lives: options.lives,
      score: 0,
      respawnTimer: 0,
      alive: true,
      shieldActive: false,
      shieldEnergy: 100,
      invincible: 0,
      hitstun: 0,
      grabTargetId: null,
      grabbedById: null,
      grabHoldTimer: 0,
      attackCooldown: 0,
      hitFlash: 0,
      actionPulse: 0,
      moveLabel: "",
      moveLabelTimer: 0,
      comboSourceId: null,
      comboHits: 0,
      comboDamageTotal: 0,
      comboDisplayTimer: 0,
      platformDropTimer: 0,
      meteorSlamActive: false,
      meteorMinFallSpeed: 0,
      meteorImpactHitstun: 0,
      aiMoveTimer: 0.4 + Math.random() * 0.5,
      aiAttackTimer: 0.7 + Math.random() * 0.7,
      aiSpecialTimer: 1.4 + Math.random() * 1.8,
      aiJumpTimer: 0.9 + Math.random() * 0.8,
      aiMoveDir: options.direction,
      aiComboRoute: "",
      aiComboStep: 0,
      aiComboTimer: 0,
      aiComboTargetId: null,
      aiRead: createCpuReadState()
    };
  }

  function createBattle(config, selections) {
    const stageKey = config.stageKey || "sky-arena";
    const stageInfo = getStageInfo(stageKey);
    const initialHp = config.rule === "hp" ? config.hp : null;
    const onlineRole = config.onlineRole || null;
    const opponentControlType = onlineRole === "host" ? "remote" : config.rule === "practice" ? "dummy" : "cpu";
    const battleConfig = { ...config, stageKey };
    return {
      config: battleConfig,
      selection: { ...selections },
      networkRole: onlineRole,
      networkRoomCode: config.onlineRoomCode || null,
      networkToken: config.onlineToken || null,
      networkGuestInput: createInputState(),
      networkLastCommandRevision: 0,
      networkInputAccumulator: 0,
      networkSnapshotAccumulator: 0,
      networkPollingInFlight: false,
      networkSnapshotInFlight: false,
      paused: false,
      ended: false,
      timeScale: config.rule === "practice" ? config.practiceTimeScale || 1 : 1,
      lastFrame: 0,
      timeRemaining: config.timeLimit,
      winner: "",
      winnerId: null,
      endReason: "",
      stage: {
        key: stageKey,
        label: stageInfo.label,
        groundY: 0,
        wallTop: 0,
        platforms: [],
        walls: [],
        windBase: 0,
        windBoost: 0
      },
      koEffects: [],
      hitboxes: [],
      projectiles: [],
      players: [
        createPlayer({
          id: "p1",
          name: "P1",
          controlType: "human",
          characterKey: selections.p1,
          x: 380,
          direction: 1,
          hp: initialHp,
          lives: config.lives
        }),
        createPlayer({
          id: "p2",
          name: opponentControlType === "cpu" ? "CPU" : opponentControlType === "remote" ? "Remote" : "Dummy",
          controlType: opponentControlType,
          characterKey: selections.p2,
          x: 620,
          direction: -1,
          hp: initialHp,
          lives: config.lives
        })
      ]
    };
  }

  function serializeBattleForNetwork(battle) {
    return {
      config: { ...battle.config, onlineRole: "client" },
      selection: { ...battle.selection },
      networkRole: "client",
      paused: battle.paused,
      ended: battle.ended,
      timeScale: battle.timeScale,
      timeRemaining: battle.timeRemaining,
      winner: battle.winner,
      winnerId: battle.winnerId,
      endReason: battle.endReason,
      stage: JSON.parse(JSON.stringify(battle.stage)),
      koEffects: battle.koEffects.map((effect) => ({ ...effect })),
      hitboxes: battle.hitboxes.map(({ hitSet, ...rest }) => ({ ...rest })),
      projectiles: battle.projectiles.map((projectile) => ({ ...projectile })),
      players: battle.players.map((player) => ({
        ...player,
        inputState: createInputState(),
        remoteCommands: []
      }))
    };
  }

  function createBattleFromSnapshot(snapshot) {
    return {
      ...snapshot,
      networkRole: "client",
      networkRoomCode: state.onlineSession ? state.onlineSession.roomCode : null,
      networkToken: state.onlineSession ? state.onlineSession.token : null,
      networkInputAccumulator: 0,
      networkSnapshotAccumulator: 0,
      networkLastCommandRevision: 0,
      networkPollingInFlight: false,
      networkSnapshotInFlight: false,
      players: (snapshot.players || []).map((player) => ({
        ...player,
        inputState: createInputState(),
        remoteCommands: []
      })),
      hitboxes: (snapshot.hitboxes || []).map((hitbox) => ({
        ...hitbox,
        hitSet: new Set()
      })),
      koEffects: snapshot.koEffects || [],
      projectiles: snapshot.projectiles || [],
      stage: snapshot.stage || { key: "sky-arena", label: "Sky Arena", groundY: 0, wallTop: 0, platforms: [], walls: [], windBase: 0, windBoost: 0 }
    };
  }

  function startOnlineClientBattle(snapshot) {
    if (!state.onlineSession) {
      return;
    }

    clearOnlineLobbyTimer();
    keys.clear();
    mouseState.right = false;
    state.onlineSession.localInput = createInputState();
    state.onlineSession.rematchRequested = false;
    state.onlineBusy = false;
    state.onlineError = "";
    state.battle = createBattleFromSnapshot(snapshot);
    pushOnlineGuestInput();
    state.screen = "battle";
    render();
  }

  async function pollHostBattleNetwork(battle) {
    const session = state.onlineSession;
    if (!session || session.role !== "host" || battle.networkPollingInFlight) {
      return;
    }

    battle.networkPollingInFlight = true;

    try {
      const params = new URLSearchParams({
        roomCode: session.roomCode,
        token: session.token,
        snapshotRevision: "0",
        commandRevision: String(battle.networkLastCommandRevision || 0)
      });
      const status = await requestJson(`/api/online/status?${params.toString()}`);

      if (state.battle !== battle || !state.onlineSession || state.onlineSession.token !== session.token) {
        return;
      }

      session.guestConnected = Boolean(status.guestConnected);
      if (status.lobby) {
        session.lobby = status.lobby;
      }

      const remotePlayer = battle.players[1];
      if (remotePlayer && status.guestInput) {
        remotePlayer.inputState = { ...createInputState(), ...status.guestInput };
      }

      if (Array.isArray(status.commands) && status.commands.length) {
        const rematchRequested = status.commands.some((command) => command.type === "rematch");
        const liveCommands = status.commands.filter((command) => command.type !== "rematch");
        if (liveCommands.length) {
          remotePlayer.remoteCommands.push(...liveCommands);
        }
        if (rematchRequested && battle.ended) {
          restartCurrentBattle();
          return;
        }
      }

      if (typeof status.commandRevision === "number") {
        battle.networkLastCommandRevision = status.commandRevision;
      }
    } catch (error) {
      state.onlineError = error.message || "Host sync failed";
    } finally {
      if (state.battle === battle) {
        battle.networkPollingInFlight = false;
      }
    }
  }

  async function sendHostBattleSnapshot(battle) {
    const session = state.onlineSession;
    if (!session || session.role !== "host" || battle.networkSnapshotInFlight) {
      return;
    }

    battle.networkSnapshotInFlight = true;

    try {
      await requestJson("/api/online/snapshot", {
        method: "POST",
        body: JSON.stringify({
          roomCode: session.roomCode,
          token: session.token,
          snapshot: serializeBattleForNetwork(battle)
        })
      });
      state.onlineError = "";
    } catch (error) {
      state.onlineError = error.message || "Snapshot upload failed";
    } finally {
      if (state.battle === battle) {
        battle.networkSnapshotInFlight = false;
      }
    }
  }

  function syncHostBattleNetwork(battle, delta) {
    battle.networkInputAccumulator += delta;
    battle.networkSnapshotAccumulator += delta;

    if (battle.networkInputAccumulator >= 0.05) {
      battle.networkInputAccumulator = 0;
      pollHostBattleNetwork(battle);
    }

    if (battle.networkSnapshotAccumulator >= 0.06) {
      battle.networkSnapshotAccumulator = 0;
      sendHostBattleSnapshot(battle);
    }
  }

  async function pollClientBattleSnapshot(battle) {
    const session = state.onlineSession;
    if (!session || session.role !== "guest" || battle.networkPollingInFlight) {
      return;
    }

    battle.networkPollingInFlight = true;

    try {
      const params = new URLSearchParams({
        roomCode: session.roomCode,
        token: session.token,
        snapshotRevision: String(session.lastSnapshotRevision || 0),
        commandRevision: "0"
      });
      const status = await requestJson(`/api/online/status?${params.toString()}`);

      if (state.battle !== battle || !state.onlineSession || state.onlineSession.token !== session.token) {
        return;
      }

      if (typeof status.snapshotRevision === "number") {
        session.lastSnapshotRevision = status.snapshotRevision;
      }

      if (status.snapshot) {
        state.battle = createBattleFromSnapshot(status.snapshot);
        if (state.battle.ended) {
          finishBattle(state.battle);
        }
      }
      state.onlineError = "";
    } catch (error) {
      state.onlineError = error.message || "Snapshot download failed";
    } finally {
      if (state.battle === battle) {
        battle.networkPollingInFlight = false;
      }
    }
  }

  function syncClientBattleNetwork(battle, delta) {
    battle.networkInputAccumulator += delta;
    if (battle.networkInputAccumulator >= 0.06) {
      battle.networkInputAccumulator = 0;
      pollClientBattleSnapshot(battle);
    }
  }

  async function pushOnlineGuestInput() {
    const session = state.onlineSession;
    const battle = state.battle;
    if (!session || session.role !== "guest" || !battle || battle.networkRole !== "client") {
      return;
    }

    if (session.sendingInput) {
      session.needsInputSync = true;
      return;
    }

    session.sendingInput = true;
    try {
      await requestJson("/api/online/input", {
        method: "POST",
        body: JSON.stringify({
          roomCode: session.roomCode,
          token: session.token,
          input: session.localInput
        })
      });
      state.onlineError = "";
    } catch (error) {
      state.onlineError = error.message || "Input sync failed";
    } finally {
      if (state.onlineSession && state.onlineSession.token === session.token) {
        session.sendingInput = false;
        if (session.needsInputSync) {
          session.needsInputSync = false;
          pushOnlineGuestInput();
        }
      }
    }
  }

  async function sendOnlineGuestCommand(command) {
    const session = state.onlineSession;
    const battle = state.battle;
    if (!session || session.role !== "guest" || !battle || battle.networkRole !== "client") {
      return false;
    }

    try {
      await requestJson("/api/online/command", {
        method: "POST",
        body: JSON.stringify({
          roomCode: session.roomCode,
          token: session.token,
          command
        })
      });
      state.onlineError = "";
      return true;
    } catch (error) {
      state.onlineError = error.message || "Command send failed";
      return false;
    }
  }

  function syncGuestInputStateFromLocalControls() {
    if (!state.onlineSession || state.onlineSession.role !== "guest") {
      return;
    }

    state.onlineSession.localInput = getLocalInputState();
    pushOnlineGuestInput();
  }

  function mountBattle() {
    activeCanvas = app.querySelector(".battle-canvas");
    if (!activeCanvas) {
      return;
    }

    resizeCanvas(activeCanvas);
    if (state.battle.networkRole !== "client") {
      layoutStage(state.battle);
    }
    updateHud(state.battle);
    state.battle.lastFrame = performance.now();
    rafId = window.requestAnimationFrame(loopBattle);
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(960, Math.floor(rect.width * window.devicePixelRatio));
    canvas.height = Math.max(540, Math.floor(rect.height * window.devicePixelRatio));
    const context = canvas.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function layoutStage(battle) {
    const width = activeCanvas.getBoundingClientRect().width;
    const height = activeCanvas.getBoundingClientRect().height;
    if (battle.stage.key === "air-dome") {
      battle.stage.groundY = null;
      battle.stage.wallTop = height * 0.1;
      battle.stage.platforms = [];
      battle.stage.walls = [];
      battle.stage.windBase = 1220;
      battle.stage.windBoost = 540;
      return;
    }

    if (battle.stage.key === "wall-chamber") {
      const groundY = height * 0.8;
      const wallThickness = Math.max(34, Math.round(width * 0.04));
      const wallTop = height * 0.18;
      battle.stage.groundY = groundY;
      battle.stage.wallTop = wallTop;
      battle.stage.platforms = [];
      battle.stage.walls = [
        { x: 0, y: wallTop, width: wallThickness, height: groundY - wallTop },
        { x: width - wallThickness, y: wallTop, width: wallThickness, height: groundY - wallTop }
      ];
      battle.stage.windBase = 0;
      battle.stage.windBoost = 0;
      return;
    }

    battle.stage.groundY = height * 0.76;
    battle.stage.wallTop = 0;
    battle.stage.walls = [];
    battle.stage.windBase = 0;
    battle.stage.windBoost = 0;
    battle.stage.platforms = [
      { x: width * 0.5 - 190, y: height * 0.64, width: 380, height: 18 },
      { x: width * 0.24 - 110, y: height * 0.56, width: 220, height: 16 },
      { x: width * 0.76 - 110, y: height * 0.56, width: 220, height: 16 }
    ];
  }

  function loopBattle(timestamp) {
    const battle = state.battle;
    if (!battle) {
      return;
    }

    const delta = Math.min(0.033, (timestamp - battle.lastFrame) / 1000 || 0);
    const timeStep = battle.config.rule === "practice" ? delta * (battle.timeScale || 1) : delta;
    battle.lastFrame = timestamp;

    if (battle.networkRole === "client") {
      updateKoEffects(battle, timeStep);
      syncClientBattleNetwork(battle, timeStep);
    } else {
      updateKoEffects(battle, timeStep);
      if (!battle.paused && !battle.ended) {
        updateBattle(battle, timeStep);
      }
      if (battle.networkRole === "host") {
        syncHostBattleNetwork(battle, timeStep);
      }
    }

    drawBattle(battle);
    updateHud(battle);
    rafId = window.requestAnimationFrame(loopBattle);
  }

  function updateBattle(battle, delta) {
    if (battle.config.timeLimit !== null && battle.timeRemaining !== null) {
      battle.timeRemaining = Math.max(0, battle.timeRemaining - delta);
      if (battle.timeRemaining === 0) {
        endBattleByTime(battle);
        return;
      }
    }

    const [player, dummy] = battle.players;
    updatePlayerState(battle, player, dummy, delta);
    updatePlayerState(battle, dummy, player, delta);
    updateHitboxes(battle, delta);
    updateProjectiles(battle, delta);
  }

  function findBattlePlayer(battle, playerId) {
    return battle.players.find((player) => player.id === playerId) || null;
  }

  function clearGrabStateForPlayer(player) {
    if (!player) {
      return;
    }

    player.grabTargetId = null;
    player.grabbedById = null;
    player.grabHoldTimer = 0;
  }

  function releaseGrabState(battle, player) {
    if (!player) {
      return;
    }

    const grabber = player.grabTargetId ? player : findBattlePlayer(battle, player.grabbedById);
    if (!grabber) {
      clearGrabStateForPlayer(player);
      return;
    }

    const grabbed = findBattlePlayer(battle, grabber.grabTargetId);
    clearGrabStateForPlayer(grabber);
    if (grabbed) {
      grabbed.grabbedById = null;
    }
  }

  function syncGrabbedPlayer(battle, grabber) {
    if (!grabber.grabTargetId) {
      return null;
    }

    const grabbed = findBattlePlayer(battle, grabber.grabTargetId);
    if (!grabbed || !grabbed.alive) {
      releaseGrabState(battle, grabber);
      return null;
    }

    grabbed.prevY = grabbed.y;
    grabbed.x = grabber.x + grabber.direction * 42;
    grabbed.y = grabber.y - 6;
    grabbed.vx = 0;
    grabbed.vy = 0;
    grabbed.onGround = false;
    grabbed.currentPlatform = null;
    grabbed.shieldActive = false;
    grabbed.jumpHeld = false;
    grabbed.fallHeld = false;
    return grabbed;
  }

  function updateGrabbedState(battle, player) {
    const grabber = findBattlePlayer(battle, player.grabbedById);
    if (!grabber || !grabber.alive || grabber.grabTargetId !== player.id) {
      clearGrabStateForPlayer(player);
      return;
    }

    player.dashActive = false;
    player.hitstun = 0;
    player.invincible = 0;
    syncGrabbedPlayer(battle, grabber);
  }

  function updateGrabCarrierState(battle, player, delta) {
    player.dashActive = false;
    player.shieldActive = false;
    player.jumpHeld = false;
    player.fallHeld = false;
    player.shieldEnergy = Math.min(100, player.shieldEnergy + 5 * delta);
    player.grabHoldTimer = Math.max(0, player.grabHoldTimer - delta);
    player.vx *= player.onGround ? 0.84 : 0.97;

    if (player.controlType === "cpu" && player.grabTargetId && player.grabHoldTimer <= 0.82) {
      const target = findBattlePlayer(battle, player.grabTargetId);
      throwGrabbedOpponent(battle, player, buildCpuThrowInput(player, target));
      return;
    }

    if (player.controlType === "remote" && player.remoteCommands && player.remoteCommands.length) {
      const grabCommandIndex = player.remoteCommands.findIndex((command) => command.type === "grab");
      if (grabCommandIndex !== -1) {
        player.remoteCommands.splice(grabCommandIndex, 1);
        throwGrabbedOpponent(battle, player, player.inputState);
        return;
      }
    }

    if (player.grabHoldTimer <= 0) {
      throwGrabbedOpponent(battle, player);
    }
  }

  function updatePlayerState(battle, player, opponent, delta) {
    if (!player.alive) {
      player.respawnTimer -= delta;
      if (player.respawnTimer <= 0) {
        respawnPlayer(battle, player);
      }
      return;
    }

    if (player.grabbedById) {
      updateGrabbedState(battle, player);
      return;
    }

    player.attackCooldown = Math.max(0, player.attackCooldown - delta);
    player.invincible = Math.max(0, player.invincible - delta);
    player.hitstun = Math.max(0, player.hitstun - delta);
    player.hitFlash = Math.max(0, player.hitFlash - delta);
    player.actionPulse = Math.max(0, player.actionPulse - delta);
    player.moveLabelTimer = Math.max(0, player.moveLabelTimer - delta);
    player.comboDisplayTimer = Math.max(0, player.comboDisplayTimer - delta);
    player.platformDropTimer = Math.max(0, player.platformDropTimer - delta);
    if (!player.grabTargetId) {
      player.grabHoldTimer = 0;
    }

    if (player.grabTargetId) {
      updateGrabCarrierState(battle, player, delta);
    } else if (player.hitstun > 0) {
      updateHitstunState(player, delta);
    } else if (player.controlType === "human") {
      updateHumanMovement(player, delta);
    } else if (player.controlType === "remote") {
      updateRemoteMovement(battle, player, opponent, delta);
    } else if (player.controlType === "cpu") {
      updateCpuState(battle, player, opponent, delta);
    } else {
      updateDummyState(player, opponent, delta);
    }

    player.prevY = player.y;
    player.vy += (1150 - getStageUpdraft(battle, player)) * delta;
    player.x += player.vx * delta;
    player.y += player.vy * delta;
    player.onGround = false;

    applyStageCollision(battle, player);
    applyBlastZones(battle, player, opponent);

    if (player.grabTargetId) {
      syncGrabbedPlayer(battle, player);
    }

    if (player.hitstun <= 0 && player.comboDisplayTimer <= 0 && player.comboHits > 0) {
      clearComboState(player);
    }
  }

  function updateHitstunState(player, delta) {
    player.dashActive = false;
    player.shieldActive = false;
    player.jumpHeld = false;
    player.fallHeld = false;
    player.shieldEnergy = Math.min(100, player.shieldEnergy + 6 * delta);
    player.vx *= player.onGround ? 0.9 : 0.992;
  }

  function getStageUpdraft(battle, player) {
    if (!battle || !player || !battle.stage || battle.stage.key !== "air-dome") {
      return 0;
    }

    const canvasHeight = activeCanvas ? activeCanvas.getBoundingClientRect().height : 720;
    const liftRatio = Math.min(1, Math.max(0, player.y / Math.max(1, canvasHeight)));
    return (battle.stage.windBase || 0) + (battle.stage.windBoost || 0) * liftRatio * liftRatio;
  }

  function updateMovementFromInput(player, delta, inputState) {
    const moveLeft = Boolean(inputState.left);
    const moveRight = Boolean(inputState.right);
    const dashPressed = Boolean(inputState.dash);
    const jumpPressed = Boolean(inputState.jump) && !(state.battle && state.battle.stage && state.battle.stage.key === "air-dome");
    const fallPressed = Boolean(inputState.fall);
    const wantsShield = Boolean(inputState.shield) && player.shieldEnergy > 2 && player.attackCooldown <= 0.12;
    const speed = wantsShield ? 150 : player.onGround && dashPressed ? 470 : 300;
    const targetSpeed = moveLeft === moveRight ? 0 : moveLeft ? -speed : speed;
    player.dashActive = Boolean(player.onGround && dashPressed && !wantsShield && moveLeft !== moveRight);

    if (targetSpeed === 0) {
      player.vx *= player.onGround ? 0.8 : 0.96;
    } else {
      player.vx += (targetSpeed - player.vx) * (player.onGround ? 0.18 : 0.1);
      player.direction = targetSpeed > 0 ? 1 : -1;
    }

    if (player.onGround) {
      player.jumpsRemaining = player.maxJumps;
    }

    if (fallPressed && !player.fallHeld && player.onGround && player.currentPlatform) {
      player.onGround = false;
      player.currentPlatform = null;
      player.platformDropTimer = 0.22;
      player.y += 8;
      player.vy = Math.max(player.vy, 180);
    }

    if (jumpPressed && !player.jumpHeld && player.jumpsRemaining > 0) {
      player.vy = player.jumpsRemaining === player.maxJumps ? -530 : -500;
      player.onGround = false;
      player.currentPlatform = null;
      player.jumpsRemaining -= 1;
    }

    player.jumpHeld = jumpPressed;
    player.fallHeld = fallPressed;

    if (fallPressed && !player.onGround) {
      player.vy += 520 * delta;
    }

    player.shieldActive = wantsShield;
    if (player.shieldActive) {
      player.shieldEnergy = Math.max(0, player.shieldEnergy - 42 * delta);
    } else {
      player.shieldEnergy = Math.min(100, player.shieldEnergy + 10 * delta);
    }
  }

  function updateHumanMovement(player, delta) {
    updateMovementFromInput(player, delta, getLocalInputState());
  }

  function updateRemoteMovement(battle, player, opponent, delta) {
    updateMovementFromInput(player, delta, player.inputState || createInputState());
    consumeRemoteCommands(battle, player, opponent);
  }

  function updateDummyState(player, opponent, delta) {
    player.dashActive = false;
    player.vx *= 0.78;
    player.shieldActive = false;
    player.shieldEnergy = Math.min(100, player.shieldEnergy + 10 * delta);
    player.jumpHeld = false;
    player.fallHeld = false;
    player.direction = opponent.x >= player.x ? 1 : -1;
  }

  function canCpuUseJump(battle) {
    return !battle || !battle.stage || battle.stage.key !== "air-dome";
  }

  function blendCpuReadMetric(current, sample, delta, rate) {
    return current + (sample - current) * Math.min(1, delta * rate);
  }

  function getCpuAdaptiveStyle(player) {
    const read = player && player.aiRead ? player.aiRead : createCpuReadState();
    const warmup = Math.min(1, read.observedTime / 8);
    return {
      warmup,
      antiAir: warmup * clamp(read.airborneRate * 0.7 + read.jumpiness * 0.85, 0, 1),
      keepOut: warmup * clamp(read.approachRate * 0.72 + read.closeRate * 0.42 + read.dashRate * 0.24, 0, 1),
      chase: warmup * clamp(read.retreatRate * 0.72 + read.farRate * 0.5, 0, 1),
      shieldPunish: warmup * clamp(read.shieldRate * 0.92, 0, 1),
      dashPunish: warmup * clamp(read.dashRate * 0.74 + read.approachRate * 0.22, 0, 1),
      sidePressure: warmup * clamp(read.approachRate * 0.52 + read.closeRate * 0.7 + read.shieldRate * 0.45 + read.dashRate * 0.18, 0, 1)
    };
  }

  function updateCpuAdaptiveRead(player, opponent, delta) {
    if (!player || player.controlType !== "cpu") {
      return getCpuAdaptiveStyle(player);
    }

    if (!player.aiRead) {
      player.aiRead = createCpuReadState();
    }

    const read = player.aiRead;
    if (!opponent || !opponent.alive) {
      return getCpuAdaptiveStyle(player);
    }

    read.observedTime = Math.min(999, read.observedTime + delta);
    const distanceX = Math.abs(opponent.x - player.x);
    const towardCpuDir = player.x >= opponent.x ? 1 : -1;
    const towardSpeed = opponent.vx * towardCpuDir;
    read.airborneRate = blendCpuReadMetric(read.airborneRate, opponent.onGround ? 0 : 1, delta, 1.8);
    read.dashRate = blendCpuReadMetric(read.dashRate, opponent.dashActive ? 1 : 0, delta, 2.2);
    read.shieldRate = blendCpuReadMetric(read.shieldRate, opponent.shieldActive ? 1 : 0, delta, 2.4);
    read.approachRate = blendCpuReadMetric(read.approachRate, towardSpeed > 85 ? 1 : 0, delta, 2.1);
    read.retreatRate = blendCpuReadMetric(read.retreatRate, towardSpeed < -75 ? 1 : 0, delta, 2.0);
    read.closeRate = blendCpuReadMetric(read.closeRate, distanceX < 138 ? 1 : 0, delta, 1.9);
    read.farRate = blendCpuReadMetric(read.farRate, distanceX > 250 ? 1 : 0, delta, 1.6);

    if (!opponent.onGround && read.prevOpponentGrounded) {
      read.jumpiness = Math.min(1, read.jumpiness + 0.22);
    } else {
      read.jumpiness = Math.max(0, read.jumpiness - delta * 0.08);
    }
    read.prevOpponentGrounded = opponent.onGround;
    return getCpuAdaptiveStyle(player);
  }

  function clearCpuComboRoute(player) {
    if (!player) {
      return;
    }

    player.aiComboRoute = "";
    player.aiComboStep = 0;
    player.aiComboTimer = 0;
    player.aiComboTargetId = null;
  }

  function isCpuAirSideMoveKey(moveKey) {
    return moveKey === "air-side" || moveKey === "air-left" || moveKey === "air-right";
  }

  function isCpuAirUpMoveKey(moveKey) {
    return moveKey === "air-up";
  }

  function isCpuGroundSideMoveKey(moveKey) {
    return moveKey === "attack-side" || moveKey === "attack-left" || moveKey === "attack-right";
  }

  function getCpuWallTrapBounds(battle, player, stageWidth) {
    const width = stageWidth || (activeCanvas ? activeCanvas.getBoundingClientRect().width : 1280);
    const halfWidth = ((player && player.width) || 42) / 2;
    if (battle && battle.stage && battle.stage.walls && battle.stage.walls.length >= 2) {
      return {
        left: battle.stage.walls[0].x + battle.stage.walls[0].width + halfWidth,
        right: battle.stage.walls[1].x - halfWidth
      };
    }

    const edgeInset = Math.max(68, width * 0.08);
    return {
      left: edgeInset + halfWidth,
      right: width - edgeInset - halfWidth
    };
  }

  function isFighterWallLoopOpportunity(battle, player, opponent, stageWidth) {
    if (!battle || !player || !opponent || player.controlType !== "cpu" || player.characterKey !== "fighter" || !opponent.alive) {
      return false;
    }

    if (!canCpuUseJump(battle)) {
      return false;
    }

    const bounds = getCpuWallTrapBounds(battle, opponent, stageWidth);
    const nearWallPadding = battle.stage && battle.stage.walls && battle.stage.walls.length >= 2 ? 82 : 96;
    const nearLeftWall = opponent.x <= bounds.left + nearWallPadding;
    const nearRightWall = opponent.x >= bounds.right - nearWallPadding;
    if (!nearLeftWall && !nearRightWall) {
      return false;
    }

    const horizontalDistance = Math.abs(opponent.x - player.x);
    const verticalDistance = opponent.y - player.y;
    if (horizontalDistance > 172 || verticalDistance < -150 || verticalDistance > 180) {
      return false;
    }

    if (nearLeftWall && player.x < opponent.x - 8) {
      return false;
    }
    if (nearRightWall && player.x > opponent.x + 8) {
      return false;
    }

    return true;
  }

  function updateCpuComboRouteState(battle, player, opponent, delta) {
    if (!player || !player.aiComboRoute) {
      return;
    }

    player.aiComboTimer = Math.max(0, player.aiComboTimer - delta);
    if (!opponent || !opponent.alive || player.aiComboTargetId !== opponent.id || player.aiComboTimer <= 0) {
      clearCpuComboRoute(player);
      return;
    }

    if (player.aiComboRoute === "fighter-wall-loop") {
      if (!isFighterWallLoopOpportunity(battle, player, opponent)) {
        clearCpuComboRoute(player);
      }
      return;
    }

    if (opponent.comboSourceId !== player.id && opponent.hitstun <= 0.05) {
      clearCpuComboRoute(player);
    }
  }

  function chooseCpuComboRouteMove(player, opponent, adaptive) {
    if (!player || !opponent || !player.aiComboRoute || player.aiComboTargetId !== opponent.id) {
      return null;
    }

    const horizontalDistance = Math.abs(opponent.x - player.x);
    const verticalDistance = opponent.y - player.y;

    if (player.aiComboRoute === "fighter-wall-loop") {
      if (player.onGround) {
        return null;
      }
      if (horizontalDistance < 164 && verticalDistance > -144 && verticalDistance < 196) {
        return "air-down";
      }
      return null;
    }

    if (player.aiComboRoute === "grab-string") {
      if (!player.onGround) {
        return null;
      }

      if (player.aiComboStep <= 1) {
        if (horizontalDistance < 98 && verticalDistance > -44 && verticalDistance < 104 && Math.random() < 0.62) {
          return "attack-down";
        }
        if (horizontalDistance < 166 && Math.abs(verticalDistance) < 114) {
          return "attack-side";
        }
        return null;
      }

      if (horizontalDistance < 92 && verticalDistance > -38 && verticalDistance < 96 && Math.random() < 0.46) {
        return "attack-down";
      }
      if (horizontalDistance < 176 && Math.abs(verticalDistance) < 116) {
        return "attack-side";
      }
      return null;
    }

    if (player.aiComboRoute === "side-pressure") {
      if (!player.onGround) {
        return null;
      }
      if (Math.abs(verticalDistance) < 98 && horizontalDistance < 180 + ((adaptive && adaptive.sidePressure) || 0) * 24) {
        return "attack-side";
      }
      if (Math.abs(verticalDistance) < 90 && horizontalDistance < 220 && player.dashActive) {
        return "attack-side";
      }
      return null;
    }

    if (player.aiComboRoute === "air-up-juggle") {
      if (player.onGround) {
        return null;
      }
      if ((adaptive && adaptive.antiAir > 0.4 ? verticalDistance < 56 : verticalDistance < 42) && horizontalDistance < 142) {
        return "air-up";
      }
      if (verticalDistance < -26 && horizontalDistance < 176) {
        return "air-up";
      }
      if (horizontalDistance < 88 && Math.abs(verticalDistance) < 104) {
        return "air-neutral";
      }
      return null;
    }

    if (player.aiComboRoute !== "air-side-string") {
      return null;
    }

    if (player.aiComboStep === 0) {
      if (!player.onGround) {
        if (horizontalDistance < 186 && Math.abs(verticalDistance) < 136) {
          return "air-side";
        }
        return "air-neutral";
      }
      return null;
    }

    if (player.aiComboStep === 1 || player.aiComboStep === 2) {
      if (!player.onGround) {
        if (verticalDistance > -26 && horizontalDistance < 156) {
          return "air-down";
        }
        return "air-neutral";
      }
      return null;
    }

    if (player.aiComboStep === 3) {
      if (!player.onGround) {
        return null;
      }
      if (horizontalDistance < 164 && verticalDistance < 36 && verticalDistance > -140) {
        return "attack-up";
      }
    }

    return null;
  }

  function registerCpuComboRouteHit(attacker, target, source) {
    if (!attacker || attacker.controlType !== "cpu" || !target || !source) {
      return;
    }

    const moveKey = source.moveKey || "";
    if (moveKey === "throw-down") {
      attacker.aiComboRoute = "grab-string";
      attacker.aiComboStep = 1;
      attacker.aiComboTimer = 1.02;
      attacker.aiComboTargetId = target.id;
      return;
    }

    if (attacker.aiComboRoute === "grab-string" && attacker.aiComboTargetId === target.id && moveKey === "attack-down") {
      attacker.aiComboStep = Math.max(2, attacker.aiComboStep + 1);
      attacker.aiComboTimer = 0.88;
      return;
    }

    if (isCpuGroundSideMoveKey(moveKey) && Math.abs(target.y - attacker.y) < 96) {
      const sideCount = attacker.aiComboRoute === "side-pressure" && attacker.aiComboTargetId === target.id ? attacker.aiComboStep + 1 : 1;
      attacker.aiComboRoute = "side-pressure";
      attacker.aiComboStep = sideCount;
      attacker.aiComboTimer = 0.88;
      attacker.aiComboTargetId = target.id;
      return;
    }

    if (isCpuAirUpMoveKey(moveKey)) {
      const upChainCount = attacker.aiComboRoute === "air-up-juggle" && attacker.aiComboTargetId === target.id ? attacker.aiComboStep + 1 : 1;
      attacker.aiComboRoute = "air-up-juggle";
      attacker.aiComboStep = upChainCount;
      attacker.aiComboTimer = 0.9;
      attacker.aiComboTargetId = target.id;
      return;
    }

    if (attacker.aiComboRoute === "air-side-string" && attacker.aiComboTargetId === target.id && attacker.aiComboStep === 3 && moveKey === "attack-up") {
      attacker.aiComboStep = 0;
      attacker.aiComboTimer = 0.96;
      return;
    }

    if (moveKey === "attack-up" && target.y < attacker.y - 14) {
      attacker.aiComboRoute = "air-up-juggle";
      attacker.aiComboStep = 0;
      attacker.aiComboTimer = 0.72;
      attacker.aiComboTargetId = target.id;
      return;
    }

    if (isCpuAirSideMoveKey(moveKey)) {
      attacker.aiComboRoute = "air-side-string";
      attacker.aiComboStep = 1;
      attacker.aiComboTimer = 1.08;
      attacker.aiComboTargetId = target.id;
      return;
    }

    if (attacker.aiComboRoute !== "air-side-string" || attacker.aiComboTargetId !== target.id) {
      return;
    }

    if (attacker.aiComboStep === 1 && moveKey === "air-down") {
      attacker.aiComboStep = 2;
      attacker.aiComboTimer = 0.82;
      return;
    }

    if (attacker.aiComboStep === 2 && moveKey === "air-down") {
      attacker.aiComboStep = 3;
      attacker.aiComboTimer = 0.9;
      return;
    }

  }

  function hasCpuComboWindow(player, opponent) {
    return Boolean(opponent && opponent.alive && opponent.hitstun > 0.08 && opponent.comboSourceId === player.id);
  }

  function shouldCpuTryGrab(player, opponent, adaptive, distanceX, distanceY) {
    if (!player || !opponent || player.controlType !== "cpu") {
      return false;
    }

    if (!player.onGround || !opponent.onGround) {
      return false;
    }

    if (player.attackCooldown > 0 || player.hitstun > 0 || player.grabTargetId || player.grabbedById || opponent.invincible > 0 || opponent.grabTargetId || opponent.grabbedById) {
      return false;
    }

    if (distanceX > 78 || Math.abs(distanceY) > 62) {
      return false;
    }

    if (opponent.shieldActive) {
      return true;
    }

    const grabBias = (adaptive ? adaptive.shieldPunish * 0.5 + adaptive.sidePressure * 0.42 + adaptive.keepOut * 0.15 : 0) + (distanceX < 52 ? 0.18 : 0);
    return Math.random() < 0.18 + grabBias;
  }

  function buildCpuThrowInput(player, opponent) {
    return {
      left: false,
      right: false,
      jump: false,
      fall: true,
      dash: false,
      shield: false
    };
  }

  function updateCpuState(battle, player, opponent, delta) {
    const rect = activeCanvas.getBoundingClientRect();
    const wallInset = battle.stage && battle.stage.walls && battle.stage.walls.length >= 2 ? battle.stage.walls[0].x + battle.stage.walls[0].width : 0;
    const safeMargin = wallInset ? Math.max(72, wallInset + 18) : 165;
    const retreatDir = opponent.x < player.x ? 1 : -1;
    const towardDir = retreatDir * -1;
    const distanceX = Math.abs(opponent.x - player.x);
    const distanceY = opponent.y - player.y;
    const comboWindow = hasCpuComboWindow(player, opponent);
    const canJump = canCpuUseJump(battle);

    player.dashActive = false;
    player.shieldActive = false;
    player.shieldEnergy = Math.min(100, player.shieldEnergy + 10 * delta);
    player.jumpHeld = false;
    player.fallHeld = false;

    player.aiMoveTimer -= delta;
    player.aiAttackTimer -= delta;
    player.aiSpecialTimer -= delta;
    player.aiJumpTimer -= delta;
    updateCpuComboRouteState(battle, player, opponent, delta);
    const adaptive = updateCpuAdaptiveRead(player, opponent, delta);
    const fighterWallLoopOpportunity = isFighterWallLoopOpportunity(battle, player, opponent, rect.width);
    if (fighterWallLoopOpportunity && (!player.aiComboRoute || player.aiComboRoute === "fighter-wall-loop" || !comboWindow)) {
      player.aiComboRoute = "fighter-wall-loop";
      player.aiComboStep = player.onGround ? 0 : 1;
      player.aiComboTimer = Math.max(player.aiComboTimer, 0.86);
      player.aiComboTargetId = opponent.id;
      player.direction = towardDir;
    }
    const comboRouteActive = Boolean(player.aiComboRoute && player.aiComboTargetId === opponent.id);

    if (comboWindow || comboRouteActive) {
      player.aiMoveDir = towardDir;
      player.aiMoveTimer = Math.min(player.aiMoveTimer, 0.12);
    } else if (player.x < safeMargin) {
      player.aiMoveDir = 1;
      player.aiMoveTimer = 0.18;
    } else if (player.x > rect.width - safeMargin) {
      player.aiMoveDir = -1;
      player.aiMoveTimer = 0.18;
    } else if (player.aiMoveTimer <= 0) {
      player.aiMoveDir = chooseCpuRetreatDir(retreatDir, towardDir, distanceX);
      player.aiMoveTimer = 0.24 + Math.random() * 0.55;
    }

    let desiredDir = player.aiMoveDir;
    if (comboWindow || comboRouteActive || distanceX > 240) {
      desiredDir = towardDir;
    } else if (adaptive.keepOut > 0.56 && distanceX < 126) {
      desiredDir = retreatDir;
    } else if (adaptive.chase > 0.52 && distanceX > 164) {
      desiredDir = towardDir;
    } else if (distanceX < 82) {
      desiredDir = retreatDir;
    } else if (distanceX < 190) {
      desiredDir = Math.random() < 0.72 ? towardDir : retreatDir;
    }
    if (player.x < safeMargin + 18 && desiredDir < 0) {
      desiredDir = 1;
    }
    if (player.x > rect.width - safeMargin - 18 && desiredDir > 0) {
      desiredDir = -1;
    }

    const wantsDashApproach =
      player.onGround &&
      desiredDir === towardDir &&
      ((comboWindow || comboRouteActive) ? distanceX > 30 : distanceX > (adaptive.chase > 0.45 ? 102 : 138 - adaptive.sidePressure * 22));
    const wantsDashRetreat = player.onGround && desiredDir === retreatDir && distanceX < (adaptive.keepOut > 0.55 ? 128 : 92);
    const cpuSpeed = wantsDashApproach || wantsDashRetreat ? 430 + adaptive.chase * 26 : 215 + adaptive.keepOut * 18;
    player.dashActive = Boolean((wantsDashApproach || wantsDashRetreat) && Math.abs(desiredDir) > 0.1);
    const targetSpeed = desiredDir * cpuSpeed;
    player.vx += (targetSpeed - player.vx) * (player.onGround ? 0.14 : 0.08);
    if (Math.abs(targetSpeed) > 0.1) {
      player.direction = targetSpeed > 0 ? 1 : -1;
    }

    if (player.onGround) {
      player.jumpsRemaining = player.maxJumps;
    }

    const edgeEscape = player.x < safeMargin + 10 || player.x > rect.width - safeMargin - 10;
    const wallLoopJump =
      comboRouteActive &&
      player.aiComboRoute === "fighter-wall-loop" &&
      canJump &&
      player.onGround &&
      player.aiJumpTimer <= 0 &&
      player.jumpsRemaining > 0 &&
      distanceX < 160 &&
      distanceY > -112 &&
      distanceY < 180;
    const routeJump =
      comboRouteActive &&
      player.aiComboRoute === "air-side-string" &&
      (player.aiComboStep === 0 || player.aiComboStep === 1 || player.aiComboStep === 2) &&
      canJump &&
      player.onGround &&
      player.aiJumpTimer <= 0 &&
      player.jumpsRemaining > 0 &&
      distanceX < 170;
    const juggleJump =
      comboRouteActive &&
      player.aiComboRoute === "air-up-juggle" &&
      canJump &&
      player.aiJumpTimer <= 0 &&
      player.jumpsRemaining > 0 &&
      distanceX < 148 + adaptive.antiAir * 34 &&
      distanceY < (adaptive.antiAir > 0.45 ? -8 : -18) &&
      (player.onGround || (player.vy > -170 && distanceY < -38));
    const comboJump =
      comboWindow &&
      canJump &&
      player.onGround &&
      player.aiJumpTimer <= 0 &&
      player.jumpsRemaining > 0 &&
      distanceX < 150 + adaptive.antiAir * 26 &&
      distanceY < (adaptive.antiAir > 0.4 ? -10 : -18);
    const aerialApproach =
      !comboWindow &&
      !comboRouteActive &&
      canJump &&
      player.onGround &&
      player.aiJumpTimer <= 0 &&
      player.jumpsRemaining > 0 &&
      distanceX > 84 - adaptive.chase * 10 &&
      distanceX < 220 + adaptive.chase * 24 &&
      Math.abs(distanceY) < 118 + adaptive.antiAir * 22 &&
      Math.random() < 0.34 + adaptive.antiAir * 0.16;
    const shouldJump =
      canJump &&
      player.aiJumpTimer <= 0 &&
      player.jumpsRemaining > 0 &&
      (wallLoopJump || routeJump || juggleJump || comboJump || aerialApproach || edgeEscape || distanceX < 138 || (distanceY < -80 && Math.random() < 0.55));

    if (shouldJump) {
      player.vy =
        wallLoopJump
          ? player.jumpsRemaining === player.maxJumps
            ? -548
            : -512
          : routeJump || juggleJump || comboWindow
          ? player.jumpsRemaining === player.maxJumps
            ? -515
            : juggleJump
              ? -520
              : -470
          : player.jumpsRemaining === player.maxJumps
            ? -500
            : -455;
      player.onGround = false;
      player.jumpsRemaining -= 1;
      player.aiJumpTimer =
        wallLoopJump
          ? 0.04 + Math.random() * 0.05
          : routeJump || juggleJump || comboWindow
          ? 0.16 + Math.random() * 0.14
          : aerialApproach
            ? 0.34 + Math.random() * 0.22
            : 0.8 + Math.random() * 1.1;
    }

    const wantsGrab = !comboWindow && player.aiAttackTimer <= 0 && shouldCpuTryGrab(player, opponent, adaptive, distanceX, distanceY);
    if (wantsGrab && tryGrabOpponent(battle, player, opponent)) {
      player.aiComboRoute = "grab-string";
      player.aiComboStep = 0;
      player.aiComboTimer = 1.15;
      player.aiComboTargetId = opponent.id;
      player.aiAttackTimer = 0.22 + Math.random() * 0.08;
      return;
    }

    const shouldFastfallCombo =
      comboRouteActive &&
      ((player.aiComboRoute === "air-side-string" &&
        player.aiComboStep === 3 &&
        !player.onGround &&
        opponent.hitstun > 0.05 &&
        distanceY > -120) ||
        (player.aiComboRoute === "fighter-wall-loop" &&
          !player.onGround &&
          distanceX < 156 &&
          distanceY > -94));
    if (shouldFastfallCombo) {
      player.fallHeld = true;
      player.vy += (player.aiComboRoute === "fighter-wall-loop" ? 900 : 760) * delta;
    }

    const comboRouteBlocking =
      comboRouteActive &&
      ((player.aiComboRoute === "air-side-string" &&
        (((player.aiComboStep === 0 || player.aiComboStep === 1 || player.aiComboStep === 2) && player.onGround) ||
          (player.aiComboStep === 3 && !player.onGround))) ||
        (player.aiComboRoute === "air-up-juggle" && player.onGround) ||
        (player.aiComboRoute === "fighter-wall-loop" && player.onGround));
    const canAttack = !comboRouteBlocking && player.attackCooldown <= 0 && player.aiAttackTimer <= 0 && distanceX < ((comboWindow || comboRouteActive) ? 320 : 380);
    if (canAttack) {
      const moveKey =
        chooseCpuComboRouteMove(player, opponent, adaptive) ||
        (comboWindow
          ? chooseCpuComboMove(player, opponent, rect.width, safeMargin, adaptive) || chooseCpuMove(player, opponent, rect.width, safeMargin, adaptive)
          : chooseCpuMove(player, opponent, rect.width, safeMargin, adaptive));
      if (moveKey) {
        performMove(battle, player, moveKey, opponent);
        if (comboRouteActive) {
          player.aiAttackTimer =
            player.aiComboRoute === "fighter-wall-loop"
              ? 0.04 + Math.random() * 0.04
              : player.aiComboRoute === "side-pressure"
              ? 0.09 + Math.random() * 0.07
              : player.aiComboRoute === "air-side-string" && player.aiComboStep === 3
                ? 0.08 + Math.random() * 0.07
                : player.aiComboStep === 2
                ? 0.08 + Math.random() * 0.08
                : 0.06 + Math.random() * 0.06;
        } else if (comboWindow) {
          player.aiAttackTimer = 0.12 + Math.random() * 0.16;
        } else if (moveKey === "attack-dash") {
          player.aiAttackTimer = 0.2 + Math.random() * 0.22;
        } else {
          player.aiAttackTimer = 0.36 + Math.random() * 0.72;
        }
        if (moveKey.startsWith("special")) {
          player.aiSpecialTimer = 1.4 + Math.random() * 1.9;
        }
      }
    }
  }

  function chooseCpuRetreatDir(retreatDir, towardDir, distanceX) {
    if (distanceX > 320) {
      return Math.random() < 0.92 ? towardDir : retreatDir;
    }
    if (distanceX > 220) {
      return Math.random() < 0.84 ? towardDir : retreatDir;
    }
    if (distanceX > 120) {
      return Math.random() < 0.72 ? towardDir : retreatDir;
    }
    return Math.random() < 0.42 ? towardDir : retreatDir;
  }

  function chooseCpuComboMove(player, opponent, stageWidth, safeMargin, adaptive) {
    const towardDir = opponent.x < player.x ? -1 : 1;
    const awayEdge = player.x < safeMargin + 26 ? 1 : player.x > stageWidth - safeMargin - 26 ? -1 : 0;
    const preferToward = awayEdge !== 0 ? awayEdge : towardDir;
    const horizontalDistance = Math.abs(opponent.x - player.x);
    const verticalDistance = opponent.y - player.y;

    if (!player.onGround) {
      if (adaptive && adaptive.antiAir > 0.42 && verticalDistance < 20 && horizontalDistance < 144) {
        return "air-up";
      }
      if (verticalDistance < -26) {
        return "air-up";
      }
      if (verticalDistance < 18 && horizontalDistance < 126) {
        return Math.random() < 0.8 + (adaptive ? adaptive.antiAir * 0.12 : 0) ? "air-up" : "air-neutral";
      }
      if (verticalDistance > 86) {
        return "air-down";
      }
      if (horizontalDistance > 48 && Math.abs(verticalDistance) < 124) {
        return "air-side";
      }
      if (horizontalDistance > 86) {
        return Math.random() < 0.82 ? "air-side" : preferToward < 0 ? "air-left" : "air-right";
      }
      return Math.random() < 0.7 ? "air-side" : "air-neutral";
    }

    if (verticalDistance < -30) {
      if (adaptive && adaptive.antiAir > 0.48 && horizontalDistance < 138) {
        return "attack-up";
      }
      if (horizontalDistance < 118) {
        return "attack-up";
      }
      if (player.dashActive && horizontalDistance < 188) {
        return "attack-dash";
      }
      return "attack-side";
    }

    if (adaptive && adaptive.sidePressure > 0.42 && Math.abs(verticalDistance) < 92 && horizontalDistance < 164) {
      return "attack-side";
    }
    if (verticalDistance > 72 && horizontalDistance < 120) {
      return "attack-down";
    }
    if (horizontalDistance < 70) {
      return adaptive && adaptive.sidePressure > 0.56 ? "attack-side" : Math.random() < 0.6 ? "attack-neutral" : "attack-up";
    }
    if (player.dashActive && horizontalDistance < 180) {
      return "attack-dash";
    }
    if (horizontalDistance < 160) {
      return adaptive && adaptive.sidePressure > 0.36 ? "attack-side" : "attack-side";
    }
    return null;
  }

  function chooseCpuMove(player, opponent, stageWidth, safeMargin, adaptive) {
    const towardDir = opponent.x < player.x ? -1 : 1;
    const awayEdge = player.x < safeMargin + 26 ? 1 : player.x > stageWidth - safeMargin - 26 ? -1 : 0;
    const preferToward = awayEdge !== 0 ? awayEdge : towardDir;
    const horizontalDistance = Math.abs(opponent.x - player.x);
    const verticalDistance = opponent.y - player.y;
    const canUseSpecial = player.aiSpecialTimer <= 0;

    if (!player.onGround) {
      if (canUseSpecial && Math.random() < 0.22) {
        if (verticalDistance < -70) {
          return "special-up";
        }
        if (horizontalDistance > 110) {
          return preferToward < 0 ? "special-left" : "special-right";
        }
      }

      if (adaptive && adaptive.antiAir > 0.36 && verticalDistance < 6 && horizontalDistance < 152 && Math.random() < 0.7) {
        return "air-up";
      }
      if (verticalDistance < -24 && horizontalDistance < 142 && Math.random() < 0.68) {
        return "air-up";
      }
      if (verticalDistance > 80 && Math.random() < 0.42) {
        return "air-down";
      }
      if (verticalDistance < -80 && Math.random() < 0.4) {
        return "air-up";
      }
      if (horizontalDistance > 38 && horizontalDistance < 190 && Math.abs(verticalDistance) < 126) {
        return Math.random() < 0.8 - (adaptive ? adaptive.antiAir * 0.16 : 0) ? "air-side" : "air-neutral";
      }
      if (horizontalDistance > 70) {
        return Math.random() < 0.84 ? "air-side" : preferToward < 0 ? "air-left" : "air-right";
      }
      return Math.random() < 0.58 ? "air-side" : "air-neutral";
    }

    if (canUseSpecial && Math.random() < 0.28) {
      if (verticalDistance < -80) {
        return "special-up";
      }
      if (horizontalDistance < 120 && Math.random() < 0.35) {
        return "special-down";
      }
      if (adaptive && adaptive.chase > 0.58 && horizontalDistance > 210 && Math.random() < 0.42) {
        return preferToward < 0 ? "special-left" : "special-right";
      }
      return preferToward < 0 ? "special-left" : "special-right";
    }

    if (adaptive && adaptive.antiAir > 0.44 && verticalDistance < -34 && horizontalDistance < 152 && Math.random() < 0.72) {
      return "attack-up";
    }
    if (adaptive && adaptive.sidePressure > 0.44 && Math.abs(verticalDistance) < 94 && horizontalDistance < 172 && Math.random() < 0.76) {
      return "attack-side";
    }
    if (adaptive && adaptive.keepOut > 0.5 && horizontalDistance < 138 && Math.abs(verticalDistance) < 96 && Math.random() < 0.55) {
      return player.dashActive ? "attack-dash" : "attack-side";
    }
    if (player.dashActive && horizontalDistance > 76 && horizontalDistance < 220 && Math.random() < 0.82) {
      return "attack-dash";
    }
    if (verticalDistance < -70 && Math.random() < 0.45) {
      return "attack-up";
    }
    if (verticalDistance > 70 && Math.random() < 0.28) {
      return "attack-down";
    }
    if (horizontalDistance < 96 && Math.random() < 0.58) {
      return "attack-neutral";
    }
    return preferToward < 0 ? "attack-left" : "attack-right";
  }

  function clearMeteorState(player) {
    player.meteorSlamActive = false;
    player.meteorMinFallSpeed = 0;
    player.meteorImpactHitstun = 0;
  }

  function applyMeteorLanding(player, impactSpeed) {
    if (!player.meteorSlamActive) {
      return;
    }

    if (impactSpeed > 260) {
      player.hitstun = Math.max(player.hitstun, player.meteorImpactHitstun || 0.22);
      player.hitFlash = Math.max(player.hitFlash, 0.22);
      player.actionPulse = Math.max(player.actionPulse, 0.28);
      player.vx *= 0.16;
    }

    clearMeteorState(player);
  }

  function applyWallCollision(stage, player) {
    if (stage.key === "air-dome") {
      const ceilingY = stage.wallTop;
      const topEdge = player.y - player.height / 2;
      if (topEdge < ceilingY) {
        player.y = ceilingY + player.height / 2;
        player.vy = Math.max(0, player.vy);
      }
      return;
    }

    if (!stage.walls || stage.walls.length < 2 || player.y + player.height / 2 <= stage.wallTop) {
      return;
    }

    const leftWall = stage.walls[0];
    const rightWall = stage.walls[1];
    const leftLimit = leftWall.x + leftWall.width + player.width / 2;
    const rightLimit = rightWall.x - player.width / 2;

    if (player.x < leftLimit) {
      player.x = leftLimit;
      player.vx = Math.max(0, player.vx);
    } else if (player.x > rightLimit) {
      player.x = rightLimit;
      player.vx = Math.min(0, player.vx);
    }
  }

  function applyStageCollision(battle, player) {
    const stage = battle.stage;
    const groundY = stage.groundY;
    const footY = player.y + player.height / 2;
    const previousFootY = player.prevY + player.height / 2;
    const impactSpeed = player.vy;
    let landingPlatform = null;

    if (Number.isFinite(groundY) && footY >= groundY) {
      player.y = groundY - player.height / 2;
      player.vy = 0;
      player.onGround = true;
      player.currentPlatform = null;
      player.jumpsRemaining = player.maxJumps;
      applyMeteorLanding(player, impactSpeed);
      applyWallCollision(stage, player);
      return;
    }

    if (player.platformDropTimer <= 0) {
      for (const platform of battle.stage.platforms) {
        const withinX =
          player.x + player.width / 2 > platform.x &&
          player.x - player.width / 2 < platform.x + platform.width;

        if (!withinX || player.vy < 0) {
          continue;
        }

        const passedIntoPlatform = previousFootY <= platform.y + 14 && footY >= platform.y - 6;
        const standingOnPlatform = footY >= platform.y - 6 && footY <= platform.y + 20 && previousFootY <= platform.y + 20;

        if (passedIntoPlatform || standingOnPlatform) {
          if (!landingPlatform || platform.y < landingPlatform.y) {
            landingPlatform = platform;
          }
        }
      }
    }

    if (landingPlatform) {
      player.y = landingPlatform.y - player.height / 2;
      player.vy = 0;
      player.onGround = true;
      player.currentPlatform = landingPlatform;
      player.jumpsRemaining = player.maxJumps;
      applyMeteorLanding(player, impactSpeed);
    }

    if (!landingPlatform) {
      player.currentPlatform = null;
    }

    applyWallCollision(stage, player);
  }

  function applyBlastZones(battle, player, opponent) {
    const rect = activeCanvas.getBoundingClientRect();
    let side = null;

    if (player.x < -160) {
      side = "left";
    } else if (player.x > rect.width + 160) {
      side = "right";
    } else if (player.y > rect.height + 180) {
      side = "bottom";
    } else if (player.y < -220) {
      side = "top";
    }

    if (side) {
      registerKo(battle, opponent, player, "ring-out", {
        side,
        width: rect.width,
        height: rect.height,
        x: clamp(player.x, 0, rect.width),
        y: clamp(player.y, 0, rect.height)
      });
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hasDirectionalInput(inputState, key) {
    return Boolean(inputState && inputState[key]);
  }

  function resolveAttackMoveKey(player, inputState) {
    const activeInput = inputState || getLocalInputState();
    const isAirborne = player && !player.onGround;

    if (hasDirectionalInput(activeInput, "jump")) {
      return isAirborne ? "air-up" : "attack-up";
    }
    if (hasDirectionalInput(activeInput, "fall")) {
      return isAirborne ? "air-down" : "attack-down";
    }
    if (hasDirectionalInput(activeInput, "left") || hasDirectionalInput(activeInput, "right")) {
      if (!isAirborne && player && player.dashActive) {
        return "attack-dash";
      }
      return isAirborne ? "air-side" : "attack-side";
    }
    return isAirborne ? "air-neutral" : "attack-neutral";
  }

  function resolveSpecialMoveKey(inputState, requireModifier) {
    const activeInput = inputState || getLocalInputState();
    const modifierDown = requireModifier === false ? true : keys.has("KeyE");
    if (!modifierDown) {
      return null;
    }
    if (hasDirectionalInput(activeInput, "left")) {
      return "special-left";
    }
    if (hasDirectionalInput(activeInput, "fall")) {
      return "special-down";
    }
    if (hasDirectionalInput(activeInput, "right")) {
      return "special-right";
    }
    if (hasDirectionalInput(activeInput, "jump")) {
      return "special-up";
    }
    return null;
  }

  function resolveThrowProfile(player, inputState) {
    const activeInput = inputState || getLocalInputState();
    if (hasDirectionalInput(activeInput, "jump")) {
      return { name: "Up Throw", moveKey: "throw-up", damage: 8, forceX: 80 * player.direction, forceY: -460, dir: player.direction, hitstunBonus: 0.2 };
    }
    if (hasDirectionalInput(activeInput, "fall")) {
      return { name: "Down Throw", moveKey: "throw-down", damage: 7, forceX: 160 * player.direction, forceY: 260, dir: player.direction, hitstunBonus: 0.16 };
    }
    if (hasDirectionalInput(activeInput, "left")) {
      return { name: "Back Throw", moveKey: "throw-back", damage: 9, forceX: -460 * player.direction, forceY: -170, dir: -player.direction, hitstunBonus: 0.18 };
    }
    if (hasDirectionalInput(activeInput, "right")) {
      return { name: "Forward Throw", moveKey: "throw-forward", damage: 9, forceX: 520 * player.direction, forceY: -190, dir: player.direction, hitstunBonus: 0.18 };
    }
    return { name: "Forward Throw", moveKey: "throw-forward", damage: 9, forceX: 520 * player.direction, forceY: -190, dir: player.direction, hitstunBonus: 0.18 };
  }

  function consumeRemoteCommands(battle, player, opponent) {
    if (!player.remoteCommands || !player.remoteCommands.length) {
      return;
    }

    const commands = player.remoteCommands.splice(0, player.remoteCommands.length);
    for (const command of commands) {
      if (command.type === "attack") {
        performMove(battle, player, resolveAttackMoveKey(player, player.inputState), opponent);
      } else if (command.type === "special") {
        if (command.moveKey) {
          performMove(battle, player, command.moveKey, opponent);
        }
      } else if (command.type === "grab") {
        if (player.grabTargetId) {
          throwGrabbedOpponent(battle, player, player.inputState);
        } else {
          tryGrabOpponent(battle, player, opponent);
        }
      }
    }
  }

  function throwGrabbedOpponent(battle, player, inputState) {
    if (!player || !player.grabTargetId) {
      return false;
    }

    const target = findBattlePlayer(battle, player.grabTargetId);
    if (!target || !target.alive) {
      releaseGrabState(battle, player);
      return false;
    }

    const throwProfile = resolveThrowProfile(player, inputState);
    player.moveLabel = throwProfile.name;
    player.moveLabelTimer = 0.7;
    player.actionPulse = 0.24;
    player.attackCooldown = Math.max(player.attackCooldown, 0.4);
    player.shieldActive = false;

    releaseGrabState(battle, player);

    target.x = player.x + player.direction * 34;
    target.y = player.y - 6;
    target.prevY = target.y;
    target.invincible = 0;
    target.shieldActive = false;

    applyImpact(battle, player, target, throwProfile);
    return true;
  }

  function tryGrabOpponent(battle, player, opponent) {
    if (
      !player ||
      !opponent ||
      !player.alive ||
      !opponent.alive ||
      player.grabTargetId ||
      player.grabbedById ||
      opponent.grabbedById ||
      opponent.grabTargetId ||
      player.attackCooldown > 0 ||
      player.hitstun > 0 ||
      opponent.invincible > 0
    ) {
      return false;
    }

    const distanceX = Math.abs(player.x - opponent.x);
    const distanceY = Math.abs((player.y - 8) - (opponent.y - 8));
    const facingOpponent = (opponent.x - player.x) * player.direction >= -20;

    if (distanceX > 78 || distanceY > 62 || !facingOpponent) {
      return false;
    }

    player.grabTargetId = opponent.id;
    player.grabHoldTimer = 1.05;
    opponent.grabbedById = player.id;
    opponent.hitstun = 0;
    opponent.invincible = 0;
    opponent.shieldActive = false;
    opponent.vx = 0;
    opponent.vy = 0;
    player.attackCooldown = Math.max(player.attackCooldown, 0.16);
    player.moveLabel = "Grab";
    player.moveLabelTimer = 0.65;
    player.actionPulse = 0.22;
    syncGrabbedPlayer(battle, player);
    return true;
  }

  function triggerHumanGrabOrThrow() {
    const battle = state.battle;
    if (!battle || battle.paused || battle.ended) {
      return;
    }

    const [player, opponent] = battle.players;
    if (!player.alive || player.shieldActive || player.grabbedById) {
      return;
    }

    if (player.grabTargetId) {
      throwGrabbedOpponent(battle, player);
      return;
    }

    tryGrabOpponent(battle, player, opponent);
  }

  function triggerHumanMove(moveKey) {
    const battle = state.battle;
    if (!battle || battle.paused || battle.ended) {
      return;
    }
    const [player, dummy] = battle.players;
    if (!player.alive || player.shieldActive || player.grabTargetId || player.grabbedById) {
      return;
    }
    performMove(battle, player, moveKey, dummy);
  }

  function performMove(battle, player, moveKey, opponent) {
    if (player.attackCooldown > 0 || player.hitstun > 0 || player.grabTargetId || player.grabbedById || !player.alive) {
      return;
    }

    const move = buildMoveProfile(player, moveKey, opponent);
    if (!move) {
      return;
    }

    player.attackCooldown = move.cooldown;
    player.moveLabel = move.name;
    player.moveLabelTimer = 0.9;
    player.actionPulse = 0.2;
    player.shieldActive = false;
    player.direction = move.dir;

    if (typeof move.selfVx === "number") {
      player.vx = move.selfVx * move.dir;
    }
    if (typeof move.selfVy === "number") {
      player.vy = move.selfVy;
    }

    if (move.type === "melee" || move.type === "burst" || move.type === "aerial-spin" || move.type === "aerial-sweep") {
      spawnHitbox(battle, player, move, move.type === "melee" || move.type === "aerial-spin" || move.type === "aerial-sweep");
      return;
    }

    spawnProjectile(battle, player, move);
  }

  function buildMoveProfile(player, moveKey, opponent) {
    const set = moveLibrary[player.characterKey];
    if (!set) {
      return null;
    }

    let base = set.neutral;
    let dir = player.direction || 1;

    if (moveKey === "attack-left") {
      base = set.left;
      dir = -1;
    } else if (moveKey === "attack-dash") {
      base = set.dash || set.right;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    } else if (moveKey === "attack-side") {
      base = set.right;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    } else if (moveKey === "attack-right") {
      base = set.right;
      dir = 1;
    } else if (moveKey === "attack-down") {
      base = set.down;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    } else if (moveKey === "attack-up") {
      base = set.up;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    } else if (moveKey === "air-left") {
      base = set.airLeft;
      dir = -1;
    } else if (moveKey === "air-side") {
      base = set.airRight;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    } else if (moveKey === "air-right") {
      base = set.airRight;
      dir = 1;
    } else if (moveKey === "air-down") {
      base = set.airDown;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    } else if (moveKey === "air-up") {
      base = set.airUp;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    } else if (moveKey === "air-neutral") {
      base = set.airNeutral;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    } else if (moveKey === "special-left") {
      base = set.specialLeft;
      dir = -1;
    } else if (moveKey === "special-down") {
      base = set.specialDown;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    } else if (moveKey === "special-right") {
      base = set.specialRight;
      dir = 1;
    } else if (moveKey === "special-up") {
      base = set.specialUp;
      dir = player.direction || (opponent.x >= player.x ? 1 : -1);
    }

    return {
      ...base,
      moveKey,
      dir,
      forceX: (base.forceX || 0) * dir,
      offsetX: (base.offsetX || 0) * (base.type === "burst" ? 1 : dir),
      spawnX: (base.spawnX || 0) * dir,
      speedX: (base.speedX || 0) * dir
    };
  }

  function spawnHitbox(battle, player, move, followOwner) {
    battle.hitboxes.push({
      ownerId: player.id,
      x: player.x + (move.offsetX || 0),
      y: player.y + (move.offsetY || 0),
      width: move.width || 0,
      height: move.height || 0,
      radius: move.radius || 0,
      damage: move.damage,
      moveKey: move.moveKey,
      forceX: move.forceX,
      forceY: move.forceY,
      hitstunBonus: move.hitstunBonus || 0,
      meteor: Boolean(move.meteor),
      meteorMinFallSpeed: move.meteorMinFallSpeed || 0,
      meteorImpactHitstun: move.meteorImpactHitstun || 0,
      dir: move.dir,
      color: move.color,
      life: move.life || 0.12,
      age: 0,
      followOwner,
      offsetX: move.offsetX || 0,
      offsetY: move.offsetY || 0,
      isBurst: move.type === "burst",
      isAerialSpin: move.type === "aerial-spin",
      isAerialSweep: move.type === "aerial-sweep",
      shape: move.radius ? "circle" : "rect",
      ringRadius: move.ringRadius || move.radius || 0,
      swordLength: move.swordLength || 58,
      spinStart: move.spinStart || 0,
      sweepStart: move.sweepStart || 0,
      sweepEnd: typeof move.sweepEnd === "number" ? move.sweepEnd : move.sweepStart || 0,
      sweepSpeed: move.sweepSpeed || 1,
      sweepInnerRadius: move.sweepInnerRadius || 16,
      sweepRadius: move.sweepRadius || move.ringRadius || move.radius || 0,
      sweepThickness: move.sweepThickness || 24,
      hitSet: new Set()
    });
  }

  function spawnProjectile(battle, player, move) {
    battle.projectiles.push({
      ownerId: player.id,
      x: player.x + move.spawnX,
      y: player.y + move.spawnY,
      vx: move.speedX,
      vy: move.speedY,
      radius: move.radius,
      damage: move.damage,
      moveKey: move.moveKey,
      forceX: move.forceX,
      forceY: move.forceY,
      hitstunBonus: move.hitstunBonus || 0,
      meteor: Boolean(move.meteor),
      meteorMinFallSpeed: move.meteorMinFallSpeed || 0,
      meteorImpactHitstun: move.meteorImpactHitstun || 0,
      dir: move.dir,
      color: move.color,
      gravity: move.gravity || 0,
      life: move.life || 1,
      age: 0,
      destructible: player.characterKey === "gunner",
      stickyGround: Boolean(move.stickyGround),
      grounded: false
    });
  }

  function updateHitboxes(battle, delta) {
    for (let index = battle.hitboxes.length - 1; index >= 0; index -= 1) {
      const hitbox = battle.hitboxes[index];
      hitbox.age += delta;
      const owner = battle.players.find((player) => player.id === hitbox.ownerId);
      const lifetime = getHitboxLifetime(hitbox);

      if (!owner || !owner.alive || hitbox.age >= lifetime) {
        battle.hitboxes.splice(index, 1);
        continue;
      }

      if (hitbox.followOwner) {
        hitbox.x = owner.x + hitbox.offsetX;
        hitbox.y = owner.y + hitbox.offsetY;
      }

      for (let projectileIndex = battle.projectiles.length - 1; projectileIndex >= 0; projectileIndex -= 1) {
        const projectile = battle.projectiles[projectileIndex];
        if (!projectile.destructible || projectile.ownerId === hitbox.ownerId) {
          continue;
        }

        if (intersectsHitboxProjectile(hitbox, projectile)) {
          battle.projectiles.splice(projectileIndex, 1);
        }
      }

      for (const target of battle.players) {
        if (target.id === hitbox.ownerId || !target.alive || hitbox.hitSet.has(target.id)) {
          continue;
        }

        if (intersectsHitbox(hitbox, target)) {
          hitbox.hitSet.add(target.id);
          applyImpact(battle, owner, target, hitbox);
        }
      }
    }
  }

  function updateProjectiles(battle, delta) {
    const groundY = battle.stage.groundY;

    for (let index = battle.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = battle.projectiles[index];
      projectile.age += delta;

      if (projectile.age >= projectile.life) {
        battle.projectiles.splice(index, 1);
        continue;
      }

      if (!projectile.grounded) {
        projectile.vy += projectile.gravity * delta;
        projectile.x += projectile.vx * delta;
        projectile.y += projectile.vy * delta;
      }

      if (projectile.stickyGround && Number.isFinite(groundY) && projectile.y + projectile.radius >= groundY) {
        projectile.y = groundY - projectile.radius;
        projectile.vx = 0;
        projectile.vy = 0;
        projectile.grounded = true;
      }

      if (battle.stage.key === "air-dome" && projectile.y - projectile.radius < battle.stage.wallTop) {
        battle.projectiles.splice(index, 1);
        continue;
      }

      if (battle.stage.walls && battle.stage.walls.length >= 2 && projectile.y + projectile.radius > battle.stage.wallTop) {
        const leftBoundary = battle.stage.walls[0].x + battle.stage.walls[0].width;
        const rightBoundary = battle.stage.walls[1].x;
        if (projectile.x - projectile.radius < leftBoundary || projectile.x + projectile.radius > rightBoundary) {
          battle.projectiles.splice(index, 1);
          continue;
        }
      }

      for (const target of battle.players) {
        if (target.id === projectile.ownerId || !target.alive) {
          continue;
        }

        if (intersectsProjectile(projectile, target)) {
          const owner = battle.players.find((player) => player.id === projectile.ownerId);
          applyImpact(battle, owner, target, projectile);
          battle.projectiles.splice(index, 1);
          break;
        }
      }
    }
  }

  function intersectsHitbox(hitbox, target) {
    if (hitbox.isAerialSweep) {
      const sweepGeometry = getAerialSweepGeometry(hitbox);
      const targetRadius = Math.max(target.width, target.height) * 0.42;
      return pointToSegmentDistance(target.x, target.y, sweepGeometry.innerX, sweepGeometry.innerY, sweepGeometry.outerX, sweepGeometry.outerY) <
        targetRadius + hitbox.sweepThickness / 2;
    }

    if (hitbox.shape === "circle") {
      const dx = hitbox.x - target.x;
      const dy = hitbox.y - target.y;
      const combined = hitbox.radius + Math.max(target.width, target.height) * 0.45;
      return dx * dx + dy * dy < combined * combined;
    }

    return (
      Math.abs(hitbox.x - target.x) < hitbox.width / 2 + target.width / 2 &&
      Math.abs(hitbox.y - target.y) < hitbox.height / 2 + target.height / 2
    );
  }

  function intersectsProjectile(projectile, target) {
    return (
      Math.abs(projectile.x - target.x) < projectile.radius + target.width / 2 &&
      Math.abs(projectile.y - target.y) < projectile.radius + target.height / 2
    );
  }

  function intersectsHitboxProjectile(hitbox, projectile) {
    if (hitbox.isAerialSweep) {
      const sweepGeometry = getAerialSweepGeometry(hitbox);
      return (
        pointToSegmentDistance(projectile.x, projectile.y, sweepGeometry.innerX, sweepGeometry.innerY, sweepGeometry.outerX, sweepGeometry.outerY) <
        projectile.radius + hitbox.sweepThickness / 2
      );
    }

    if (hitbox.shape === "circle") {
      const dx = hitbox.x - projectile.x;
      const dy = hitbox.y - projectile.y;
      const combined = hitbox.radius + projectile.radius;
      return dx * dx + dy * dy < combined * combined;
    }

    const closestX = Math.max(hitbox.x - hitbox.width / 2, Math.min(projectile.x, hitbox.x + hitbox.width / 2));
    const closestY = Math.max(hitbox.y - hitbox.height / 2, Math.min(projectile.y, hitbox.y + hitbox.height / 2));
    const dx = projectile.x - closestX;
    const dy = projectile.y - closestY;
    return dx * dx + dy * dy < projectile.radius * projectile.radius;
  }

  function calculateKnockbackScale(battle, target) {
    const accumulatedDamage = Math.max(0, target.damage);

    if (battle.config.rule === "hp") {
      const ratio = accumulatedDamage / 125;
      return Math.min(3.2, 1.02 + ratio * 0.5 + ratio * ratio * 0.12);
    }

    const ratio = accumulatedDamage / 120;
    return Math.min(3.6, 1.0 + ratio * 0.66 + ratio * ratio * 0.16);
  }

  function getHitboxLifetime(hitbox) {
    const baseLife = hitbox.life || 0.12;
    if (hitbox.isAerialSweep) {
      return baseLife / Math.max(0.01, hitbox.sweepSpeed || 1);
    }
    return baseLife;
  }

  function localAngleToWorld(angle, dir) {
    return dir === -1 ? Math.PI - angle : angle;
  }

  function getAerialSweepGeometry(hitbox) {
    const progress = Math.min(1, Math.max(0, hitbox.age / Math.max(getHitboxLifetime(hitbox), 0.001)));
    const localAngle = hitbox.sweepStart + (hitbox.sweepEnd - hitbox.sweepStart) * progress;
    const angle = localAngleToWorld(localAngle, hitbox.dir);
    const innerX = hitbox.x + Math.cos(angle) * hitbox.sweepInnerRadius;
    const innerY = hitbox.y + Math.sin(angle) * hitbox.sweepInnerRadius;
    const outerX = hitbox.x + Math.cos(angle) * hitbox.sweepRadius;
    const outerY = hitbox.y + Math.sin(angle) * hitbox.sweepRadius;
    return { angle, progress, innerX, innerY, outerX, outerY };
  }

  function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
      return Math.hypot(px - x1, py - y1);
    }

    const projection = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    const t = Math.max(0, Math.min(1, projection));
    const closestX = x1 + dx * t;
    const closestY = y1 + dy * t;
    return Math.hypot(px - closestX, py - closestY);
  }

  function calculateHitstunDuration(target, source) {
    const baseHitstun = 19 / 60;
    const sourceBonus = Math.min(0.085, source.damage * 0.0055);
    const accumulatedBonus = Math.min(0.09, Math.max(0, target.damage) * 0.0008);
    const moveBonus = source.hitstunBonus || 0;
    return Math.min(0.72, baseHitstun + sourceBonus + accumulatedBonus + moveBonus);
  }

  function clearComboState(player) {
    player.comboSourceId = null;
    player.comboHits = 0;
    player.comboDamageTotal = 0;
    player.comboDisplayTimer = 0;
  }

  function registerComboHit(attacker, target, source) {
    if (!attacker) {
      clearComboState(target);
      return;
    }

    const isCombo = target.hitstun > 0 && target.comboSourceId === attacker.id;
    target.comboSourceId = attacker.id;
    target.comboHits = isCombo ? target.comboHits + 1 : 1;
    target.comboDamageTotal = isCombo ? target.comboDamageTotal + source.damage : source.damage;
    target.comboDisplayTimer = target.comboHits >= 2 ? 0.95 : 0.45;
  }

  function applyImpact(battle, attacker, target, source) {
    if (!target.alive || target.invincible > 0) {
      return;
    }

    if (target.grabTargetId || target.grabbedById) {
      releaseGrabState(battle, target);
    }

    const shieldDrain = source.damage * 1.7;
    if (target.shieldActive && target.shieldEnergy > 0) {
      target.shieldEnergy = Math.max(0, target.shieldEnergy - shieldDrain);
      target.hitFlash = 0.1;
      target.vx = source.dir * 125;
      target.vy = -55;
      if (target.shieldEnergy === 0) {
        target.invincible = 0.2;
        target.vx = source.dir * 240;
        target.vy = -160;
      }
      return;
    }

    target.hitFlash = 0.18;
    target.invincible = 0.04;
    if (target.controlType === "cpu") {
      clearCpuComboRoute(target);
    }

    if (battle.config.rule === "hp") {
      target.hp = Math.max(0, target.hp - source.damage);
      target.damage = Math.min(999, (target.maxHp - target.hp) * 0.9);
    } else {
      target.damage = Math.min(999, target.damage + source.damage);
    }

    registerComboHit(attacker, target, source);
    registerCpuComboRouteHit(attacker, target, source);
    target.hitstun = calculateHitstunDuration(target, source);
    target.shieldActive = false;
    if (source.meteor) {
      target.meteorSlamActive = true;
      target.meteorMinFallSpeed = source.meteorMinFallSpeed || 0;
      target.meteorImpactHitstun = source.meteorImpactHitstun || 0.22;
    } else {
      clearMeteorState(target);
    }

    const knockbackScale = calculateKnockbackScale(battle, target);
    const extraLift = source.forceY <= 0 ? Math.min(0.28, target.damage / 420) : 0;

    target.vx = source.forceX * knockbackScale;
    target.vy = source.forceY * (knockbackScale + extraLift);
    if (source.meteor) {
      target.vy = Math.max(target.vy, source.meteorMinFallSpeed || 0);
    }

    if (battle.config.rule === "hp" && target.hp <= 0) {
      registerKo(battle, attacker, target, "hp");
    }
  }

  function registerKo(battle, attacker, victim, reason, koMeta) {
    if (!victim.alive || battle.ended) {
      return;
    }

    if (victim.grabTargetId || victim.grabbedById) {
      releaseGrabState(battle, victim);
    }

    if (reason === "ring-out" && koMeta) {
      spawnKoEffect(battle, koMeta);
    }

    victim.alive = false;
    victim.respawnTimer = 1.2;
    victim.vx = 0;
    victim.vy = 0;
    victim.x = -9999;
    victim.y = -9999;
    victim.shieldActive = false;
    victim.hitstun = 0;
    clearMeteorState(victim);
    clearComboState(victim);

    if (battle.config.rule === "hp") {
      battle.winner = attacker ? attacker.name : "Draw";
      battle.winnerId = attacker ? attacker.id : null;
      battle.endReason = reason === "hp" ? "HP depleted" : "Ring out";
      finishBattle(battle);
      return;
    }

    if (battle.config.rule === "life") {
      victim.lives -= 1;
      if (victim.lives <= 0) {
        battle.winner = attacker ? attacker.name : "Draw";
        battle.winnerId = attacker ? attacker.id : null;
        battle.endReason = "All stocks lost";
        finishBattle(battle);
      }
      return;
    }

    if (battle.config.rule === "time" || battle.config.rule === "practice") {
      if (attacker) {
        attacker.score += 1;
      }
    }
  }

  function spawnKoEffect(battle, meta) {
    battle.koEffects.push({
      side: meta.side,
      x: meta.x,
      y: meta.y,
      width: meta.width,
      height: meta.height,
      age: 0,
      duration: 0.42
    });
  }

  function updateKoEffects(battle, delta) {
    if (!battle.koEffects.length) {
      return;
    }

    for (let index = battle.koEffects.length - 1; index >= 0; index -= 1) {
      battle.koEffects[index].age += delta;
      if (battle.koEffects[index].age >= battle.koEffects[index].duration) {
        battle.koEffects.splice(index, 1);
      }
    }
  }

  function respawnPlayer(battle, player) {
    if (battle.ended) {
      return;
    }

    if (battle.config.rule === "life" && player.lives <= 0) {
      return;
    }

    if (player.grabTargetId || player.grabbedById) {
      releaseGrabState(battle, player);
    }

    const rect = activeCanvas.getBoundingClientRect();
    player.alive = true;
    player.damage = 0;
    player.hp = player.maxHp;
    player.invincible = 1.2;
    player.hitstun = 0;
    player.attackCooldown = 0.25;
    player.shieldEnergy = 100;
    player.onGround = false;
    player.jumpsRemaining = player.maxJumps;
    clearMeteorState(player);
    clearComboState(player);
    player.currentPlatform = null;
    player.platformDropTimer = 0;
    player.jumpHeld = false;
    player.fallHeld = false;
    player.x = player.id === "p1" ? rect.width * 0.42 : rect.width * 0.62;
    player.y = 160;
    player.prevY = 160;
    player.vx = 0;
    player.vy = 0;
    player.aiMoveTimer = 0.25 + Math.random() * 0.45;
    player.aiAttackTimer = 0.55 + Math.random() * 0.6;
    player.aiSpecialTimer = 1.2 + Math.random() * 1.4;
    player.aiJumpTimer = 0.7 + Math.random() * 0.9;
    clearCpuComboRoute(player);
  }

  function endBattleByTime(battle) {
    const [player, dummy] = battle.players;

    if (battle.config.rule === "life") {
      if (player.lives === dummy.lives) {
        if (player.damage === dummy.damage) {
          battle.winner = "Draw";
          battle.winnerId = null;
        } else {
          const winner = player.damage < dummy.damage ? player : dummy;
          battle.winner = winner.name;
          battle.winnerId = winner.id;
        }
      } else {
        const winner = player.lives > dummy.lives ? player : dummy;
        battle.winner = winner.name;
        battle.winnerId = winner.id;
      }
      battle.endReason = "Time up";
      finishBattle(battle);
      return;
    }

    if (battle.config.rule === "time") {
      if (player.score === dummy.score) {
        battle.winner = "Draw";
        battle.winnerId = null;
      } else {
        const winner = player.score > dummy.score ? player : dummy;
        battle.winner = winner.name;
        battle.winnerId = winner.id;
      }
      battle.endReason = "Time up";
      finishBattle(battle);
    }
  }

  function resolveBattleWinnerId(battle) {
    if (!battle) {
      return null;
    }

    if (battle.winnerId) {
      return battle.winnerId;
    }

    if (battle.winner === "Draw") {
      return null;
    }

    const winner = battle.players.find((player) => player.name === battle.winner);
    return winner ? winner.id : null;
  }

  function getBattleSideDisplayName(battle, playerId) {
    const player = battle && battle.players ? battle.players.find((candidate) => candidate.id === playerId) : null;
    if (!player) {
      return "";
    }

    if (battle.networkRole === "host") {
      return playerId === "p1" ? "You" : "Guest";
    }

    if (battle.networkRole === "client") {
      return playerId === "p1" ? "Host" : "You";
    }

    if (playerId === "p1") {
      return "You";
    }

    return player.controlType === "cpu" ? "CPU" : player.controlType === "dummy" ? "Dummy" : player.name;
  }

  function getBattleResultTitle(battle, winnerId) {
    if (!winnerId) {
      return "Draw";
    }

    const localWinnerId = battle.networkRole === "client" ? "p2" : "p1";
    return winnerId === localWinnerId ? "Victory" : "Defeat";
  }

  function renderBattleResultSlot(battle, playerId, winnerId) {
    const player = battle.players.find((candidate) => candidate.id === playerId);
    const info = player ? characterData[player.characterKey] : null;
    const label = getBattleSideDisplayName(battle, playerId);
    const isWinner = winnerId === playerId;
    return `
      <div class="result-slot ${isWinner ? "result-slot-winner" : ""}">
        <div class="result-slot-top">
          <div class="result-slot-label">${escapeHtml(label)}</div>
          ${isWinner ? '<div class="winner-crown" aria-hidden="true">&#9812;</div>' : ""}
        </div>
        <div class="result-slot-name">${info ? escapeHtml(info.label) : escapeHtml(player ? player.name : playerId)}</div>
      </div>
    `;
  }

  function setBattleOverlay(content) {
    const overlay = document.getElementById("battle-overlay");
    if (!overlay) {
      return;
    }
    overlay.hidden = false;
    overlay.innerHTML = content;
  }

  function hideBattleOverlay() {
    const overlay = document.getElementById("battle-overlay");
    if (!overlay) {
      return;
    }
    overlay.hidden = true;
    overlay.innerHTML = "";
  }

  function renderPracticePauseControls() {
    if (!state.battle || state.battle.config.rule !== "practice") {
      return "";
    }

    const currentScale = state.battle.timeScale || 1;
    const speedOptions = [
      { value: 1, label: "1x" },
      { value: 0.5, label: "0.5x" }
    ];

    const buttons = speedOptions
      .map((option) => {
        const selected = currentScale === option.value ? "selected" : "";
        return `<button class="option-chip ${selected}" data-action="set-practice-speed" data-value="${option.value}">${option.label}</button>`;
      })
      .join("");

    return `
      <div class="overlay-controls overlay-settings">
        <div class="controls-title">Practice Speed</div>
        <p class="small-note">Slow training down when you want easier combo and timing practice.</p>
        <div class="option-grid">${buttons}</div>
      </div>
    `;
  }

  function openPauseMenu() {
    if (!state.battle || state.battle.ended) {
      return;
    }

    if (state.battle.networkRole) {
      setBattleOverlay(`
        <div class="overlay-card">
          <h2 class="overlay-title">Online Match</h2>
          <p class="overlay-copy">Pause is disabled during internet matches so both players stay in sync.</p>
          <div class="overlay-actions">
            <button class="play-button" data-action="resume-battle">Resume</button>
            <button class="secondary-button" data-action="exit-battle-to-menu">Menu</button>
          </div>
        </div>
      `);
      state.battle.paused = true;
      return;
    }

    const cpuNote =
      state.battle.players[1].controlType === "cpu"
        ? "The CPU attacks while retreating in random patterns, but tries not to run off the stage on its own."
        : "The opponent is a stationary dummy. Air attacks now have their own move set for each class.";

    state.battle.paused = true;
    setBattleOverlay(`
      <div class="overlay-card">
        <h2 class="overlay-title">Paused</h2>
        <p class="overlay-copy">Match paused. Press Esc again or choose Resume to return to the fight.</p>
        <div class="overlay-controls">
          <div class="controls-title">Controls</div>
          <p class="controls-copy">
            Move: A / D<br>
            Dash: Shift<br>
            Jump: W or Space (press again for double jump)<br>
            Fall / Drop Through Platform: S<br>
            Grab / Throw: Q (hold W/A/S/D to aim the throw)<br>
            Dash Attack: Shift + A/D + Left Click<br>
            Ground and Air Attack: Left Click, or A/D/S/W + Left Click<br>
            Shield: Right Click<br>
            Special: Hold E and press A / S / D / W<br>
            Practice Rematch: R (Practice only)
          </p>
          <div class="small-note">${cpuNote}</div>
        </div>
        ${renderPracticePauseControls()}
        <div class="overlay-actions">
          <button class="play-button" data-action="resume-battle">Resume</button>
          <button class="secondary-button" data-action="rematch">Rematch</button>
          <button class="secondary-button" data-action="exit-battle-to-menu">Menu</button>
        </div>
      </div>
    `);
  }

  function toggleBattlePauseMenu() {
    if (!state.battle || state.battle.ended) {
      return;
    }

    if (state.battle.paused) {
      hideBattleOverlay();
      state.battle.paused = false;
      return;
    }

    openPauseMenu();
  }

  function finishBattle(battle) {
    battle.ended = true;
    battle.paused = true;
    const winnerId = resolveBattleWinnerId(battle);
    const resultTitle = getBattleResultTitle(battle, winnerId);
    const winnerLabel = winnerId ? getBattleSideDisplayName(battle, winnerId) : "Nobody";
    const guestRematchPending = Boolean(state.onlineSession && state.onlineSession.role === "guest" && state.onlineSession.rematchRequested);
    const rematchButton =
      battle.networkRole === "client"
        ? `<button class="play-button" data-action="rematch"${guestRematchPending ? " disabled" : ""}>${guestRematchPending ? "Rematch Requested" : "Rematch"}</button>`
        : `<button class="play-button" data-action="rematch"${state.onlineBusy ? " disabled" : ""}>Rematch</button>`;
    setBattleOverlay(`
      <div class="overlay-card">
        <h2 class="overlay-title">${escapeHtml(resultTitle)}</h2>
        <div class="result-summary">
          ${renderBattleResultSlot(battle, "p1", winnerId)}
          ${renderBattleResultSlot(battle, "p2", winnerId)}
        </div>
        <p class="overlay-copy">${winnerId ? `${escapeHtml(winnerLabel)} takes the game. ${escapeHtml(battle.endReason)}` : escapeHtml(battle.endReason)}</p>
        <div class="overlay-actions">
          ${rematchButton}
          <button class="secondary-button" data-action="exit-battle-to-menu">Menu</button>
        </div>
      </div>
    `);
  }

  function updateHud(battle) {
    const [player, dummy] = battle.players;
    const p1Name = document.getElementById("p1-name");
    const p1Main = document.getElementById("p1-main");
    const p1Sub = document.getElementById("p1-sub");
    const p2Name = document.getElementById("p2-name");
    const p2Main = document.getElementById("p2-main");
    const p2Sub = document.getElementById("p2-sub");
    const clock = document.getElementById("battle-clock");
    const comboBanner = document.getElementById("battle-combo-banner");

    if (!p1Main || !p2Main || !clock) {
      return;
    }

    if (p1Name) {
      p1Name.textContent = `${characterData[player.characterKey].label}${battle.networkRole === "client" ? " Host" : ""}`;
    }
    if (p2Name) {
      const p2Suffix =
        battle.networkRole === "host" ? "Guest" : battle.networkRole === "client" ? "You" : dummy.controlType === "cpu" ? "CPU" : "Dummy";
      p2Name.textContent = `${characterData[dummy.characterKey].label} ${p2Suffix}`;
    }

    const p2ShieldLabel =
      battle.networkRole === "host" ? "Guest" : battle.networkRole === "client" ? "You" : dummy.controlType === "cpu" ? "CPU" : "Dummy";
    const p2ScoreLabel =
      battle.networkRole === "host" ? "Guest Score" : battle.networkRole === "client" ? "Score" : dummy.controlType === "cpu" ? "Score" : "Dummy";
    const p2LifeLabel =
      battle.networkRole === "host" ? "Guest Life" : battle.networkRole === "client" ? "Life" : dummy.controlType === "cpu" ? "Life" : "Dummy";

    if (battle.config.rule === "hp") {
      p1Main.textContent = `${Math.round(Math.max(0, player.hp))}%`;
      p2Main.textContent = `${Math.round(Math.max(0, dummy.hp))}%`;
      p1Sub.textContent = `${characterData[player.characterKey].label} | Shield ${Math.round(player.shieldEnergy)}`;
      p2Sub.textContent = `${characterData[dummy.characterKey].label} | ${p2ShieldLabel} | Shield ${Math.round(dummy.shieldEnergy)}`;
    } else if (battle.config.rule === "time" || battle.config.rule === "practice") {
      p1Main.textContent = `${Math.round(player.damage)}%`;
      p2Main.textContent = `${Math.round(dummy.damage)}%`;
      p1Sub.textContent = `${characterData[player.characterKey].label} | Score ${player.score} | Shield ${Math.round(player.shieldEnergy)}`;
      p2Sub.textContent = `${characterData[dummy.characterKey].label} | ${p2ScoreLabel} ${battle.networkRole || dummy.controlType === "cpu" ? dummy.score : ""} | Shield ${Math.round(dummy.shieldEnergy)}`.replace("  |", " |");
    } else {
      p1Main.textContent = `${Math.round(player.damage)}%`;
      p2Main.textContent = `${Math.round(dummy.damage)}%`;
      p1Sub.textContent = `${characterData[player.characterKey].label} | Life ${Math.max(0, player.lives)} | Shield ${Math.round(player.shieldEnergy)}`;
      p2Sub.textContent = `${characterData[dummy.characterKey].label} | ${p2LifeLabel} ${battle.networkRole || dummy.controlType === "cpu" ? Math.max(0, dummy.lives) : ""} | Shield ${Math.round(dummy.shieldEnergy)}`.replace("  |", " |");
    }

    clock.textContent = formatBattleClock(battle);

    if (comboBanner) {
      const comboEntries = battle.players
        .filter((target) => target.comboHits >= 2 && target.comboDisplayTimer > 0 && target.comboSourceId)
        .map((target) => {
          const attacker = battle.players.find((candidate) => candidate.id === target.comboSourceId);
          if (!attacker) {
            return "";
          }
          const attackerLabel = attacker.id === "p1" ? "P1" : attacker.name;
          const targetLabel = target.id === "p1" ? "P1" : target.name;
          return `
            <div class="combo-pill ${attacker.id === "p1" ? "combo-pill-left" : "combo-pill-right"}">
              <div class="combo-pill-label">${escapeHtml(attackerLabel)} Combo</div>
              <div class="combo-pill-value">${target.comboHits} Hits</div>
              <div class="combo-pill-target">on ${escapeHtml(targetLabel)}</div>
            </div>
          `;
        })
        .filter(Boolean)
        .join("");

      comboBanner.hidden = comboEntries === "";
      comboBanner.innerHTML = comboEntries;
    }
  }

  function formatBattleClock(battle) {
    if (battle.config.timeLimit === null || battle.timeRemaining === null) {
      return "INF";
    }

    const totalSeconds = Math.ceil(battle.timeRemaining);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(1, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function drawBattle(battle) {
    if (!activeCanvas) {
      return;
    }

    const ctx = activeCanvas.getContext("2d");
    const rect = activeCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#b8e7ff");
    sky.addColorStop(0.4, "#d7f3ff");
    sky.addColorStop(1, "#fff4c9");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    drawArenaBackground(ctx, width, height);
    drawStage(ctx, battle.stage, width);
    battle.hitboxes.forEach((hitbox) => drawHitbox(ctx, hitbox));
    battle.projectiles.forEach((projectile) => drawProjectile(ctx, projectile));
    battle.players.forEach((player) => drawPlayer(ctx, player, battle));
    battle.koEffects.forEach((effect) => drawKoEffect(ctx, effect, width, height));
  }

  function drawArenaBackground(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.beginPath();
    ctx.arc(width * 0.18, height * 0.18, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width * 0.84, height * 0.22, 175, 0, Math.PI * 2);
    ctx.fill();

    const sunGlow = ctx.createRadialGradient(width * 0.52, height * 0.2, 26, width * 0.52, height * 0.2, 260);
    sunGlow.addColorStop(0, "rgba(255, 251, 216, 0.98)");
    sunGlow.addColorStop(0.34, "rgba(255, 245, 187, 0.55)");
    sunGlow.addColorStop(1, "rgba(255, 245, 187, 0)");
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(width * 0.52, height * 0.2, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    drawCloud(ctx, width * 0.24, height * 0.28, 0.9);
    drawCloud(ctx, width * 0.68, height * 0.16, 1.1);
    drawCloud(ctx, width * 0.78, height * 0.34, 0.75);
    ctx.restore();

    for (let index = 0; index < 6; index += 1) {
      const x = width * (0.1 + index * 0.15);
      ctx.fillStyle = `rgba(126, 164, 201, ${0.12 + index * 0.018})`;
      ctx.fillRect(x, height * 0.58 - index * 10, 44, height * 0.42 + index * 16);
    }
  }

  function drawStage(ctx, stage, width) {
    ctx.save();
    if (stage.key === "air-dome") {
      const height = ctx.canvas.height;
      const streamXs = [width * 0.2, width * 0.5, width * 0.8];

      ctx.fillStyle = "rgba(198, 245, 255, 0.08)";
      ctx.fillRect(0, height * 0.82, width, height * 0.18);

      streamXs.forEach((streamX, index) => {
        const beam = ctx.createLinearGradient(streamX, height, streamX, 0);
        beam.addColorStop(0, "rgba(188, 244, 255, 0.34)");
        beam.addColorStop(0.3, "rgba(176, 236, 255, 0.18)");
        beam.addColorStop(1, "rgba(176, 236, 255, 0)");
        ctx.fillStyle = beam;
        roundRect(ctx, streamX - 34, height * 0.16, 68, height * 0.84, 28, true);

        ctx.strokeStyle = "rgba(240, 252, 255, 0.42)";
        ctx.lineWidth = 3;
        for (let sweep = 0; sweep < 4; sweep += 1) {
          const y = height * (0.88 - sweep * 0.18) - index * 8;
          ctx.beginPath();
          ctx.moveTo(streamX - 22, y);
          ctx.quadraticCurveTo(streamX, y - 18, streamX + 20, y - 42);
          ctx.stroke();
        }
      });

      ctx.fillStyle = "rgba(233, 250, 255, 0.94)";
      ctx.shadowColor = "rgba(220, 247, 255, 0.75)";
      ctx.shadowBlur = 18;
      roundRect(ctx, width * 0.08, stage.wallTop - 8, width * 0.84, 12, 10, true);
      ctx.shadowBlur = 0;

      ctx.restore();
      return;
    }

    const floor = ctx.createLinearGradient(0, stage.groundY, 0, stage.groundY + 120);
    if (stage.key === "wall-chamber") {
      floor.addColorStop(0, "rgba(115, 110, 124, 0.96)");
      floor.addColorStop(1, "rgba(58, 57, 68, 0.98)");
    } else {
      floor.addColorStop(0, "rgba(117, 136, 158, 0.92)");
      floor.addColorStop(1, "rgba(78, 92, 112, 0.96)");
    }
    ctx.fillStyle = floor;
    ctx.shadowColor = "rgba(0,0,0,0.24)";
    ctx.shadowBlur = 28;
    ctx.fillRect(0, stage.groundY, width, 120);
    ctx.shadowBlur = 0;

    stage.walls.forEach((wall) => {
      const gradient = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.width, wall.y);
      gradient.addColorStop(0, "#5d6476");
      gradient.addColorStop(0.5, "#838ca4");
      gradient.addColorStop(1, "#53596b");
      ctx.fillStyle = gradient;
      roundRect(ctx, wall.x, wall.y, wall.width, wall.height, 14, true);
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      roundRect(ctx, wall.x, wall.y, wall.width, wall.height, 14, false, true);
    });

    stage.platforms.forEach((platform) => {
      const gradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
      gradient.addColorStop(0, "#f9fbff");
      gradient.addColorStop(1, "#9fabc2");
      ctx.fillStyle = gradient;
      roundRect(ctx, platform.x, platform.y, platform.width, platform.height, 9, true);
      ctx.strokeStyle = "rgba(8, 11, 18, 0.22)";
      ctx.lineWidth = 2;
      roundRect(ctx, platform.x, platform.y, platform.width, platform.height, 9, false, true);
    });

    ctx.restore();
  }

  function drawCloud(ctx, x, y, scale) {
    ctx.beginPath();
    ctx.arc(x - 28 * scale, y + 6 * scale, 20 * scale, 0, Math.PI * 2);
    ctx.arc(x, y, 28 * scale, 0, Math.PI * 2);
    ctx.arc(x + 30 * scale, y + 6 * scale, 22 * scale, 0, Math.PI * 2);
    ctx.arc(x + 6 * scale, y + 12 * scale, 30 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHitbox(ctx, hitbox) {
    const lifeRatio = 1 - hitbox.age / Math.max(getHitboxLifetime(hitbox), 0.001);
    if (lifeRatio <= 0) {
      return;
    }

    if (hitbox.isAerialSweep) {
      drawAerialSweepHitbox(ctx, hitbox, lifeRatio);
      return;
    }

    if (hitbox.isAerialSpin) {
      drawAerialSpinHitbox(ctx, hitbox, lifeRatio);
      return;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0.12, lifeRatio * 0.45);
    ctx.fillStyle = hitbox.color;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.shadowColor = hitbox.color;
    ctx.shadowBlur = hitbox.isBurst ? 26 : 18;
    roundRect(
      ctx,
      hitbox.x - hitbox.width / 2,
      hitbox.y - hitbox.height / 2,
      hitbox.width,
      hitbox.height,
      hitbox.isBurst ? 18 : 14,
      true,
      true
    );
    ctx.restore();
  }

  function drawAerialSpinHitbox(ctx, hitbox, lifeRatio) {
    const sweep = hitbox.spinStart + (1 - lifeRatio) * Math.PI * 2;
    const swordX = hitbox.x + Math.cos(sweep) * hitbox.ringRadius;
    const swordY = hitbox.y + Math.sin(sweep) * hitbox.ringRadius;

    ctx.save();
    ctx.globalAlpha = Math.max(0.18, lifeRatio * 0.55);
    ctx.strokeStyle = hitbox.color;
    ctx.fillStyle = `${hitbox.color}cc`;
    ctx.lineWidth = 3;
    ctx.shadowColor = hitbox.color;
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(hitbox.x, hitbox.y, hitbox.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(swordX, swordY);
    ctx.rotate(sweep + Math.PI / 2);
    roundRect(ctx, -4, -hitbox.swordLength / 2, 8, hitbox.swordLength, 4, true);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, -10, hitbox.swordLength / 2 - 12, 20, 6, 3, true);
    ctx.restore();

    ctx.restore();
  }

  function drawAerialSweepHitbox(ctx, hitbox, lifeRatio) {
    const sweepGeometry = getAerialSweepGeometry(hitbox);
    const trailSteps = 4;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = hitbox.color;
    ctx.shadowColor = hitbox.color;
    ctx.shadowBlur = 20;

    for (let index = trailSteps; index >= 0; index -= 1) {
      const ratio = Math.max(0, sweepGeometry.progress - index * 0.12);
      const localAngle = hitbox.sweepStart + (hitbox.sweepEnd - hitbox.sweepStart) * ratio;
      const angle = localAngleToWorld(localAngle, hitbox.dir);
      const innerX = hitbox.x + Math.cos(angle) * hitbox.sweepInnerRadius;
      const innerY = hitbox.y + Math.sin(angle) * hitbox.sweepInnerRadius;
      const outerX = hitbox.x + Math.cos(angle) * hitbox.sweepRadius;
      const outerY = hitbox.y + Math.sin(angle) * hitbox.sweepRadius;

      ctx.globalAlpha = Math.max(0.08, lifeRatio * (0.12 + index * 0.08));
      ctx.lineWidth = Math.max(6, hitbox.sweepThickness - index * 3);
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }

    ctx.globalAlpha = Math.max(0.28, lifeRatio * 0.88);
    ctx.lineWidth = Math.max(8, hitbox.sweepThickness * 0.42);
    ctx.beginPath();
    ctx.moveTo(sweepGeometry.innerX, sweepGeometry.innerY);
    ctx.lineTo(sweepGeometry.outerX, sweepGeometry.outerY);
    ctx.stroke();

    ctx.save();
    ctx.translate(sweepGeometry.outerX, sweepGeometry.outerY);
    ctx.rotate(sweepGeometry.angle + Math.PI / 2);
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    roundRect(ctx, -5, -hitbox.swordLength / 2, 10, hitbox.swordLength, 4, true);
    roundRect(ctx, -12, hitbox.swordLength / 2 - 12, 24, 6, 3, true);
    ctx.restore();

    ctx.restore();
  }

  function drawProjectile(ctx, projectile) {
    ctx.save();
    ctx.fillStyle = projectile.color;
    ctx.shadowColor = projectile.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawKoEffect(ctx, effect, width, height) {
    const progress = effect.age / effect.duration;
    const fade = 1 - progress;
    const lineLength = 210 + progress * 90;
    const spread = 24 + progress * 16;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * fade})`;
    ctx.shadowColor = `rgba(255,255,255,${0.95 * fade})`;
    ctx.shadowBlur = 26;
    ctx.lineCap = "round";

    if (effect.side === "left" || effect.side === "right") {
      const edgeX = effect.side === "left" ? 0 : width;
      const inward = effect.side === "left" ? 1 : -1;
      for (let index = -2; index <= 2; index += 1) {
        ctx.lineWidth = index === 0 ? 9 : 4;
        ctx.beginPath();
        ctx.moveTo(edgeX, effect.y + index * spread);
        ctx.lineTo(edgeX + inward * lineLength, effect.y + index * spread * 0.34);
        ctx.stroke();
      }
    } else {
      const edgeY = effect.side === "top" ? 0 : height;
      const inward = effect.side === "top" ? 1 : -1;
      for (let index = -2; index <= 2; index += 1) {
        ctx.lineWidth = index === 0 ? 9 : 4;
        ctx.beginPath();
        ctx.moveTo(effect.x + index * spread, edgeY);
        ctx.lineTo(effect.x + index * spread * 0.34, edgeY + inward * lineLength);
        ctx.stroke();
      }
    }

    ctx.fillStyle = `rgba(255,255,255,${0.8 * fade})`;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 14 + progress * 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function getBattlePlayerMarker(player, battle) {
    if (!player || !battle) {
      return null;
    }

    if (player.id === "p1") {
      return { label: "P1", fill: "#d52f2f", stroke: "#6f1717", textColor: "#ffffff" };
    }

    if (player.controlType === "cpu") {
      return { label: "CPU", fill: "#737985", stroke: "#373d48", textColor: "#ffffff" };
    }

    if (player.controlType === "dummy") {
      return { label: "DUMMY", fill: "#7e7e7e", stroke: "#464646", textColor: "#ffffff" };
    }

    if (battle.networkRole) {
      return { label: "P2", fill: "#3f73d9", stroke: "#1f3b73", textColor: "#ffffff" };
    }

    return { label: "P2", fill: "#3f73d9", stroke: "#1f3b73", textColor: "#ffffff" };
  }

  function drawPlayer(ctx, player, battle) {
    if (!player.alive) {
      return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.hitFlash > 0) {
      ctx.shadowColor = "rgba(255,255,255,0.72)";
      ctx.shadowBlur = 18;
    }

    if (player.shieldActive && player.shieldEnergy > 0) {
      ctx.fillStyle = "rgba(120, 195, 255, 0.18)";
      ctx.strokeStyle = "rgba(170, 230, 255, 0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -6, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = player.invincible > 0 ? "rgba(255,255,255,0.72)" : player.colors.body;
    roundRect(ctx, -player.width / 2, -player.height / 2 + 10, player.width, player.height - 10, 14, true);
    ctx.beginPath();
    ctx.arc(0, -24, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = player.colors.trim;
    ctx.fillRect(player.direction === 1 ? 4 : -12, -28, 6, 6);
    ctx.fillRect(-12, 0, 8, 34);
    ctx.fillRect(4, 0, 8, 34);

    drawWeapon(ctx, player);

    const playerMarker = getBattlePlayerMarker(player, battle);
    if (playerMarker) {
      const markerWidth = playerMarker.label.length >= 5 ? 76 : 56;
      const markerY = -150;
      ctx.fillStyle = playerMarker.fill;
      ctx.strokeStyle = playerMarker.stroke;
      ctx.lineWidth = 3;
      roundRect(ctx, -markerWidth / 2, markerY, markerWidth, 24, 12, true, true);
      ctx.fillStyle = playerMarker.textColor;
      ctx.font = '900 13px "Bahnschrift", "Yu Gothic UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(playerMarker.label, 0, markerY + 16);
    }

    if (player.moveLabelTimer > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.64)";
      ctx.fillRect(-68, -98, 136, 24);
      ctx.fillStyle = "white";
      ctx.font = '700 12px "Bahnschrift", "Yu Gothic UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(player.moveLabel, 0, -81);
    }

    if (player.comboHits >= 2 && player.comboDisplayTimer > 0) {
      const comboAlpha = Math.min(1, 0.35 + player.comboDisplayTimer);
      const comboY = player.moveLabelTimer > 0 ? -122 : -96;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.56 * comboAlpha})`;
      ctx.fillRect(-58, comboY - 14, 116, 28);
      ctx.fillStyle = `rgba(255, 245, 214, ${0.96 * comboAlpha})`;
      ctx.font = '900 15px "Bahnschrift", "Yu Gothic UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(`${player.comboHits} Combo`, 0, comboY + 4);
    }

    ctx.restore();
  }

  function drawWeapon(ctx, player) {
    const pulse = player.actionPulse > 0 ? 1 + player.actionPulse * 1.8 : 1;
    ctx.fillStyle = player.colors.weapon;
    ctx.strokeStyle = player.colors.weapon;
    ctx.lineWidth = 5;

    if (player.characterKey === "fighter") {
      const punchX = player.direction === 1 ? 26 : -34;
      roundRect(ctx, punchX, -6, 20 * pulse, 12, 6, true);
      return;
    }

    if (player.characterKey === "swordsman") {
      ctx.beginPath();
      ctx.moveTo(player.direction === 1 ? 16 : -16, -10);
      ctx.lineTo(player.direction === 1 ? 58 * pulse : -58 * pulse, -28);
      ctx.stroke();
      return;
    }

    roundRect(ctx, player.direction === 1 ? 18 : -42, -14, 28, 14, 6, true);
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }

  function stopBattleLoop() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    activeCanvas = null;
  }

  function setScreen(screen) {
    if (screen !== "online-room" && screen !== "online-join") {
      clearOnlineLobbyTimer();
    }
    state.screen = screen;
    render();
  }

  function parseOptionValue(value) {
    return value === "infinite" ? "infinite" : Number(value);
  }

  function handleAction(action, button) {
    if (action === "start-menu") {
      setScreen("mode-select");
      return;
    }

    if (action === "open-rule-select") {
      state.matchMode = "local";
      setScreen("rule-select");
      return;
    }

    if (action === "open-online-menu") {
      state.onlineBusy = false;
      state.onlineError = "";
      state.onlineNotice = "";
      setScreen("online-menu");
      refreshPublicShareUrl();
      return;
    }

    if (action === "set-online-api-base") {
      promptForApiBaseUrl();
      return;
    }

    if (action === "reset-online-api-base") {
      setApiBaseUrl("");
      state.onlineError = "";
      state.onlineNotice = "Online server reset to same-origin mode";
      refreshPublicShareUrl();
      render();
      return;
    }

    if (action === "open-online-host") {
      resetOnlineSession(false);
      state.matchMode = "online-host";
      setScreen("rule-select");
      refreshPublicShareUrl();
      return;
    }

    if (action === "open-online-join") {
      resetOnlineSession(false);
      state.matchMode = "local";
      setScreen("online-join");
      return;
    }

    if (action === "back-to-online-menu") {
      state.onlineBusy = false;
      state.onlineError = "";
      state.onlineNotice = "";
      setScreen("online-menu");
      return;
    }

    if (action === "copy-online-room-code") {
      copyOnlineRoomCode();
      return;
    }

    if (action === "go-mode-select") {
      state.matchMode = "local";
      if (!state.battle) {
        resetOnlineSession(true);
      }
      setScreen("mode-select");
      return;
    }

    if (action === "go-rule-select") {
      setScreen("rule-select");
      return;
    }

    if (action === "open-life") {
      setScreen("life-config");
      return;
    }

    if (action === "open-time") {
      setScreen("time-config");
      return;
    }

    if (action === "open-hp") {
      setScreen("hp-config");
      return;
    }

    if (action === "life-minus") {
      state.lifeCount = Math.max(1, state.lifeCount - 1);
      render();
      return;
    }

    if (action === "life-plus") {
      state.lifeCount = Math.min(99, state.lifeCount + 1);
      render();
      return;
    }

    if (action === "pick-life-time") {
      state.lifeTime = parseOptionValue(button.dataset.value);
      render();
      return;
    }

    if (action === "pick-time-limit") {
      state.timeLimit = Number(button.dataset.value);
      render();
      return;
    }

    if (action === "pick-hp") {
      state.hpValue = Number(button.dataset.value);
      render();
      return;
    }

    if (action === "prepare-life-match") {
      openStageSelect(buildBattleConfig("life"), "life-config");
      return;
    }

    if (action === "prepare-time-match") {
      openStageSelect(buildBattleConfig("time"), "time-config");
      return;
    }

    if (action === "prepare-hp-match") {
      openStageSelect(buildBattleConfig("hp"), "hp-config");
      return;
    }

    if (action === "open-practice") {
      setScreen("practice");
      return;
    }

    if (action === "prepare-practice-match") {
      openStageSelect(buildBattleConfig("practice"), "practice");
      return;
    }

    if (action === "open-photos") {
      setScreen("photos");
      return;
    }

    if (action === "open-gacha") {
      setScreen("gacha");
      return;
    }

    if (action === "draw-gacha") {
      state.gachaResult = gachaPool[Math.floor(Math.random() * gachaPool.length)];
      render();
      return;
    }

    if (action === "select-character") {
      if (!state.characterSelect) {
        return;
      }
      state.characterSelect.selections[button.dataset.slot] = button.dataset.character;
      render();
      return;
    }

    if (action === "select-online-character") {
      updateOnlineGuestCharacter(button.dataset.character);
      return;
    }

    if (action === "select-stage") {
      if (!state.stageSelect) {
        return;
      }
      state.stageSelect.selectedStage = button.dataset.stage;
      render();
      return;
    }

    if (action === "back-from-stage-select") {
      if (state.stageSelect) {
        const backScreen = state.stageSelect.backScreen;
        state.stageSelect = null;
        setScreen(backScreen);
      }
      return;
    }

    if (action === "confirm-stage-select") {
      if (!state.stageSelect) {
        return;
      }
      const stageKey = state.stageSelect.selectedStage || state.lastBattleStage;
      state.lastBattleStage = stageKey;
      openCharacterSelect({ ...state.stageSelect.config, stageKey }, "stage-select");
      return;
    }

    if (action === "back-from-character-select") {
      if (state.characterSelect) {
        const backScreen = state.characterSelect.backScreen;
        state.characterSelect = null;
        if (backScreen === "stage-select" && state.stageSelect) {
          state.screen = "stage-select";
          render();
        } else {
          setScreen(backScreen);
        }
      }
      return;
    }

    if (action === "start-configured-match") {
      keys.clear();
      mouseState.right = false;
      if (isOnlineHostFlow()) {
        createOnlineRoomFromConfiguredMatch();
      } else {
        startConfiguredMatch();
      }
      return;
    }

    if (action === "join-online-room") {
      joinOnlineRoom();
      return;
    }

    if (action === "leave-online-room") {
      resetOnlineSession(false);
      state.matchMode = "local";
      setScreen("online-menu");
      return;
    }

    if (action === "start-online-match") {
      startOnlineMatch();
      return;
    }

    if (action === "resume-battle") {
      if (state.battle) {
        hideBattleOverlay();
        state.battle.paused = false;
      }
      return;
    }

    if (action === "set-practice-speed") {
      if (state.battle && state.battle.config.rule === "practice") {
        const nextScale = Number(button.dataset.value);
        state.battle.timeScale = nextScale;
        state.battle.config.practiceTimeScale = nextScale;
        openPauseMenu();
      }
      return;
    }

    if (action === "exit-battle-to-menu") {
      keys.clear();
      mouseState.right = false;
      if (state.battle && state.battle.networkRole) {
        resetOnlineSession(true);
      }
      state.battle = null;
      state.characterSelect = null;
      state.matchMode = "local";
      setScreen("mode-select");
      return;
    }

    if (action === "rematch") {
      restartCurrentBattle();
    }
  }

  function restartCurrentBattle() {
    if (!state.battle) {
      return;
    }

    if (state.battle.networkRole === "host") {
      restartOnlineBattleAsHost();
      return;
    }

    if (state.battle.networkRole === "client") {
      requestOnlineGuestRematch();
      return;
    }

    keys.clear();
    mouseState.right = false;
    const battle = createBattle(state.battle.config, state.battle.selection);
    state.battle = battle;
    state.screen = "battle";
    render();
  }

  async function restartOnlineBattleAsHost() {
    const session = state.onlineSession;
    const battle = state.battle;
    if (!session || session.role !== "host" || !battle || state.onlineBusy) {
      return;
    }

    const lobby = session.lobby || buildLobbyPayload(battle.config, battle.selection);
    state.onlineBusy = true;
    state.onlineError = "";
    render();

    try {
      await requestJson("/api/online/start", {
        method: "POST",
        body: JSON.stringify({
          roomCode: session.roomCode,
          token: session.token,
          lobby
        })
      });

      session.lobby = lobby;
      session.started = true;
      session.rematchRequested = false;
      state.onlineBusy = false;
      keys.clear();
      mouseState.right = false;
      state.battle = createBattle(
        {
          ...lobby.config,
          onlineRole: "host",
          onlineRoomCode: session.roomCode,
          onlineToken: session.token
        },
        lobby.selection
      );
      state.screen = "battle";
      render();
    } catch (error) {
      state.onlineBusy = false;
      state.onlineError = error.message || "Failed to start rematch";
      render();
    }
  }

  async function requestOnlineGuestRematch() {
    const session = state.onlineSession;
    const battle = state.battle;
    if (!session || session.role !== "guest" || !battle || session.rematchRequested) {
      return;
    }

    session.rematchRequested = true;
    render();

    const success = await sendOnlineGuestCommand({ type: "rematch" });
    if (!success && state.onlineSession && state.onlineSession.token === session.token) {
      session.rematchRequested = false;
      render();
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) {
      if (state.screen === "title") {
        setScreen("mode-select");
      }
      return;
    }

    handleAction(target.dataset.action, target);
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!target || !target.dataset || target.dataset.action !== "online-join-code-input") {
      return;
    }

    state.onlineJoinCode = normalizeRoomCode(target.value);
    if (target.value !== state.onlineJoinCode) {
      target.value = state.onlineJoinCode;
    }
  });

  window.addEventListener("keydown", (event) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }

    if (event.code === "Escape") {
      event.preventDefault();
      if (state.screen === "battle" && state.battle && !state.battle.ended && !event.repeat) {
        if (state.battle.networkRole) {
          return;
        }
        toggleBattlePauseMenu();
      }
      return;
    }

    keys.add(event.code);
    if (isOnlineGuestBattle()) {
      syncGuestInputStateFromLocalControls();
    }

    if (state.screen === "battle" && state.battle && !state.battle.paused && !state.battle.ended && !event.repeat) {
      if (isOnlineGuestBattle()) {
        if (event.code === "KeyQ") {
          event.preventDefault();
          sendOnlineGuestCommand({ type: "grab" });
          return;
        }

        const onlineSpecialMove = resolveSpecialMoveKey(getLocalInputState(), true);
        if (onlineSpecialMove) {
          sendOnlineGuestCommand({ type: "special", moveKey: onlineSpecialMove });
          return;
        }
      }

      if (event.code === "KeyR" && state.battle.config.rule === "practice") {
        event.preventDefault();
        restartCurrentBattle();
        return;
      }

      if (event.code === "KeyQ") {
        event.preventDefault();
        triggerHumanGrabOrThrow();
        return;
      }

      const specialMove = resolveSpecialMoveKey();
      if (specialMove) {
        triggerHumanMove(specialMove);
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
    if (isOnlineGuestBattle()) {
      syncGuestInputStateFromLocalControls();
    }
  });

  window.addEventListener("mousedown", (event) => {
    if (state.screen !== "battle" || !state.battle || state.battle.paused || state.battle.ended || !activeCanvas) {
      return;
    }
    if (event.target.closest && event.target.closest("[data-action]")) {
      return;
    }

    if (event.button === 0) {
      event.preventDefault();
      if (isOnlineGuestBattle()) {
        sendOnlineGuestCommand({ type: "attack" });
      } else {
        triggerHumanMove(resolveAttackMoveKey(state.battle.players[0]));
      }
    }

    if (event.button === 2) {
      event.preventDefault();
      mouseState.right = true;
      if (isOnlineGuestBattle()) {
        syncGuestInputStateFromLocalControls();
      }
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 2) {
      mouseState.right = false;
      if (isOnlineGuestBattle()) {
        syncGuestInputStateFromLocalControls();
      }
    }
  });

  window.addEventListener("contextmenu", (event) => {
    if (state.screen === "battle") {
      event.preventDefault();
    }
  });

  window.addEventListener("blur", () => {
    keys.clear();
    mouseState.right = false;
    if (isOnlineGuestBattle()) {
      syncGuestInputStateFromLocalControls();
    }
  });

  window.addEventListener("resize", resizeHandler);

  render();
})();
