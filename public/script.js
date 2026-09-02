const $ = (id) => document.getElementById(id);

// ---------- In-page toast + confirm (no browser popups) ----------
function toast(text, type = "success") {
  const container = $("toastContainer");
  if (!container) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = text;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

function confirmDialog(message) {
  return new Promise((resolve) => {
    const modal = $("confirmModal");
    const msgEl = $("confirmMessage");
    const okBtn = $("confirmOk");
    const cancelBtn = $("confirmCancel");
    if (!modal || !msgEl || !okBtn || !cancelBtn) {
      resolve(confirm(message));
      return;
    }
    msgEl.textContent = message;
    modal.classList.remove("hidden");
    okBtn.disabled = false;
    cancelBtn.disabled = false;

    const cleanup = (result) => {
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.classList.add("hidden");
      resolve(result);
    };
    okBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
  });
}

// ---------- Advanced Cyberpunk Neural Constellation & Deep Space Engine ----------
function initSpaceStarfield() {
  const canvas = $("spaceCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  // Mouse interaction state
  const mouse = { x: -1000, y: -1000, radius: 150, active: false };
  let mouseTimer = null;
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => { mouse.active = false; }, 3000);
  });
  window.addEventListener("mouseleave", () => {
    mouse.active = false;
    mouse.x = -1000;
    mouse.y = -1000;
  });

  // Ambient floating nebula energy orbs
  const nebulae = [
    { x: w * 0.2, y: h * 0.3, vx: 0.15, vy: 0.1, radius: 280, color: "rgba(0, 255, 102, 0.04)" },
    { x: w * 0.8, y: h * 0.7, vx: -0.12, vy: -0.14, radius: 320, color: "rgba(0, 204, 82, 0.035)" },
    { x: w * 0.5, y: h * 0.2, vx: -0.08, vy: 0.12, radius: 240, color: "rgba(255, 170, 0, 0.025)" },
  ];

  // Neural mesh constellation nodes
  const nodeCount = Math.min(140, Math.floor((w * h) / 9000));
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const isHub = Math.random() < 0.12;
    nodes.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: isHub ? Math.random() * 2.5 + 2 : Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.75 + 0.25,
      alphaSpeed: (Math.random() * 0.015 + 0.005) * (Math.random() < 0.5 ? 1 : -1),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      isHub: isHub,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  // Shooting stars / meteors
  const meteors = [];
  function createMeteor() {
    if (meteors.length >= 2 || Math.random() > 0.5) return;
    meteors.push({
      x: Math.random() * w * 0.85,
      y: Math.random() * h * 0.35,
      length: Math.random() * 100 + 60,
      speed: Math.random() * 9 + 7,
      angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.25,
      alpha: 1,
      decay: Math.random() * 0.02 + 0.012,
    });
  }
  setInterval(createMeteor, 3800);

  // Expanding cyber energy pulse ripples
  const ripples = [];
  function createRipple(x, y) {
    ripples.push({
      x: x !== undefined ? x : Math.random() * w,
      y: y !== undefined ? y : Math.random() * h,
      radius: 0,
      maxRadius: Math.random() * 140 + 90,
      alpha: 0.6,
      speed: Math.random() * 1.5 + 1.2,
    });
  }
  setInterval(() => { if (ripples.length < 3) createRipple(); }, 5000);

  // Click generates interactive cyber ripple
  window.addEventListener("click", (e) => {
    createRipple(e.clientX, e.clientY);
  });

  const connectionDist = 105;
  const connectionDistSq = connectionDist * connectionDist;

  function renderSpace() {
    if (document.hidden) {
      requestAnimationFrame(renderSpace);
      return;
    }
    ctx.clearRect(0, 0, w, h);

    // 1. Draw drifting glowing nebula orbs
    for (let n of nebulae) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -100) n.vx = Math.abs(n.vx);
      if (n.x > w + 100) n.vx = -Math.abs(n.vx);
      if (n.y < -100) n.vy = Math.abs(n.vy);
      if (n.y > h + 100) n.vy = -Math.abs(n.vy);

      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      grad.addColorStop(0, n.color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw cyber energy ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += r.speed;
      r.alpha -= 0.007;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(0, 255, 102, ${r.alpha * 0.4})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Update nodes and mouse interaction
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i];
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around bounds
      if (p.x < 0) p.x = w;
      else if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      else if (p.y > h) p.y = 0;

      p.alpha += p.alphaSpeed;
      if (p.alpha >= 1) {
        p.alpha = 1;
        p.alphaSpeed = -Math.abs(p.alphaSpeed);
      } else if (p.alpha <= 0.2) {
        p.alpha = 0.2;
        p.alphaSpeed = Math.abs(p.alphaSpeed);
      }
      p.pulse += 0.04;

      // Mouse influence
      if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * 0.7;
          p.x -= (dx / dist) * force;
          p.y -= (dy / dist) * force;

          // Connect nearby nodes to mouse
          const mouseAlpha = (1 - dist / mouse.radius) * 0.55;
          ctx.strokeStyle = `rgba(0, 255, 102, ${mouseAlpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    // 4. Draw neural connection filaments between adjacent nodes
    for (let i = 0; i < nodes.length; i++) {
      const p1 = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const p2 = nodes[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < connectionDistSq) {
          const dist = Math.sqrt(distSq);
          const lineAlpha = (1 - dist / connectionDist) * 0.22 * Math.min(p1.alpha, p2.alpha);
          ctx.strokeStyle = `rgba(0, 255, 102, ${lineAlpha})`;
          ctx.lineWidth = p1.isHub || p2.isHub ? 1.2 : 0.8;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // 5. Draw node stars & glowing hubs
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

      if (p.isHub) {
        // Glowing Hub Node with orbital ring
        const hubGlow = Math.sin(p.pulse) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(0, 255, 102, ${p.alpha})`;
        ctx.shadowColor = "#00FF66";
        ctx.shadowBlur = 12 * hubGlow;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Micro-orbit ring around hub
        ctx.strokeStyle = `rgba(0, 255, 102, ${0.35 * hubGlow})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.85})`;
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.fill();
      }
    }

    // 6. Draw glowing shooting stars / meteors
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      const endX = m.x - Math.cos(m.angle) * m.length;
      const endY = m.y - Math.sin(m.angle) * m.length;

      const grad = ctx.createLinearGradient(m.x, m.y, endX, endY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${m.alpha})`);
      grad.addColorStop(0.2, `rgba(0, 255, 102, ${m.alpha * 0.95})`);
      grad.addColorStop(1, "rgba(0, 255, 102, 0)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Meteor head glow
      ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha})`;
      ctx.shadowColor = "#00FF66";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      m.x += Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;
      m.alpha -= m.decay;

      if (m.alpha <= 0 || m.x > w || m.y > h) {
        meteors.splice(i, 1);
      }
    }

    requestAnimationFrame(renderSpace);
  }

  requestAnimationFrame(renderSpace);
}

initSpaceStarfield();

// Only initialize elements if they exist on the page
const dashboard = $("dashboard");

// Skip if not on dashboard page
if (!dashboard) {
  console.log("Not on dashboard page, skipping initialization");
} else {
  
const serverSelect = $("serverSelect");
const serverIcon = $("serverIcon");
const channelSelect = $("channelSelect");
const winnersInput = $("winnersInput");
const prizeInput = $("prizeInput");
const hostInput = $("hostInput");
const minutesInput = $("minutesInput");
const tabSelectTime = $("tabSelectTime");
const tabDuration = $("tabDuration");
const datetimePickerView = $("datetimePickerView");
const durationPickerView = $("durationPickerView");
const endDateTimeInput = $("endDateTimeInput");
const durDays = $("durDays");
const durHours = $("durHours");
const durMinutes = $("durMinutes");
const timeSummaryBadge = $("timeSummaryBadge");
const timeSummaryText = $("timeSummaryText");
const emojiInput = $("emojiInput");
const embedColor = $("embedColor");
const imageInput = $("imageInput");
const thumbnailInput = $("thumbnailInput");
const messageInput = $("messageInput");
const winnerRoleSwitch = $("winnerRoleSwitch");
const winnerRolePicker = $("winnerRolePicker");
const winnerRoleBtn = $("winnerRoleBtn");
const winnerRoleLabel = $("winnerRoleLabel");
const winnerRoleMenu = $("winnerRoleMenu");
const requireAllRolesSwitch = $("requireAllRolesSwitch");
const stackEntriesSwitch = $("stackEntriesSwitch");
const dropSwitch = $("dropSwitch");
const requiredRolesBtn = $("requiredRolesBtn");
const requiredRolesLabel = $("requiredRolesLabel");
const requiredRolesMenu = $("requiredRolesMenu");
const blockedRolesBtn = $("blockedRolesBtn");
const blockedRolesLabel = $("blockedRolesLabel");
const blockedRolesMenu = $("blockedRolesMenu");
const extraEntriesList = $("extraEntriesList");
const addExtraEntryBtn = $("addExtraEntryBtn");
const giveawayForm = $("giveawayForm");
const createBtn = $("createBtn");
const formMessage = $("formMessage");
const botName = $("botName");
const giveawayInfoRefresh = $("giveawayInfoRefresh");
const giveawayInfoDashboard = $("giveawayInfoDashboard");
const giveawayInfoList = $("giveawayInfoList");
const customEmojiPicker = $("customEmojiPicker");
const customEmojiBtn = $("customEmojiBtn");
const customEmojiLabel = $("customEmojiLabel");
const customEmojiMenu = $("customEmojiMenu");
const serverEmojiList = $("serverEmojiList");
const emojiPresets = $("emojiPresets") || document.querySelector(".emoji-presets");

const state = {
  guilds: [],
  roles: [],
  emojis: [],
  required: new Set(),
  blocked: new Set(),
  winnerRole: "",
  selectedServer: "",
};

let token = localStorage.getItem("dashboard_token") || "";

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  if (options.body) headers["content-type"] = "application/json";

  const controller = new AbortController();
  const timeoutMs = options.timeout || 20000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(path, { ...options, headers, signal: controller.signal });
    clearTimeout(timer);
    if (res.status === 401) {
      localStorage.removeItem("dashboard_token");
      localStorage.removeItem("dashboard_user");
      token = "";
      showLogin();
      throw new Error("Session expired. Please sign in again.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Request timed out (Discord/server took too long to respond). Try using $gc in Discord.");
    }
    throw err;
  }
}

function getInitialAvatar(name) {
  const initial = (name || "U").trim().charAt(0).toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <rect width="64" height="64" rx="32" fill="#14141f"/>
      <circle cx="32" cy="32" r="30" fill="none" stroke="#00FF66" stroke-width="2"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#00FF66" font-family="'Segoe UI', -apple-system, sans-serif" font-size="28" font-weight="700">${initial}</text>
    </svg>`
  )}`;
}

function updateUserDisplay(user) {
  const badge = $("userProfileBadge");
  const avatar = $("userAvatar");
  const nameEl = $("userDisplayName");
  const emailEl = $("userDisplayEmail");

  if (!badge) return;
  if (!user) {
    badge.classList.add("hidden");
    return;
  }

  if (nameEl) nameEl.textContent = user.name || "Admin";
  if (emailEl) {
    if (user.username) {
      emailEl.textContent = `@${user.username.replace(/^@/, "")}`;
    } else if (user.email) {
      emailEl.textContent = user.email;
    } else {
      emailEl.textContent = "";
    }
  }
  if (avatar) {
    avatar.referrerPolicy = "no-referrer";
    avatar.alt = "";
    avatar.onerror = () => {
      avatar.onerror = null;
      avatar.src = getInitialAvatar(user.name);
    };
    if (user.picture) {
      avatar.src = user.picture;
    } else {
      avatar.src = getInitialAvatar(user.name);
    }
  }
  badge.classList.remove("hidden");
}

let currentUser = null;
let pollTimer = null;

function showPending(user) {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  const loginScreen = $("loginScreen");
  const dashboard = $("dashboard");
  const pendingScreen = $("pendingScreen");

  if (loginScreen) loginScreen.classList.add("hidden");
  if (dashboard) dashboard.classList.add("hidden");
  if (pendingScreen) pendingScreen.classList.remove("hidden");

  if (user) {
    const avatar = $("pendingUserAvatar");
    const nameEl = $("pendingUserName");
    const tagEl = $("pendingUserTag");
    const idEl = $("pendingUserId");

    if (nameEl) nameEl.textContent = user.name || "Discord User";
    if (tagEl) tagEl.textContent = user.username ? `@${user.username.replace(/^@/, "")}` : "";
    if (idEl) idEl.textContent = user.id || "Unknown ID";
    if (avatar) {
      avatar.referrerPolicy = "no-referrer";
      avatar.alt = "";
      avatar.onerror = () => {
        avatar.onerror = null;
        avatar.src = getInitialAvatar(user.name);
      };
      avatar.src = user.picture || getInitialAvatar(user.name);
    }
  }

  // Poll status periodically (every 4 seconds) to auto-enter when approved
  pollTimer = setInterval(async () => {
    if (!token) {
      clearInterval(pollTimer);
      pollTimer = null;
      return;
    }
    try {
      const res = await fetch("/api/auth/verify", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data.valid && data.user && data.user.status === "approved") {
        clearInterval(pollTimer);
        pollTimer = null;
        currentUser = data.user;
        localStorage.setItem("dashboard_user", JSON.stringify(data.user));
        updateUserDisplay(data.user);
        showDashboard();
        init();
        toast("Welcome! Your account has been approved by admin.");
      }
    } catch (e) {}
  }, 4000);
}

function showDashboard() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  const loginScreen = $("loginScreen");
  const pendingScreen = $("pendingScreen");
  const dashboard = $("dashboard");
  if (loginScreen) loginScreen.classList.add("hidden");
  if (pendingScreen) pendingScreen.classList.add("hidden");
  if (dashboard) dashboard.classList.remove("hidden");
}

let discordConfig = null;

async function loadDiscordConfig() {
  const setupCard = $("discordSetupCard");
  const setupClientId = $("setupClientId");

  try {
    const res = await fetch("/api/auth/discord/config");
    discordConfig = await res.json();
  } catch (e) {
    console.error("Failed to load Discord auth config:", e);
  }

  if (discordConfig && discordConfig.clientId && setupClientId) {
    setupClientId.textContent = discordConfig.clientId;
  }

  if (!discordConfig || !discordConfig.configured) {
    if (setupCard) setupCard.classList.remove("hidden");
  } else {
    if (setupCard) setupCard.classList.add("hidden");
  }
}

function showLogin() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  const loginScreen = $("loginScreen");
  const pendingScreen = $("pendingScreen");
  const dashboard = $("dashboard");
  if (dashboard) dashboard.classList.add("hidden");
  if (pendingScreen) pendingScreen.classList.add("hidden");
  if (loginScreen) loginScreen.classList.remove("hidden");
  loadDiscordConfig();
}

// Dev login button for testing before Discord Client Secret is configured
const devLoginBtn = $("devLoginBtn");
if (devLoginBtn) {
  devLoginBtn.addEventListener("click", async () => {
    const errorEl = $("loginError");
    if (errorEl) errorEl.classList.add("hidden");
    try {
      const res = await fetch("/api/auth/dev-login", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Dev login failed");
      token = data.token;
      localStorage.setItem("dashboard_token", token);
      if (data.user) {
        currentUser = data.user;
        localStorage.setItem("dashboard_user", JSON.stringify(data.user));
        updateUserDisplay(data.user);
      }
      showDashboard();
      init();
      toast(`Signed in as ${data.user?.name || "Admin"}`);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || "Dev login failed";
        errorEl.classList.remove("hidden");
      }
    }
  });
}

// Handle OAuth redirect callback query params (?error=... or ?token=...)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("error")) {
  const errText = urlParams.get("error");
  const errorEl = $("loginError");
  if (errorEl) {
    errorEl.textContent = errText;
    errorEl.classList.remove("hidden");
  }
  window.history.replaceState({}, document.title, window.location.pathname);
}
if (urlParams.has("token")) {
  token = urlParams.get("token");
  localStorage.setItem("dashboard_token", token);
  window.history.replaceState({}, document.title, window.location.pathname);
}

// Setup guide accordion toggle
const toggleSetupGuide = $("toggleSetupGuide");
if (toggleSetupGuide) {
  toggleSetupGuide.addEventListener("click", () => {
    const steps = $("setupGuideSteps");
    if (steps) {
      const isHidden = steps.classList.toggle("hidden");
      toggleSetupGuide.textContent = isHidden ? "View setup steps ▾" : "Hide setup steps ▴";
    }
  });
}

// Pending screen buttons
const checkApprovalBtn = $("checkApprovalBtn");
if (checkApprovalBtn) {
  checkApprovalBtn.addEventListener("click", async () => {
    checkApprovalBtn.disabled = true;
    checkApprovalBtn.textContent = "Checking...";
    try {
      await checkAuth();
      if (currentUser && currentUser.status === "pending") {
        toast("Your account is still awaiting administrator approval.", "info");
      }
    } catch (e) {
      toast("Error checking approval status.", "error");
    } finally {
      checkApprovalBtn.disabled = false;
      checkApprovalBtn.innerHTML = `<svg class="btn-icon-svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> Check Status Now`;
    }
  });
}

const pendingLogoutBtn = $("pendingLogoutBtn");
if (pendingLogoutBtn) {
  pendingLogoutBtn.addEventListener("click", () => {
    localStorage.removeItem("dashboard_token");
    localStorage.removeItem("dashboard_user");
    token = "";
    currentUser = null;
    showLogin();
    toast("Logged out.", "info");
  });
}

const logoutBtn = $("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("dashboard_token");
    localStorage.removeItem("dashboard_user");
    token = "";
    currentUser = null;
    updateUserDisplay(null);
    showLogin();
    toast("Logged out from dashboard.", "info");
  });
}

// Admin approvals management
async function loadApprovalsData() {
  if (!token) return;
  try {
    const data = await api("/api/admin/approvals");
    renderApprovals(data);
  } catch (err) {
    console.error("Failed to load approvals:", err);
  }
}

function renderApprovals(data) {
  const pending = data.pending || [];
  const approved = data.approved || [];

  // Update tabs badge count
  const badgeCount = $("pendingBadgeCount");
  if (badgeCount) {
    badgeCount.textContent = pending.length;
    badgeCount.classList.toggle("hidden", pending.length === 0);
  }

  const pendingLabel = $("pendingCountLabel");
  if (pendingLabel) pendingLabel.textContent = `${pending.length} user${pending.length === 1 ? "" : "s"}`;

  const approvedLabel = $("approvedCountLabel");
  if (approvedLabel) approvedLabel.textContent = `${approved.length} user${approved.length === 1 ? "" : "s"}`;

  // Render pending list
  const pendingContainer = $("pendingUserList");
  if (pendingContainer) {
    if (pending.length === 0) {
      pendingContainer.innerHTML = `<div class="extra-empty">No pending requests right now.</div>`;
    } else {
      pendingContainer.innerHTML = pending.map((u) => {
        const reqDate = u.requestedAt ? new Date(u.requestedAt).toLocaleString() : "Recently";
        const avatarSrc = u.picture || getInitialAvatar(u.name);
        return `
          <div class="approval-user-item">
            <div class="approval-user-left">
              <img class="approval-item-avatar" src="${avatarSrc}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${getInitialAvatar(u.name)}'" />
              <div class="approval-item-info">
                <div class="approval-item-name">${escapeHtml(u.name || "User")}</div>
                <div class="approval-item-tag">@${escapeHtml(u.username || "user")}</div>
                <div class="approval-item-id">ID: ${escapeHtml(u.id)} • ${reqDate}</div>
              </div>
            </div>
            <div class="approval-actions">
              <button type="button" class="btn-approve" data-action="approve" data-id="${u.id}">
                ✓ Approve
              </button>
              <button type="button" class="btn-reject" data-action="reject" data-id="${u.id}">
                ✕ Reject
              </button>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // Render approved list
  const approvedContainer = $("approvedUserList");
  if (approvedContainer) {
    if (approved.length === 0) {
      approvedContainer.innerHTML = `<div class="extra-empty">No approved users yet.</div>`;
    } else {
      approvedContainer.innerHTML = approved.map((u) => {
        const appDate = u.approvedAt ? new Date(u.approvedAt).toLocaleDateString() : "";
        const avatarSrc = u.picture || getInitialAvatar(u.name);
        const isSelf = currentUser && currentUser.id === u.id;
        return `
          <div class="approval-user-item">
            <div class="approval-user-left">
              <img class="approval-item-avatar" src="${avatarSrc}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${getInitialAvatar(u.name)}'" />
              <div class="approval-item-info">
                <div class="approval-item-name">
                  ${escapeHtml(u.name || "User")}
                  ${u.role === "admin" ? '<span class="role-badge-admin">ADMIN</span>' : ''}
                </div>
                <div class="approval-item-tag">@${escapeHtml(u.username || "user")}</div>
                <div class="approval-item-id">ID: ${escapeHtml(u.id)}${appDate ? ` • Approved ${appDate}` : ""}</div>
              </div>
            </div>
            <div class="approval-actions">
              ${!isSelf ? `
                <button type="button" class="btn-reject" data-action="revoke" data-id="${u.id}" title="Revoke access">
                  Revoke
                </button>
              ` : '<span style="font-size: 11px; color: var(--neon); font-weight: 700;">You</span>'}
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

// Delegation for approve/reject/revoke buttons
const pendingUserListEl = $("pendingUserList");
if (pendingUserListEl) {
  pendingUserListEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const userId = btn.dataset.id;
    if (!userId) return;

    if (action === "approve") {
      try {
        await api("/api/admin/approve-user", { method: "POST", body: JSON.stringify({ userId }) });
        toast("User approved successfully!", "success");
        loadApprovalsData();
      } catch (err) {
        toast(err.message || "Failed to approve user", "error");
      }
    } else if (action === "reject") {
      try {
        await api("/api/admin/reject-user", { method: "POST", body: JSON.stringify({ userId }) });
        toast("User request rejected.", "info");
        loadApprovalsData();
      } catch (err) {
        toast(err.message || "Failed to reject user", "error");
      }
    }
  });
}

const approvedUserListEl = $("approvedUserList");
if (approvedUserListEl) {
  approvedUserListEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action='revoke']");
    if (!btn) return;
    const userId = btn.dataset.id;
    if (!userId) return;
    try {
      await api("/api/admin/revoke-user", { method: "POST", body: JSON.stringify({ userId }) });
      toast("User access revoked.", "info");
      loadApprovalsData();
    } catch (err) {
      toast(err.message || "Failed to revoke user access", "error");
    }
  });
}

const refreshApprovalsBtn = $("refreshApprovalsBtn");
if (refreshApprovalsBtn) {
  refreshApprovalsBtn.addEventListener("click", () => {
    loadApprovalsData();
    toast("Refreshed user approvals list", "info");
  });
}

async function checkAuth() {
  if (!token) {
    showLogin();
    return;
  }
  try {
    const res = await fetch("/api/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!data.valid || !data.user) {
      localStorage.removeItem("dashboard_token");
      localStorage.removeItem("dashboard_user");
      token = "";
      currentUser = null;
      showLogin();
      return;
    }

    currentUser = data.user;
    localStorage.setItem("dashboard_user", JSON.stringify(data.user));
    updateUserDisplay(data.user);

    // If user is pending approval
    if (data.user.status === "pending") {
      showPending(data.user);
      return;
    }

    // Otherwise user is approved
    showDashboard();

    // Check if user is admin to show Approvals tab
    const tabApprovals = $("tabApprovals");
    if (tabApprovals) {
      if (data.user.role === "admin") {
        tabApprovals.classList.remove("hidden");
        loadApprovalsData();
      } else {
        tabApprovals.classList.add("hidden");
      }
    }

    init();
  } catch (e) {
    showLogin();
  }
}

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
  formMessage.classList.remove("hidden");
}

let isInitialized = false;

// ---------- Init ----------
function init() {
  if (!isInitialized) {
    if (serverSelect) serverSelect.addEventListener("change", onServerChange);
    isInitialized = true;
  }
  loadData();
  loadWinners();
  loadGiveawayInfo();
}

// ---------- Bot status (only highlighted when actually online) ----------
const botStatusEl = $("botStatus");

function setBotControls(offline) {
  if (createBtn) {
    createBtn.disabled = offline;
    if (offline) {
      createBtn.title = "Bot is offline";
    } else {
      createBtn.removeAttribute("title");
    }
  }
}

async function checkBotStatus() {
  if (!botStatusEl) return;
  try {
    const s = await api("/api/status");
    botStatusEl.classList.remove("checking");
    botStatusEl.classList.toggle("offline", !s.online);
    botStatusEl.textContent = s.online ? "● Online" : "● Offline";
    setBotControls(!s.online);

    const inviteBtn = $("serverInviteBtn");
    if (inviteBtn && s.inviteUrl) {
      inviteBtn.href = s.inviteUrl;
    }

    if (s.online && (!state.guilds || state.guilds.length === 0)) {
      loadData();
    }
  } catch {
    botStatusEl.classList.remove("checking");
    botStatusEl.classList.add("offline");
    botStatusEl.textContent = "● Offline";
    setBotControls(true);
  }
}

// ---------- Data loading ----------
async function loadData() {
  let guilds = [];
  try {
    guilds = await api("/api/guilds");
    state.guilds = Array.isArray(guilds) ? guilds : [];
  } catch (err) {
    console.error("Failed to load guilds:", err);
    if (botName) botName.textContent = err.message;
    if (serverSelect) serverSelect.innerHTML = "<option value=''>Error connecting to bot</option>";
    return;
  }

  const status = await api("/api/status").catch(() => ({ online: false, hasToken: false }));
  const inviteBtn = $("serverInviteBtn");
  if (status.inviteUrl && inviteBtn) {
    inviteBtn.href = status.inviteUrl;
  }

  if (!status.hasToken) {
    if (serverSelect) serverSelect.innerHTML = "<option value=''>❌ Bot Token missing in .env file</option>";
    if (botName) botName.textContent = "TOKEN MISSING IN .ENV";
    if (inviteBtn) inviteBtn.classList.add("hidden");
    return;
  }

  if (!status.online) {
    const errText = status.error ? `❌ ${status.error}` : "⏳ Bot is connecting to Discord… (Check TOKEN & Intents in Render)";
    if (serverSelect) serverSelect.innerHTML = `<option value=''>${escapeHtml(errText)}</option>`;
    if (botName && status.error) botName.textContent = status.error;
    if (inviteBtn) inviteBtn.classList.add("hidden");
    return;
  }

  if (state.guilds.length === 0) {
    if (serverSelect) serverSelect.innerHTML = "<option value=''>⚠️ Bot is not in any server — Click 'Invite Bot'</option>";
    if (inviteBtn) inviteBtn.classList.remove("hidden");
    return;
  }

  if (inviteBtn) inviteBtn.classList.add("hidden");

  if (serverSelect) {
    serverSelect.innerHTML = state.guilds
      .map((g) => `<option value="${g.id}">${escapeHtml(g.name)} — ${g.memberCount || 0} members</option>`)
      .join("");

    const last = localStorage.getItem("giveaway_boat_server");
    if (last && state.guilds.some((g) => g.id === last)) {
      serverSelect.value = last;
    } else {
      serverSelect.value = state.guilds[0].id;
    }
  }

  onServerChange();
}

async function loadWinners() {
  try {
    const entries = await api("/api/winners");
    renderWinners(entries);
  } catch {
    $("winnersList").innerHTML = `<div class="extra-empty">Could not load winners.</div>`;
  }
}

// ---------- Active giveaway information ----------
let lastGiveawayInfo = [];

async function loadGiveawayInfo() {
  try {
    lastGiveawayInfo = await api("/api/giveaways");
    renderGiveawayInfo();
  } catch {
    giveawayInfoList.innerHTML = `<div class="extra-empty">Could not load giveaway information.</div>`;
  }
}

if (giveawayInfoDashboard) {
  giveawayInfoDashboard.addEventListener("click", () => showPage("dashboard"));
}

if (giveawayInfoRefresh) {
  giveawayInfoRefresh.addEventListener("click", () => {
    loadGiveawayInfo();
    toast("Refreshed active giveaways.", "info");
  });
}

function fmtDateTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtEndsIn(ts) {
  const diff = ts - Date.now();
  if (diff <= 0) return "ending now…";
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function renderGiveawayInfo() {
  if (!lastGiveawayInfo.length) {
    giveawayInfoList.innerHTML = `<div class="extra-empty">No active giveaways right now. Create one from the Dashboard.</div>`;
    return;
  }
  giveawayInfoList.innerHTML = lastGiveawayInfo
    .map((g) => {
      const ended = g.status === "ended";
      const borderColor = ended ? "#949ba4" : "#00BD5B";
      const statusText = ended ? "ENDED" : "LIVE";
      const statusColor = ended ? "#949ba4" : "#43b581";
      const where = g.channelName ? `#${escapeHtml(g.channelName)}` : "unknown channel";
      const endsLine = ended
        ? `Ended: ${g.endedAt ? fmtDateTime(g.endedAt) : "—"}`
        : `Ends: ${g.endAt ? fmtDateTime(g.endAt) : "—"} <b class="gi-ends" data-end="${g.endAt}">(${fmtEndsIn(g.endAt)})</b>`;
      const participantsList = g.participants.length
        ? g.participants
            .map(
              (p, i) =>
                `<div class="gi-p-row"><span class="gi-p-rank">#${i + 1}</span><span class="gi-p-name">${escapeHtml(p.name)}</span><span class="gi-p-entries">${p.entries} ${p.entries === 1 ? "entry" : "entries"}</span></div>`
            )
            .join("")
        : `<div class="extra-empty">No participants yet.</div>`;
      return `
      <div class="gi-embed-wrap${ended ? " gi-ended" : ""}" data-mid="${g.messageId}">
        <div class="gi-embed" style="--embed-color:${borderColor}">
          <div class="gi-embed-header">
            <span class="gi-embed-title">${escapeHtml(g.prize)}</span>
            <span class="gi-status" style="background:${statusColor}22;color:${statusColor};border-color:${statusColor}44">${statusText}</span>
          </div>
          <div class="gi-embed-body">
            <div class="gi-embed-meta">
              <span>${escapeHtml(g.guildName)} · ${where}</span>
              <span>Host: ${g.host ? escapeHtml(g.host) : "Unknown"}</span>
              <span>${g.winners} ${g.winners === 1 ? "winner" : "winners"}</span>
            </div>
            <div class="gi-embed-meta">
              <span>Created: ${g.createdAt ? fmtDateTime(g.createdAt) : "—"}</span>
              <span>${endsLine}</span>
            </div>
            <div class="gi-label">Participants (${g.participants.length}):</div>
            <div class="gi-scroll">${participantsList}</div>
          </div>
          <div class="gi-embed-footer">
            <span>${g.totalEntries} total entries</span>
            <div class="gi-embed-actions">
              <button type="button" class="btn btn-danger btn-sm gi-delete" title="Delete from both server and dashboard">Delete</button>
              <button type="button" class="btn btn-warning btn-sm gi-reroll" title="Reroll">Reroll</button>
              <button type="button" class="btn btn-secondary btn-sm gi-money" title="Remove from dashboard (keeps Discord message)">Remove</button>
            </div>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

giveawayInfoList.addEventListener("click", async (e) => {
  const delBtn = e.target.closest(".gi-delete");
  if (delBtn) {
    const entry = delBtn.closest(".gi-embed-wrap");
    if (!entry) return;
    const messageId = entry.dataset.mid;
    const prize = entry.querySelector(".gi-embed-title")?.textContent.trim() || "Giveaway";

    if (!(await confirmDialog(`Delete "${prize}"? The Discord message and dashboard listing will both be removed.`))) return;

    delBtn.disabled = true;
    try {
      await api(`/api/giveaways/${messageId}`, { method: "DELETE" });
      toast(`${prize} deleted from Discord & dashboard.`);
      loadGiveawayInfo();
    } catch (err) {
      toast(`Delete failed: ${err.message}`, "error");
      delBtn.disabled = false;
    }
    return;
  }

  const moneyBtn = e.target.closest(".gi-money");
  if (moneyBtn) {
    const entry = moneyBtn.closest(".gi-embed-wrap");
    if (!entry) return;
    const messageId = entry.dataset.mid;
    const prize = entry.querySelector(".gi-embed-title")?.textContent.trim() || "Giveaway";

    if (!(await confirmDialog(`Remove "${prize}" from dashboard? (Keeps message on Discord)`))) return;

    moneyBtn.disabled = true;
    try {
      await api(`/api/giveaways/${messageId}/dashboard-only`, { method: "DELETE" });
      toast(`${prize} removed from dashboard (kept on Discord).`);
      loadGiveawayInfo();
    } catch (err) {
      console.error("Dashboard-only delete error:", err);
      toast(`Failed: ${err.message}`, "error");
      moneyBtn.disabled = false;
    }
    return;
  }

  const btn = e.target.closest(".gi-reroll");
  if (!btn) return;
  const entry = btn.closest(".gi-embed-wrap");
  if (!entry) return;
  const messageId = entry.dataset.mid;
  const prize = entry.querySelector(".gi-embed-title")?.textContent.trim() || "Giveaway";
  const ended = entry.classList.contains("gi-ended");
  const msg = ended
    ? `Reroll "${prize}"? New winners will be picked from existing entries and announced in Discord.`
    : `End "${prize}" now and pick winners in Discord?`;

  if (!(await confirmDialog(msg))) return;

  btn.disabled = true;
  btn.textContent = "Picking…";
  try {
    const data = await api(`/api/giveaways/${messageId}/reroll`, { method: "POST" });
    toast(data.action === "rerolled" ? `New winners announced for ${data.prize}` : `Giveaway ended, winners picked for ${data.prize}`);
    loadGiveawayInfo();
  } catch (err) {
    toast(`Reroll failed: ${err.message}`, "error");
    btn.disabled = false;
    btn.textContent = "Reroll";
  }
});

function updateGiveawayCountdowns() {
  let needsReload = false;
  document.querySelectorAll(".gi-ends").forEach((el) => {
    const end = Number(el.dataset.end);
    if (end > 0 && end - Date.now() <= 0 && !el.closest(".gi-ended")) {
      needsReload = true;
    }
    el.textContent = `(${fmtEndsIn(end)})`;
  });
  if (needsReload) {
    loadGiveawayInfo();
  }
}

if (giveawayInfoRefresh) giveawayInfoRefresh.addEventListener("click", loadGiveawayInfo);
if (giveawayInfoDashboard) {
  giveawayInfoDashboard.addEventListener("click", () => {
    document.querySelector('.nav-link[data-page="dashboard"]')?.click();
  });
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function renderWinners(entries) {
  const list = $("winnersList");
  if (!entries.length) {
    list.innerHTML = `<div class="extra-empty">No winners yet. Winners will appear here after giveaways or wheel spins end.</div>`;
    return;
  }
  list.innerHTML = entries
    .map((e) => {
      const isWheel = e.isWheel;
      const winnerNames = e.winners
        .filter((w) => !w.expired)
        .map((w) => {
          const display = escapeHtml(w.name);
          const username = w.username && w.username !== w.name ? ` <span class="winner-username">@${escapeHtml(w.username)}</span>` : "";
          return display + username;
        })
        .join(", ");
      return `
      <div class="winner-entry${isWheel ? ' winner-wheel' : ''}" data-mid="${e.messageId}">
        <div class="winner-entry-head">
          <span class="winner-prize">${escapeHtml(e.prize)}</span>
          <span class="winner-entry-right">
            <span class="winner-date">Ended ${fmtDate(e.endedAt)}</span>
            <button type="button" class="btn btn-sm btn-secondary winner-money" title="Remove from dashboard">Remove</button>
            <button type="button" class="btn btn-sm btn-primary winner-send" title="Send winner log to Discord">Send</button>
            <button type="button" class="btn btn-danger btn-sm winner-delete" title="Delete this record">Delete</button>
          </span>
        </div>
        <div class="winner-name">${winnerNames || '—'}</div>
        <div class="winner-role-note">${isWheel ? 'Wheel of Spin winner' : 'Winner role removed automatically 1 month after the giveaway ended.'}</div>
      </div>`;
    })
    .join("");
}

$("winnersList").addEventListener("click", async (e) => {
  const moneyBtn = e.target.closest(".winner-money");
  if (moneyBtn) {
    const entry = moneyBtn.closest(".winner-entry");
    if (!entry) return;
    const messageId = entry.dataset.mid;
    const prize = entry.querySelector(".winner-prize")?.textContent.trim() || "Giveaway";
    
    if (!(await confirmDialog(`Remove "${prize}" from winners list?`))) return;

    moneyBtn.disabled = true;
    try {
      await api(`/api/winners/${messageId}`, { method: "DELETE" });
      toast(`${prize} removed from dashboard.`);
      loadWinners();
    } catch (err) {
      console.error("Winner delete error:", err);
      toast(`Failed: ${err.message}`, "error");
      moneyBtn.disabled = false;
    }
    return;
  }

  const sendBtn = e.target.closest(".winner-send");
  if (sendBtn) {
    const entry = sendBtn.closest(".winner-entry");
    if (!entry) return;
    const messageId = entry.dataset.mid;
    const prize = entry.querySelector(".winner-prize")?.textContent.trim() || "Giveaway";

    sendBtn.disabled = true;
    sendBtn.textContent = "Sending…";
    try {
      await api(`/api/winners/${messageId}/send-discord`, { method: "POST" });
      toast(`Winner log for "${prize}" sent to Discord.`);
    } catch (err) {
      toast(`Failed to send log: ${err.message}`, "error");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
    return;
  }

  const btn = e.target.closest(".winner-delete");
  if (!btn) return;
  const entry = btn.closest(".winner-entry");
  if (!entry) return;
  const messageId = entry.dataset.mid;
  const prize = entry.querySelector(".winner-prize")?.textContent.trim() || "Giveaway";

  if (!(await confirmDialog(`Delete winner record for "${prize}"?`))) return;

  btn.disabled = true;
  try {
    await api(`/api/winners/${messageId}`, { method: "DELETE" });
    toast("Giveaway record deleted.");
    loadWinners();
  } catch (err) {
    toast(`Delete failed: ${err.message}`, "error");
    btn.disabled = false;
  }
});

$("winnersList").addEventListener("click", async (e) => {
  const sendBtn = e.target.closest(".winner-send");
  if (!sendBtn) return;
  const entry = sendBtn.closest(".winner-entry");
  if (!entry) return;
  const messageId = entry.dataset.mid;
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending…";
  try {
    const res = await api(`/api/winners/${messageId}/send-discord`, { method: "POST" });
    toast(`Winner log sent to Discord channel.`);
  } catch (err) {
    toast(`Send failed: ${err.message}`, "error");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
  }
});

async function onServerChange() {
  if (!serverSelect) return;
  state.selectedServer = serverSelect.value;
  if (state.selectedServer) {
    localStorage.setItem("giveaway_boat_server", state.selectedServer);
  }
  state.required.clear();
  state.blocked.clear();
  state.extraRows = [];

  if (serverIcon) serverIcon.src = "";
  if (channelSelect) channelSelect.disabled = true;
  state.winnerRole = "";
  const isWinnerRoleOn = winnerRoleSwitch ? (winnerRoleSwitch.getAttribute("aria-pressed") === "true" || winnerRoleSwitch.getAttribute("aria-checked") === "true") : false;
  if (winnerRolePicker) {
    winnerRolePicker.classList.toggle("hidden", !isWinnerRoleOn);
  }
  if (winnerRoleBtn) winnerRoleBtn.disabled = !isWinnerRoleOn;
  refreshWinnerRoleLabel();

  const guild = state.guilds.find((g) => g.id === state.selectedServer);
  if (guild) {
    if (guild.icon && serverIcon) {
      serverIcon.src = guild.icon;
      serverSelect.style.paddingLeft = "48px";
    } else {
      if (serverIcon) serverIcon.src = "";
      serverSelect.style.paddingLeft = "1rem";
    }
    if (botName) botName.textContent = "GFX GIVEAWAY";
  }

  if (!state.selectedServer) return;

  const [channels, roles, emojis] = await Promise.all([
    api(`/api/guilds/${state.selectedServer}/channels`).catch(() => []),
    api(`/api/guilds/${state.selectedServer}/roles`).catch(() => []),
    api(`/api/guilds/${state.selectedServer}/emojis`).catch(() => []),
  ]);

  state.roles = roles;
  state.emojis = emojis;

  if (channels.length === 0) {
    channelSelect.innerHTML = "<option value=''>No usable channels</option>";
  } else {
    channelSelect.innerHTML = channels
      .map((c) => `<option value="${c.id}">#${escapeHtml(c.name)}</option>`)
      .join("");
    channelSelect.disabled = false;
  }

  buildWinnerRolePicker();
  buildRequiredRolesMenu();
  buildBlockedRolesMenu();
  buildCustomEmojiPicker();
  renderExtraEntries();
  updatePreview();
}

function buildWinnerRolePicker() {
  const list = winnerRoleMenu.querySelector(".role-list");
  const search = winnerRoleMenu.querySelector(".role-search");
  if (search) search.value = "";
  if (state.roles.length === 0) {
    list.innerHTML = `<div class="role-empty">No roles available</div>`;
  } else {
    list.innerHTML = state.roles
      .map((r) => pickItemHtml(r, r.id === state.winnerRole))
      .join("");
  }
  list.querySelectorAll(".multi-item").forEach((item) => (item.style.display = ""));
}

function refreshWinnerRoleLabel() {
  const role = state.roles.find((r) => r.id === state.winnerRole);
  if (!role) {
    winnerRoleLabel.innerHTML = `<span class="role-placeholder">Select a role</span>`;
  } else {
    const roleColor = role.color && role.color !== "#000000" ? role.color : "#00FF66";
    winnerRoleLabel.innerHTML = `<span class="role-tag"><span class="multi-dot" style="background:${roleColor}; box-shadow: 0 0 6px ${roleColor}66;"></span>@${escapeHtml(role.name)}</span>`;
  }
}

function pickItemHtml(r, selected) {
  const roleColor = r.color && r.color !== "#000000" ? r.color : "#00FF66";
  return `
  <button type="button" class="multi-item pick-item ${selected ? "selected" : ""}" data-id="${r.id}">
    <span class="multi-dot" style="background:${roleColor}; box-shadow: 0 0 6px ${roleColor}66;"></span>
    <span class="role-name"><span class="role-at">@</span>${escapeHtml(r.name)}</span>
    ${selected ? `<span class="pick-check">✓</span>` : ""}
  </button>`;
}

winnerRoleBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const willOpen = winnerRoleMenu.classList.contains("hidden");
  document.querySelectorAll(".multi-menu").forEach((m) => m.classList.add("hidden"));
  if (willOpen) {
    winnerRoleMenu.classList.remove("hidden");
    const s = winnerRoleMenu.querySelector(".role-search");
    if (s) setTimeout(() => s.focus(), 50);
  }
});

winnerRoleMenu.addEventListener("click", (e) => {
  const item = e.target.closest(".pick-item");
  if (!item) return;
  state.winnerRole = state.winnerRole === item.dataset.id ? "" : item.dataset.id;
  refreshWinnerRoleLabel();
  buildWinnerRolePicker();
  winnerRoleMenu.classList.add("hidden");
  updatePreview();
});

const winnerSearchInput = winnerRoleMenu.querySelector(".role-search");
if (winnerSearchInput) {
  winnerSearchInput.addEventListener("input", () => filterRoleMenu(winnerRoleMenu));
}

function roleItemHtml(r, checked) {
  const roleColor = r.color && r.color !== "#000000" ? r.color : "#00FF66";
  return `
  <label class="multi-item ${checked ? "is-checked" : ""}">
    <input type="checkbox" value="${r.id}" ${checked ? "checked" : ""} />
    <span class="custom-check">
      <svg class="check-icon" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
    <span class="multi-dot" style="background:${roleColor}; box-shadow: 0 0 6px ${roleColor}66;"></span>
    <span class="role-name"><span class="role-at">@</span>${escapeHtml(r.name)}</span>
  </label>`;
}

function roleItemsHtml(set) {
  if (state.roles.length === 0) return `<div class="role-empty">No roles available</div>`;
  return state.roles.map((r) => roleItemHtml(r, set.has(r.id))).join("");
}

function buildRoleMenu(menuEl, listEl, set) {
  listEl.innerHTML = roleItemsHtml(set);
  const search = menuEl.querySelector(".role-search");
  if (search) search.value = "";
  menuEl.querySelector(".role-list").querySelectorAll(".multi-item").forEach((item) => (item.style.display = ""));
}

function buildRequiredRolesMenu() {
  buildRoleMenu(requiredRolesMenu, requiredRolesMenu.querySelector(".role-list"), state.required);
}

function buildBlockedRolesMenu() {
  buildRoleMenu(blockedRolesMenu, blockedRolesMenu.querySelector(".role-list"), state.blocked);
}

function filterRoleMenu(menuEl) {
  const list = menuEl.querySelector(".role-list");
  const search = menuEl.querySelector(".role-search");
  const term = (search ? search.value : "").trim().toLowerCase();
  let visible = 0;
  state.roles.forEach((r) => {
    const item = list.querySelector(
      `[data-id="${CSS.escape(r.id)}"], input[value="${CSS.escape(r.id)}"]`
    )?.closest(".multi-item");
    if (!item) return;
    const match = !term || r.name.toLowerCase().includes(term);
    item.style.display = match ? "" : "none";
    if (match) visible++;
  });
  let empty = list.querySelector(".role-empty");
  if (visible === 0 && !empty) {
    const el = document.createElement("div");
    el.className = "role-empty";
    el.textContent = "No roles found";
    list.appendChild(el);
  } else if (empty && visible > 0) {
    empty.remove();
  }
}

const reqSearch = requiredRolesMenu.querySelector(".role-search");
if (reqSearch) reqSearch.addEventListener("input", () => filterRoleMenu(requiredRolesMenu));

const blkSearch = blockedRolesMenu.querySelector(".role-search");
if (blkSearch) blkSearch.addEventListener("input", () => filterRoleMenu(blockedRolesMenu));

function refreshRoleLabel(set, labelEl) {
  const matchingRoles = state.roles.filter((r) => set.has(r.id));
  if (matchingRoles.length === 0) {
    labelEl.innerHTML = `<span class="role-placeholder">No roles selected</span>`;
  } else if (matchingRoles.length <= 2) {
    labelEl.innerHTML = matchingRoles
      .map((r) => {
        const color = r.color && r.color !== "#000000" ? r.color : "#00FF66";
        return `<span class="role-tag"><span class="multi-dot" style="background:${color}; box-shadow:0 0 5px ${color}66;"></span>@${escapeHtml(r.name)}</span>`;
      })
      .join("");
  } else {
    labelEl.innerHTML = `${matchingRoles
      .slice(0, 2)
      .map((r) => {
        const color = r.color && r.color !== "#000000" ? r.color : "#00FF66";
        return `<span class="role-tag"><span class="multi-dot" style="background:${color}; box-shadow:0 0 5px ${color}66;"></span>@${escapeHtml(r.name)}</span>`;
      })
      .join("")} <span class="role-more-tag">+${matchingRoles.length - 2} more</span>`;
  }
}

function refreshRequiredLabel() {
  refreshRoleLabel(state.required, requiredRolesLabel);
}

function refreshBlockedLabel() {
  refreshRoleLabel(state.blocked, blockedRolesLabel);
}

requiredRolesBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const willOpen = requiredRolesMenu.classList.contains("hidden");
  document.querySelectorAll(".multi-menu").forEach((m) => m.classList.add("hidden"));
  if (willOpen) {
    requiredRolesMenu.classList.remove("hidden");
    const s = requiredRolesMenu.querySelector(".role-search");
    if (s) setTimeout(() => s.focus(), 50);
  }
});

blockedRolesBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const willOpen = blockedRolesMenu.classList.contains("hidden");
  document.querySelectorAll(".multi-menu").forEach((m) => m.classList.add("hidden"));
  if (willOpen) {
    blockedRolesMenu.classList.remove("hidden");
    const s = blockedRolesMenu.querySelector(".role-search");
    if (s) setTimeout(() => s.focus(), 50);
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".multi-select")) {
    document.querySelectorAll(".multi-menu").forEach((m) => m.classList.add("hidden"));
  }
});

function buildCustomEmojiPicker() {
  if (!serverEmojiList) return;
  const search = customEmojiMenu ? customEmojiMenu.querySelector(".role-search") : null;
  if (search) search.value = "";
  if (!state.emojis || state.emojis.length === 0) {
    serverEmojiList.innerHTML = `<div class="role-empty">No custom server emojis found</div>`;
  } else {
    serverEmojiList.innerHTML = state.emojis
      .map(
        (e) => `
      <div class="server-emoji-item" data-code="${escapeHtml(e.formatted)}" data-name="${escapeHtml(e.name)}">
        <img class="server-emoji-icon" src="${e.url}" alt=":${e.name}:" />
        <span class="server-emoji-name">:${escapeHtml(e.name)}:</span>
        <span class="server-emoji-code">${escapeHtml(e.formatted)}</span>
      </div>`
      )
      .join("");
  }
}

if (customEmojiBtn) {
  customEmojiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = customEmojiMenu.classList.contains("hidden");
    document.querySelectorAll(".multi-menu").forEach((m) => m.classList.add("hidden"));
    if (willOpen) {
      customEmojiMenu.classList.remove("hidden");
      const s = customEmojiMenu.querySelector(".role-search");
      if (s) setTimeout(() => s.focus(), 50);
    }
  });
}

if (customEmojiMenu) {
  const search = customEmojiMenu.querySelector(".role-search");
  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      serverEmojiList.querySelectorAll(".server-emoji-item").forEach((item) => {
        const name = (item.dataset.name || "").toLowerCase();
        item.style.display = name.includes(q) ? "" : "none";
      });
    });
  }
}

if (serverEmojiList) {
  serverEmojiList.addEventListener("click", (e) => {
    const item = e.target.closest(".server-emoji-item");
    if (!item) return;
    const code = item.dataset.code;
    emojiInput.value = code;
    if (customEmojiLabel) customEmojiLabel.textContent = `:${item.dataset.name}:`;
    customEmojiMenu.classList.add("hidden");
    updatePreview();
  });
}

if (emojiPresets) {
  emojiPresets.addEventListener("click", (e) => {
    const chip = e.target.closest(".emoji-chip");
    if (!chip) return;
    emojiPresets.querySelectorAll(".emoji-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    emojiInput.value = chip.dataset.emoji || "";
    if (customEmojiLabel) customEmojiLabel.textContent = "Pick Server Custom Emoji";
    updatePreview();
  });
}

requiredRolesMenu.addEventListener("change", (e) => {
  if (e.target.matches('input[type="checkbox"]')) {
    const id = e.target.value;
    const item = e.target.closest(".multi-item");
    if (e.target.checked) {
      state.required.add(id);
      if (item) item.classList.add("is-checked");
    } else {
      state.required.delete(id);
      if (item) item.classList.remove("is-checked");
    }
    refreshRequiredLabel();
    updatePreview();
  }
});

blockedRolesMenu.addEventListener("change", (e) => {
  if (e.target.matches('input[type="checkbox"]')) {
    const id = e.target.value;
    const item = e.target.closest(".multi-item");
    if (e.target.checked) {
      state.blocked.add(id);
      if (item) item.classList.add("is-checked");
    } else {
      state.blocked.delete(id);
      if (item) item.classList.remove("is-checked");
    }
    refreshBlockedLabel();
    updatePreview();
  }
});

// ---------- Extra entries ----------
let extraKey = 0;

function renderExtraEntries() {
  if (state.extraRows.length === 0) {
    extraEntriesList.innerHTML = `<div class="extra-empty">No extra entries configured</div>`;
    return;
  }
  extraEntriesList.innerHTML = state.extraRows
    .map((row) => {
      const role = state.roles.find((r) => r.id === row.roleId);
      const roleColor = role && role.color && role.color !== "#000000" ? role.color : "#00FF66";
      const label = role
        ? `<span class="role-tag"><span class="multi-dot" style="background:${roleColor}; box-shadow:0 0 5px ${roleColor}66;"></span>@${escapeHtml(role.name)}</span>`
        : `<span class="role-placeholder">Select a role</span>`;
      return `
      <div class="extra-row" data-key="${row.key}">
        <div class="extra-role-col">
          <div class="multi-select">
            <button type="button" class="multi-btn extra-role-btn">
              <span class="extra-role-label">${label}</span>
              <span class="chev">▾</span>
            </button>
            <div class="multi-menu hidden extra-role-menu">
              <div class="role-search-wrap">
                <span class="search-icon">
                  <svg class="neon-svg search-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                </span>
                <input type="text" class="role-search" placeholder="Search roles…" />
              </div>
              <div class="role-list">
                ${state.roles.length ? state.roles.map((r) => pickItemHtml(r, r.id === row.roleId)).join("") : `<div class="role-empty">No roles available</div>`}
              </div>
            </div>
          </div>
        </div>
        <div class="extra-entries-wrap">
          <span class="extra-multiplier-label">Entries:</span>
          <input type="number" class="extra-entries" min="1" max="250" value="${row.entries}" />
        </div>
        <button type="button" class="extra-remove" title="Remove role">✕</button>
      </div>`;
    })
    .join("");
}

addExtraEntryBtn.addEventListener("click", () => {
  state.extraRows.push({ key: ++extraKey, roleId: "", entries: 1 });
  renderExtraEntries();
});

extraEntriesList.addEventListener("click", (e) => {
  if (e.target.classList.contains("extra-remove")) {
    const key = Number(e.target.closest(".extra-row").dataset.key);
    state.extraRows = state.extraRows.filter((r) => r.key !== key);
    renderExtraEntries();
    updatePreview();
    return;
  }

  const roleBtn = e.target.closest(".extra-role-btn");
  if (roleBtn) {
    e.stopPropagation();
    const menu = roleBtn.closest(".extra-row").querySelector(".extra-role-menu");
    const willOpen = menu.classList.contains("hidden");
    document.querySelectorAll(".multi-menu").forEach((m) => m.classList.add("hidden"));
    if (willOpen) {
      menu.classList.remove("hidden");
      const s = menu.querySelector(".role-search");
      if (s) setTimeout(() => s.focus(), 50);
    }
    return;
  }

  const pick = e.target.closest(".extra-role-menu .pick-item");
  if (pick) {
    const key = Number(pick.closest(".extra-row").dataset.key);
    const row = state.extraRows.find((r) => r.key === key);
    if (!row) return;
    row.roleId = row.roleId === pick.dataset.id ? "" : pick.dataset.id;
    renderExtraEntries();
    updatePreview();
  }
});

extraEntriesList.addEventListener("input", (e) => {
  const menu = e.target.closest(".extra-role-menu");
  if (menu && e.target.classList.contains("role-search")) {
    filterRoleMenu(menu);
  }
});

extraEntriesList.addEventListener("change", (e) => {
  const rowEl = e.target.closest(".extra-row");
  if (!rowEl) return;
  const key = Number(rowEl.dataset.key);
  const row = state.extraRows.find((r) => r.key === key);
  if (!row) return;
  if (e.target.classList.contains("extra-entries")) row.entries = Math.max(1, parseInt(e.target.value, 10) || 1);
  updatePreview();
});

// ---------- Custom Date & Time Picker Controls ----------
const customDatePickerBtn = $("customDatePickerBtn");
const customCalendarDropdown = $("customCalendarDropdown");
const datetimeDisplayText = $("datetimeDisplayText");
const calPrevMonth = $("calPrevMonth");
const calNextMonth = $("calNextMonth");
const calMonthYear = $("calMonthYear");
const calDaysGrid = $("calDaysGrid");
const calHourInput = $("calHourInput");
const calMinInput = $("calMinInput");
const calAmBtn = $("calAmBtn");
const calPmBtn = $("calPmBtn");
const calApplyBtn = $("calApplyBtn");
const calQuickToday = $("calQuickToday");
const calQuickTomorrow = $("calQuickTomorrow");

let calTargetDate = new Date(Date.now() + 60 * 60000);
let calViewingYear = calTargetDate.getFullYear();
let calViewingMonth = calTargetDate.getMonth();

const calMonthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function renderCustomCalendar() {
  if (!calDaysGrid || !calMonthYear) return;
  calMonthYear.textContent = `${calMonthNames[calViewingMonth]} ${calViewingYear}`;

  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const firstDay = new Date(calViewingYear, calViewingMonth, 1);
  let startDayOfWeek = firstDay.getDay() - 1; // Mon = 0, Sun = 6
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const daysInMonth = new Date(calViewingYear, calViewingMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calViewingYear, calViewingMonth, 0).getDate();

  let html = "";

  // Prev month filler
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    html += `<button type="button" class="cal-day-cell is-other-month" disabled>${dayNum}</button>`;
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const thisDate = new Date(calViewingYear, calViewingMonth, day);
    const isPast = thisDate < todayDateOnly;
    const isToday = thisDate.getTime() === todayDateOnly.getTime();
    const isSelected =
      calTargetDate.getFullYear() === calViewingYear &&
      calTargetDate.getMonth() === calViewingMonth &&
      calTargetDate.getDate() === day;

    const classes = [
      "cal-day-cell",
      isPast ? "is-disabled" : "",
      isToday ? "is-today" : "",
      isSelected ? "is-selected" : ""
    ].filter(Boolean).join(" ");

    html += `<button type="button" class="${classes}" data-day="${day}" ${isPast ? "disabled" : ""}>${day}</button>`;
  }

  const totalCells = startDayOfWeek + daysInMonth;
  const nextMonthCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= nextMonthCells; d++) {
    html += `<button type="button" class="cal-day-cell is-other-month" disabled>${d}</button>`;
  }

  calDaysGrid.innerHTML = html;

  const hours = calTargetDate.getHours();
  const isPm = hours >= 12;
  const h12 = hours % 12 || 12;
  const m = calTargetDate.getMinutes();

  if (calHourInput && document.activeElement !== calHourInput) {
    calHourInput.value = h12;
  }
  if (calMinInput && document.activeElement !== calMinInput) {
    calMinInput.value = String(m).padStart(2, "0");
  }
  if (calAmBtn) calAmBtn.classList.toggle("active", !isPm);
  if (calPmBtn) calPmBtn.classList.toggle("active", isPm);

  if (datetimeDisplayText) {
    const formatted = calTargetDate.toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = calTargetDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    datetimeDisplayText.textContent = `${formatted} • ${timeStr}`;
  }
}

function syncTimeFromInputs(forcedIsPm) {
  let h = parseInt(calHourInput?.value, 10);
  if (isNaN(h)) return;
  if (h < 1) h = 1;
  if (h > 12) h = 12;

  let m = parseInt(calMinInput?.value, 10);
  if (isNaN(m)) m = 0;
  if (m < 0) m = 0;
  if (m > 59) m = 59;

  let isPm;
  if (typeof forcedIsPm === "boolean") {
    isPm = forcedIsPm;
  } else {
    isPm = calPmBtn && calPmBtn.classList.contains("active");
  }

  const h24 = isPm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
  calTargetDate.setHours(h24, m, 0, 0);

  const now = Date.now();
  if (calTargetDate.getTime() <= now) {
    const today = new Date();
    const isToday =
      calTargetDate.getFullYear() === today.getFullYear() &&
      calTargetDate.getMonth() === today.getMonth() &&
      calTargetDate.getDate() === today.getDate();

    if (isToday) {
      calTargetDate.setDate(calTargetDate.getDate() + 1);
      calViewingYear = calTargetDate.getFullYear();
      calViewingMonth = calTargetDate.getMonth();
      toast(`Adjusted date to tomorrow at ${h}:${String(m).padStart(2, "0")} ${isPm ? "PM" : "AM"}`, "info");
    } else {
      toast("Selected time is in the past. Setting to 1 hour from now.", "warning");
      calTargetDate = new Date(now + 60 * 60000);
      calViewingYear = calTargetDate.getFullYear();
      calViewingMonth = calTargetDate.getMonth();
    }
  }

  const mins = Math.max(1, Math.round((calTargetDate.getTime() - now) / 60000));
  setDurationMinutes(mins, "calendar");
}

if (customDatePickerBtn && customCalendarDropdown) {
  customDatePickerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = customCalendarDropdown.classList.contains("hidden");
    document.querySelectorAll(".multi-menu").forEach((m) => m.classList.add("hidden"));
    if (willOpen) {
      customCalendarDropdown.classList.remove("hidden");
      renderCustomCalendar();
    } else {
      customCalendarDropdown.classList.add("hidden");
    }
  });
}

if (calPrevMonth) {
  calPrevMonth.addEventListener("click", (e) => {
    e.stopPropagation();
    calViewingMonth--;
    if (calViewingMonth < 0) {
      calViewingMonth = 11;
      calViewingYear--;
    }
    renderCustomCalendar();
  });
}

if (calNextMonth) {
  calNextMonth.addEventListener("click", (e) => {
    e.stopPropagation();
    calViewingMonth++;
    if (calViewingMonth > 11) {
      calViewingMonth = 0;
      calViewingYear++;
    }
    renderCustomCalendar();
  });
}

if (calDaysGrid) {
  calDaysGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".cal-day-cell");
    if (!btn || btn.disabled || !btn.dataset.day) return;
    const day = parseInt(btn.dataset.day, 10);
    calTargetDate.setFullYear(calViewingYear, calViewingMonth, day);

    const now = Date.now();
    if (calTargetDate.getTime() <= now) {
      calTargetDate = new Date(now + 60 * 60000);
      toast("Selected time today had already passed; set to 1 hour from now.", "info");
    }
    const mins = Math.max(1, Math.round((calTargetDate.getTime() - now) / 60000));
    setDurationMinutes(mins, "calendar");
  });
}

if (calHourInput) {
  calHourInput.addEventListener("change", () => syncTimeFromInputs());
  calHourInput.addEventListener("input", () => syncTimeFromInputs());
  calHourInput.addEventListener("blur", () => {
    let h = parseInt(calHourInput.value, 10) || 12;
    if (h < 1) h = 1;
    if (h > 12) h = 12;
    calHourInput.value = h;
  });
  calHourInput.addEventListener("wheel", (e) => {
    e.preventDefault();
    let h = parseInt(calHourInput.value, 10) || 12;
    h = e.deltaY < 0 ? (h % 12) + 1 : (h === 1 ? 12 : h - 1);
    calHourInput.value = h;
    syncTimeFromInputs();
  }, { passive: false });
}

if (calMinInput) {
  calMinInput.addEventListener("change", () => syncTimeFromInputs());
  calMinInput.addEventListener("input", () => syncTimeFromInputs());
  calMinInput.addEventListener("blur", () => {
    let m = parseInt(calMinInput.value, 10) || 0;
    if (m < 0) m = 0;
    if (m > 59) m = 59;
    calMinInput.value = String(m).padStart(2, "0");
  });
  calMinInput.addEventListener("wheel", (e) => {
    e.preventDefault();
    let m = parseInt(calMinInput.value, 10) || 0;
    m = e.deltaY < 0 ? (m + 1) % 60 : (m - 1 + 60) % 60;
    calMinInput.value = String(m).padStart(2, "0");
    syncTimeFromInputs();
  }, { passive: false });
}

if (calAmBtn) {
  calAmBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    calAmBtn.classList.add("active");
    if (calPmBtn) calPmBtn.classList.remove("active");
    syncTimeFromInputs(false);
  });
}

if (calPmBtn) {
  calPmBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    calPmBtn.classList.add("active");
    if (calAmBtn) calAmBtn.classList.remove("active");
    syncTimeFromInputs(true);
  });
}

if (calQuickToday) {
  calQuickToday.addEventListener("click", (e) => {
    e.stopPropagation();
    const now = new Date();
    calViewingYear = now.getFullYear();
    calViewingMonth = now.getMonth();
    const h = parseInt(calHourInput?.value, 10) || now.getHours() % 12 || 12;
    const m = parseInt(calMinInput?.value, 10) || now.getMinutes();
    const isPm = calPmBtn && calPmBtn.classList.contains("active");
    const h24 = isPm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);

    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h24, m, 0, 0);
    if (candidate.getTime() <= Date.now()) {
      calTargetDate = new Date(Date.now() + 60 * 60000);
      toast("Set to 1 hour from now.", "info");
    } else {
      calTargetDate = candidate;
    }
    const mins = Math.max(1, Math.round((calTargetDate.getTime() - Date.now()) / 60000));
    setDurationMinutes(mins, "calendar");
  });
}

if (calQuickTomorrow) {
  calQuickTomorrow.addEventListener("click", (e) => {
    e.stopPropagation();
    const tom = new Date(Date.now() + 86400000);
    calViewingYear = tom.getFullYear();
    calViewingMonth = tom.getMonth();
    const h = parseInt(calHourInput?.value, 10) || 12;
    const m = parseInt(calMinInput?.value, 10) || 0;
    const isPm = calPmBtn && calPmBtn.classList.contains("active");
    const h24 = isPm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);

    calTargetDate = new Date(tom.getFullYear(), tom.getMonth(), tom.getDate(), h24, m, 0, 0);
    const mins = Math.max(1, Math.round((calTargetDate.getTime() - Date.now()) / 60000));
    setDurationMinutes(mins, "calendar");
  });
}

if (calApplyBtn) {
  calApplyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    customCalendarDropdown?.classList.add("hidden");
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#customDatePickerWrap")) {
    customCalendarDropdown?.classList.add("hidden");
  }
});

// ---------- End Time / Duration Selection ----------
function formatDateForLocalInput(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function updateTimeSummary(targetDate, mins) {
  if (!timeSummaryText) return;
  if (!mins || mins < 1) {
    timeSummaryText.textContent = "Please select a valid end time or duration.";
    return;
  }
  const durStr = fmtDuration(mins * 60000);
  const now = new Date();
  const isToday = targetDate.toDateString() === now.toDateString();
  const tomorrow = new Date(now.getTime() + 86400000);
  const isTomorrow = targetDate.toDateString() === tomorrow.toDateString();

  const timeStr = targetDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  let dayPrefix = targetDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  if (isToday) dayPrefix = "Today";
  else if (isTomorrow) dayPrefix = "Tomorrow";

  timeSummaryText.textContent = `Ends in ${durStr} • ${dayPrefix} at ${timeStr}`;
}

function setDurationMinutes(mins, source = "manual") {
  const totalMins = Math.max(1, Math.min(144000, parseInt(mins, 10) || 1));
  if (minutesInput) minutesInput.value = totalMins;

  let targetDate;
  if (source === "calendar") {
    targetDate = calTargetDate;
  } else {
    targetDate = new Date(Date.now() + totalMins * 60000);
    calTargetDate = targetDate;
    calViewingYear = targetDate.getFullYear();
    calViewingMonth = targetDate.getMonth();
  }

  if (endDateTimeInput) {
    endDateTimeInput.value = formatDateForLocalInput(targetDate);
  }

  if (source !== "duration") {
    const d = Math.floor(totalMins / 1440);
    const h = Math.floor((totalMins % 1440) / 60);
    const m = totalMins % 60;
    if (durDays) durDays.value = d;
    if (durHours) durHours.value = h;
    if (durMinutes) durMinutes.value = m;
  }

  // Update preset chips in duration view & quick action buttons in datetime view
  document.querySelectorAll("#durationPickerView .chip[data-minutes]").forEach((chip) => {
    chip.classList.toggle("active", parseInt(chip.dataset.minutes, 10) === totalMins);
  });
  document.querySelectorAll(".time-quick-btn").forEach((btn) => {
    let m = 0;
    if (btn.dataset.addMinutes) m = parseInt(btn.dataset.addMinutes, 10) || 0;
    if (btn.dataset.addHours) m = (parseInt(btn.dataset.addHours, 10) || 0) * 60;
    if (btn.dataset.addDays) m = (parseInt(btn.dataset.addDays, 10) || 0) * 1440;
    btn.classList.toggle("active", m === totalMins);
  });

  renderCustomCalendar();
  updateTimeSummary(targetDate, totalMins);
  updatePreview();
}

// Mode switch tabs
if (tabSelectTime && tabDuration) {
  tabSelectTime.addEventListener("click", () => {
    tabSelectTime.classList.add("active");
    tabSelectTime.setAttribute("aria-selected", "true");
    tabDuration.classList.remove("active");
    tabDuration.setAttribute("aria-selected", "false");
    if (datetimePickerView) datetimePickerView.classList.remove("hidden");
    if (durationPickerView) durationPickerView.classList.add("hidden");
  });

  tabDuration.addEventListener("click", () => {
    tabDuration.classList.add("active");
    tabDuration.setAttribute("aria-selected", "true");
    tabSelectTime.classList.remove("active");
    tabSelectTime.setAttribute("aria-selected", "false");
    if (durationPickerView) durationPickerView.classList.remove("hidden");
    if (datetimePickerView) datetimePickerView.classList.add("hidden");
  });
}

// Quick action buttons in date/time picker
document.querySelectorAll(".time-quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    let addMins = 0;
    if (btn.dataset.addMinutes) addMins = parseInt(btn.dataset.addMinutes, 10) || 0;
    if (btn.dataset.addHours) addMins = (parseInt(btn.dataset.addHours, 10) || 0) * 60;
    if (btn.dataset.addDays) addMins = (parseInt(btn.dataset.addDays, 10) || 0) * 1440;
    if (addMins > 0) {
      setDurationMinutes(addMins, "quick-btn");
    }
  });
});

// Duration inputs grid (Days / Hours / Minutes)
function onDurationInputChange() {
  const d = Math.max(0, parseInt(durDays?.value, 10) || 0);
  const h = Math.max(0, parseInt(durHours?.value, 10) || 0);
  const m = Math.max(0, parseInt(durMinutes?.value, 10) || 0);
  const total = d * 1440 + h * 60 + m;
  setDurationMinutes(Math.max(1, total), "duration");
}

[durDays, durHours, durMinutes].forEach((input) => {
  if (input) {
    input.addEventListener("input", onDurationInputChange);
  }
});

// Presets in Duration view
document.querySelectorAll("#durationPickerView .chip[data-minutes]").forEach((chip) => {
  chip.addEventListener("click", () => {
    const mins = parseInt(chip.dataset.minutes, 10);
    if (mins) setDurationMinutes(mins, "preset");
  });
});

// ---------- Switches ----------
function toggleSwitch(el) {
  const wasOn = el.getAttribute("aria-pressed") === "true";
  const nowOn = !wasOn;
  el.setAttribute("aria-pressed", nowOn ? "true" : "false");
  if (el === winnerRoleSwitch) {
    if (winnerRolePicker) {
      winnerRolePicker.classList.toggle("hidden", !nowOn);
    }
    winnerRoleBtn.disabled = !nowOn;
    if (!nowOn) {
      state.winnerRole = "";
      refreshWinnerRoleLabel();
      buildWinnerRolePicker();
      if (winnerRoleMenu) winnerRoleMenu.classList.add("hidden");
    }
  }
  updatePreview();
}

document.querySelectorAll(".switch").forEach((s) => {
  s.addEventListener("click", () => toggleSwitch(s));
});

// ---------- Preview ----------
let countdownTimer = null;

function fmtDuration(ms) {
  if (!(ms > 0)) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (sec || parts.length === 0) parts.push(`${sec}s`);
  return parts.join(" ");
}

function bold(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function updateConditionalVisibility() {
  const isWinnerRoleOn = winnerRoleSwitch.getAttribute("aria-pressed") === "true";
  if (winnerRolePicker) {
    winnerRolePicker.classList.toggle("hidden", !isWinnerRoleOn);
  }
  winnerRoleBtn.disabled = !isWinnerRoleOn;

  const reqRow = $("requireAllRolesRow");
  if (reqRow) {
    reqRow.classList.toggle("hidden", state.required.size <= 1);
  }
  const rejOption = $("rejectionMessageOption");
  if (rejOption) {
    rejOption.classList.toggle("hidden", state.required.size === 0);
  }

  const stackRow = $("stackEntriesRow");
  if (stackRow) {
    const validExtraCount = state.extraRows.filter((r) => r.roleId && r.entries > 0).length;
    stackRow.classList.toggle("hidden", validExtraCount <= 1);
  }
}

function renderDiscordEmojiHtml(text) {
  if (!text) return "";
  let out = String(text).replace(/&lt;a:([a-zA-Z0-9_]+):(\d+)&gt;|<a:([a-zA-Z0-9_]+):(\d+)>/g, (m, n1, id1, n2, id2) => {
    const name = n1 || n2;
    const id = id1 || id2;
    return `<img class="discord-emoji-img" src="https://cdn.discordapp.com/emojis/${id}.gif?size=48" alt=":${name}:" title=":${name}:" />`;
  });
  out = out.replace(/&lt;:([a-zA-Z0-9_]+):(\d+)&gt;|<:([a-zA-Z0-9_]+):(\d+)>/g, (m, n1, id1, n2, id2) => {
    const name = n1 || n2;
    const id = id1 || id2;
    return `<img class="discord-emoji-img" src="https://cdn.discordapp.com/emojis/${id}.webp?size=48" alt=":${name}:" title=":${name}:" />`;
  });
  return out;
}

function updatePreview() {
  updateConditionalVisibility();

  const prize = prizeInput.value.trim() || "Your Prize";
  const winners = parseInt(winnersInput.value, 10) || 1;
  const emoji = emojiInput ? emojiInput.value.trim() : "";
  const host = hostInput.value.trim() || botName.textContent || "GFX GIVEAWAY";
  const image = imageInput.value.trim();
  const thumbnail = thumbnailInput.value.trim();

  if (emojiPresets) {
    emojiPresets.querySelectorAll(".emoji-chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.emoji === emoji);
    });
  }

  const titleHtml = emoji
    ? `${renderDiscordEmojiHtml(escapeHtml(emoji))} ${escapeHtml(prize)}`
    : escapeHtml(prize);
  $("pvTitle").innerHTML = titleHtml;
  $("pvEmbed").style.setProperty("--embed-color", embedColor.value);
  $("pvMessage").textContent = messageInput.value.trim();
  $("pvMessage").style.display = messageInput.value.trim() ? "" : "none";

  const thumbEl = $("pvThumbnail");
  if (thumbEl) {
    if (thumbnail) {
      thumbEl.src = thumbnail;
      thumbEl.classList.remove("hidden");
      thumbEl.onerror = () => thumbEl.classList.add("hidden");
    } else {
      thumbEl.classList.add("hidden");
      thumbEl.src = "";
    }
  }

  const imgEl = $("pvImage");
  if (imgEl) {
    if (image) {
      imgEl.src = image;
      imgEl.classList.remove("hidden");
      imgEl.onerror = () => imgEl.classList.add("hidden");
    } else {
      imgEl.classList.add("hidden");
      imgEl.src = "";
    }
  }

  const footerEmojiEl = $("pvFooterEmoji");
  if (footerEmojiEl) {
    footerEmojiEl.innerHTML = emoji ? `${renderDiscordEmojiHtml(escapeHtml(emoji))} ` : "";
  }

  const btnEmojiEl = $("pvBtnEmoji");
  if (btnEmojiEl) {
    btnEmojiEl.innerHTML = emoji ? `${renderDiscordEmojiHtml(escapeHtml(emoji))} ` : "";
  }

  const lines = [];
  lines.push(`Click the button below to enter!\n`);
  lines.push(`**Ends:** ${fmtDuration((parseInt(minutesInput.value, 10) || 0) * 60000)}`);
  lines.push(`**Hosted by:** ${host}`);
  lines.push(`**Winners:** ${winners}`);

  const isWinnerRoleOn = winnerRoleSwitch.getAttribute("aria-pressed") === "true";
  if (isWinnerRoleOn && state.winnerRole) {
    const role = state.roles.find((r) => r.id === state.winnerRole);
    if (role) {
      lines.push(`**Winner Role:** @${role.name}`);
    }
  }

  if (state.required.size > 0) {
    const names = state.roles.filter((r) => state.required.has(r.id)).map((r) => `@${r.name}`).join(", ");
    const mode = requireAllRolesSwitch.getAttribute("aria-pressed") === "true" ? "All of" : "Any of";
    lines.push(`**Requirements:** ${mode} ${names}`);
  }

  if (state.blocked.size > 0) {
    const names = state.roles.filter((r) => state.blocked.has(r.id)).map((r) => `@${r.name}`).join(", ");
    lines.push(`**Blocked Roles:** ${names}`);
  }

  const validExtra = state.extraRows.filter((r) => r.roleId && r.entries > 0);
  if (validExtra.length > 0) {
    lines.push(`\n**Extra Entries:**`);
    validExtra.forEach((r) => {
      const role = state.roles.find((x) => x.id === r.roleId);
      const label = role ? `@${role.name}` : "role";
      lines.push(`${label} → **${r.entries}** extra ${r.entries === 1 ? "entry" : "entries"}`);
    });
  }

  $("pvDesc").innerHTML = lines.map((l) => `<span class="line">${bold(escapeHtml(l))}</span>`).join("");
}

function startCountdown() {
  clearInterval(countdownTimer);
  countdownTimer = setInterval(updatePreview, 1000);
}

[
  winnersInput,
  prizeInput,
  hostInput,
  minutesInput,
  emojiInput,
  embedColor,
  imageInput,
  thumbnailInput,
  messageInput,
  $("rejectionMessage"),
].forEach((el) => {
  if (el) el.addEventListener("input", updatePreview);
});


// ---------- Submit ----------
giveawayForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMessage.classList.add("hidden");

  const extraEntries = state.extraRows
    .filter((r) => r.roleId && r.entries > 0)
    .map((r) => ({ roleId: r.roleId, entries: r.entries }));

  const payload = {
    guildId: state.selectedServer,
    channelId: channelSelect.value,
    minutes: parseInt(minutesInput.value, 10),
    winners: parseInt(winnersInput.value, 10),
    prize: prizeInput.value.trim(),
    host: hostInput.value.trim() || null,
    requiredRoleIds: [...state.required],
    blockedRoleIds: [...state.blocked],
    requireAllRoles: requireAllRolesSwitch.getAttribute("aria-pressed") === "true",
    extraEntries,
    stackEntries: stackEntriesSwitch.getAttribute("aria-pressed") === "true",
    isDrop: dropSwitch.getAttribute("aria-pressed") === "true",
    winnersRoleId:
      winnerRoleSwitch.getAttribute("aria-pressed") === "true" ? state.winnerRole || null : null,
    color: parseInt(embedColor.value.slice(1), 16),
    emoji: (emojiInput && emojiInput.value.trim()) || null,
    image: imageInput.value.trim() || null,
    thumbnail: thumbnailInput.value.trim() || null,
    message: messageInput.value.trim() || null,
    rejectionMessage: $("rejectionMessage").value.trim() || null,
  };

  if (!payload.guildId) return showMessage("Please select a server.", "error");
  if (!payload.channelId) return showMessage("Please select a giveaway channel!", "error");
  if (!payload.minutes || payload.minutes < 1) return showMessage("Giveaway duration must be at least 1 minute.", "error");
  if (!payload.winners || payload.winners < 1) return showMessage("Number of winners must be at least 1.", "error");
  if (!payload.prize) return showMessage("Please specify a prize for the giveaway!", "error");

  createBtn.disabled = true;
  createBtn.textContent = "Creating…";

  try {
    await api("/api/giveaway", { method: "POST", body: JSON.stringify(payload) });
    showMessage(`Giveaway created for "${payload.prize}"!`, "success");
    toast(`Giveaway created for "${payload.prize}"!`);
    prizeInput.value = "";
    messageInput.value = "";
    setDurationMinutes(60);
    loadWinners();
  } catch (err) {
    showMessage(`Failed to create giveaway: ${err.message}`, "error");
    toast(`Failed to create giveaway: ${err.message}`, "error");
  } finally {
    createBtn.disabled = false;
    createBtn.innerHTML = `<svg class="neon-svg" style="width: 18px; height: 18px; margin-right: 0.4rem;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z"/></svg> Create Giveaway`;
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- Page switching ----------
const pageTitles = {
  dashboard: "GFX GIVEAWAY | Create Giveaway",
  giveawayinfo: "GFX GIVEAWAY | Active Giveaways",
  giveaways: "GFX GIVEAWAY | Recent Winners",
  approvals: "GFX GIVEAWAY | User Approvals",
};

function showPage(page) {
  if (!page) page = "dashboard";
  const validPages = ["dashboard", "giveawayinfo", "giveaways", "approvals"];
  if (!validPages.includes(page)) page = "dashboard";

  const dashboard = $("dashboard");
  const loginScreen = $("loginScreen");

  if (page === "dashboard") {
    if (!token) {
      if (dashboard) dashboard.classList.add("hidden");
      if (loginScreen) loginScreen.classList.remove("hidden");
    } else {
      if (loginScreen) loginScreen.classList.add("hidden");
      if (dashboard) dashboard.classList.remove("hidden");
    }
  } else {
    if (loginScreen) loginScreen.classList.add("hidden");
    if (dashboard) dashboard.classList.remove("hidden");
  }

  document.querySelectorAll(".nav-link[data-page], .tab[data-page]").forEach((l) => {
    l.classList.toggle("active", l.dataset.page === page);
  });
  const pDashboard = $("page-dashboard");
  const pGiveawayinfo = $("page-giveawayinfo");
  const pGiveaways = $("page-giveaways");
  const pApprovals = $("page-approvals");

  if (pDashboard) pDashboard.classList.toggle("hidden", page !== "dashboard");
  if (pGiveawayinfo) pGiveawayinfo.classList.toggle("hidden", page !== "giveawayinfo");
  if (pGiveaways) pGiveaways.classList.toggle("hidden", page !== "giveaways");
  if (pApprovals) pApprovals.classList.toggle("hidden", page !== "approvals");

  if (pageTitles[page]) document.title = pageTitles[page];
  if (page === "giveawayinfo") loadGiveawayInfo();
  if (page === "giveaways") loadWinners();
  if (page === "approvals") loadApprovalsData();

  try {
    history.replaceState(null, "", page === "dashboard" ? "/" : `/${page}`);
  } catch {}
}

document.addEventListener("click", (e) => {
  const link = e.target.closest(".nav-link[data-page], .tab[data-page]");
  if (link && link.dataset.page) {
    e.preventDefault();
    showPage(link.dataset.page);
  }
});

function updateGiveawayCountdowns() {
  document.querySelectorAll(".gi-ends[data-end]").forEach((el) => {
    const endTs = parseInt(el.dataset.end, 10);
    if (endTs) {
      el.textContent = `(${fmtEndsIn(endTs)})`;
    }
  });
}

checkAuth();
setDurationMinutes(60);
startCountdown();
setInterval(updateGiveawayCountdowns, 1000);
checkBotStatus();
setInterval(checkBotStatus, 5000);

// Deep-link support: /giveaways, /giveawayinfo, /approvals open the right page directly
const initialPage = location.pathname.split("/")[1] || "dashboard";
if (["dashboard", "giveawayinfo", "giveaways", "approvals"].includes(initialPage)) {
  showPage(initialPage);
}

} // End of dashboard-only code
