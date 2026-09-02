const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  AttachmentBuilder,
  Events,
  MessageFlags,
} = require("discord.js");
const { generateWheelGIF } = require("./wheel-generator");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn, exec } = require("child_process");
const readline = require("readline");
const crypto = require("crypto");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const PREFIX = "$";

// ---- Web dashboard ----
const app = express();
app.set("trust proxy", 1);
const DASHBOARD_PORT = parseInt(process.env.PORT) || 3000;
const AUTH_SECRET = String(process.env.SESSION_SECRET || process.env.AUTH_SECRET || "gfx_giveaway_secret_token_key").trim();

function getDiscordClientId() {
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_ID.trim()) {
    return process.env.DISCORD_CLIENT_ID.trim();
  }
  if (client && client.user && client.user.id) {
    return client.user.id;
  }
  const token = String(process.env.TOKEN || "").trim();
  if (token && token.includes(".")) {
    try {
      const decoded = Buffer.from(token.split(".")[0], "base64").toString();
      if (/^\d+$/.test(decoded)) return decoded;
    } catch (e) {}
  }
  return "1543971027858489395";
}

const DISCORD_CLIENT_SECRET = String(process.env.DISCORD_CLIENT_SECRET || "").trim();
const DISCORD_CALLBACK_URL = String(process.env.DISCORD_CALLBACK_URL || "").trim();
const DISCORD_ALLOWED_USERS = String(process.env.DISCORD_ALLOWED_USERS || "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const ADMIN_DISCORD_IDS = String(
  process.env.ADMIN_DISCORD_IDS || process.env.DISCORD_ALLOWED_USERS || ""
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const APPROVALS_FILE = path.join(__dirname, "approvals.json");

function loadApprovals() {
  try {
    if (fs.existsSync(APPROVALS_FILE)) {
      const data = JSON.parse(fs.readFileSync(APPROVALS_FILE, "utf-8"));
      return {
        approved: data.approved || {},
        pending: data.pending || {},
      };
    }
  } catch (err) {
    console.error("[AUTH] Error loading approvals:", err);
  }
  return { approved: {}, pending: {} };
}

function saveApprovals(data) {
  try {
    fs.writeFileSync(APPROVALS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[AUTH] Error saving approvals:", err);
  }
}

function syncUserApproval(user) {
  const userId = String(user.id || "").trim();
  if (!userId) return { status: "pending", role: "user" };

  const approvals = loadApprovals();

  // 1. Explicit admin IDs in .env
  if (ADMIN_DISCORD_IDS.includes(userId)) {
    if (!approvals.approved[userId]) {
      approvals.approved[userId] = {
        id: userId,
        name: user.name || "Admin",
        username: user.username || "admin",
        picture: user.picture || "",
        role: "admin",
        approvedAt: Date.now(),
        approvedBy: "env config",
      };
      if (approvals.pending[userId]) delete approvals.pending[userId];
      saveApprovals(approvals);
    }
    return { status: "approved", role: "admin" };
  }

  // 2. If no users are approved yet in system, first logging-in user becomes admin!
  const approvedKeys = Object.keys(approvals.approved);
  if (approvedKeys.length === 0 && ADMIN_DISCORD_IDS.length === 0) {
    approvals.approved[userId] = {
      id: userId,
      name: user.name || "Admin",
      username: user.username || "admin",
      picture: user.picture || "",
      role: "admin",
      approvedAt: Date.now(),
      approvedBy: "system (initial admin)",
    };
    if (approvals.pending[userId]) delete approvals.pending[userId];
    saveApprovals(approvals);
    console.log(`[AUTH] First user initialized as Administrator: ${user.name} (${userId})`);
    return { status: "approved", role: "admin" };
  }

  // 3. User is in approved list
  if (approvals.approved[userId]) {
    const appRecord = approvals.approved[userId];
    if (user.name) appRecord.name = user.name;
    if (user.username) appRecord.username = user.username;
    if (user.picture) appRecord.picture = user.picture;
    if (approvals.pending[userId]) delete approvals.pending[userId];
    saveApprovals(approvals);
    return { status: "approved", role: appRecord.role || "user" };
  }

  // 4. Otherwise, user is pending! Add/update to pending list
  approvals.pending[userId] = {
    id: userId,
    name: user.name || "Discord User",
    username: user.username || "user",
    picture: user.picture || "",
    email: user.email || "",
    requestedAt: approvals.pending[userId]?.requestedAt || Date.now(),
  };
  saveApprovals(approvals);
  return { status: "pending", role: "user" };
}

function createSessionToken(user) {
  const payload = {
    id: user.id || "",
    name: user.name || "",
    username: user.username || "",
    email: user.email || "",
    picture: user.picture || "",
    provider: user.provider || "discord",
    status: user.status || "pending",
    role: user.role || "user",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7-day session
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(tokenStr) {
  if (!tokenStr) return null;
  const parts = tokenStr.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;

    // Refresh status and role live from approvals
    if (payload.id && payload.provider === "discord") {
      const current = syncUserApproval(payload);
      payload.status = current.status;
      payload.role = current.role;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

app.use(express.json());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  next();
});
app.use(express.static(path.join(__dirname, "public")));

// Deep-link routes so /giveaways, /giveawayinfo, /approvals, /pending open the dashboard directly
app.get(["/giveaways", "/giveawayinfo", "/approvals", "/pending", "/wait"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function getRedirectUri(req) {
  const host = req.get("host") || `localhost:${DASHBOARD_PORT}`;
  const protoHeader = req.get("x-forwarded-proto");
  const protocol = protoHeader ? protoHeader.split(",")[0].trim() : (req.protocol || "http");

  if (DISCORD_CALLBACK_URL && DISCORD_CALLBACK_URL.includes(host)) {
    return DISCORD_CALLBACK_URL;
  }
  return `${protocol}://${host}/api/auth/discord/callback`;
}

// Auth endpoints - Discord Login Only
app.get("/api/auth/discord/config", (req, res) => {
  const clientId = getDiscordClientId();
  const callbackUrl = getRedirectUri(req);
  res.json({
    clientId,
    configured: Boolean(DISCORD_CLIENT_SECRET),
    callbackUrl,
    hasAllowedUsers: DISCORD_ALLOWED_USERS.length > 0,
  });
});

// Discord OAuth 2.0 Login Redirect
app.get("/api/auth/discord/login", (req, res) => {
  const clientId = getDiscordClientId();
  if (!clientId) {
    return res.status(400).send("Discord Client ID could not be determined. Please set DISCORD_CLIENT_ID in .env");
  }

  const redirectUri = getRedirectUri(req);
  const authUrl = new URL("https://discord.com/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify email guilds");
  authUrl.searchParams.set("prompt", "consent");
  return res.redirect(authUrl.toString());
});

// Discord OAuth 2.0 Callback
app.get("/api/auth/discord/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`/?error=${encodeURIComponent("Discord authentication cancelled: " + error)}`);
  }
  if (!code) {
    return res.redirect("/?error=missing_authorization_code");
  }

  const clientId = getDiscordClientId();
  const clientSecret = DISCORD_CLIENT_SECRET;

  if (!clientSecret) {
    return res.redirect("/?error=DISCORD_CLIENT_SECRET_is_not_configured_in_env");
  }

  const redirectUri = getRedirectUri(req);

  try {
    // Exchange code for token with Discord API
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[AUTH] Discord token exchange failed:", tokenData);
      const desc = tokenData.error_description 
        ? `${tokenData.error || "OAuth Error"}: ${tokenData.error_description}`
        : (tokenData.error || "Token exchange failed");
      return res.redirect(`/?error=${encodeURIComponent(desc)}`);
    }

    // Fetch user profile from Discord
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();

    if (!userRes.ok || !discordUser.id) {
      return res.redirect("/?error=failed_to_fetch_discord_user_profile");
    }

    // Check user whitelist if configured
    if (DISCORD_ALLOWED_USERS.length > 0 && !DISCORD_ALLOWED_USERS.includes(discordUser.id)) {
      console.log(`[AUTH] Unauthorized Discord login attempt by ID: ${discordUser.id} (${discordUser.username})`);
      return res.redirect(`/?error=${encodeURIComponent(`Access denied: User ID ${discordUser.id} is not authorized.`)}`);
    }

    // Determine avatar URL
    let avatarUrl = "";
    if (discordUser.avatar) {
      const isAnimated = discordUser.avatar.startsWith("a_");
      avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${isAnimated ? "gif" : "png"}?size=128`;
    } else {
      const defaultIndex = (BigInt(discordUser.id) >> 22n) % 6n;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }

    const baseUser = {
      id: discordUser.id,
      name: discordUser.global_name || discordUser.username,
      username: discordUser.discriminator && discordUser.discriminator !== "0"
        ? `${discordUser.username}#${discordUser.discriminator}`
        : discordUser.username,
      email: discordUser.email || "",
      picture: avatarUrl,
      provider: "discord",
    };

    const approval = syncUserApproval(baseUser);
    const user = {
      ...baseUser,
      status: approval.status,
      role: approval.role,
    };

    const sessionToken = createSessionToken(user);
    console.log(`[AUTH] Discord login: ${user.name} (@${user.username}) [${user.id}] - Status: ${user.status} (${user.role})`);

    const escapeHtml = (str) =>
      String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Return HTML that securely stores token and redirects to dashboard
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authenticating...</title>
  <style>
    body { background: #08080c; color: #00FF66; font-family: 'Segoe UI', system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; }
    .spinner { width: 38px; height: 38px; border: 3px solid rgba(0, 255, 102, 0.25); border-top-color: #00FF66; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <h2 style="margin:0 0 0.5rem; color:#fff;">Signing into GFX Dashboard...</h2>
    <p style="margin:0; color:#8c8c9e; font-size:14px;">Welcome, ${escapeHtml(user.name)} (@${escapeHtml(user.username)})</p>
  </div>
  <script>
    try {
      localStorage.setItem("dashboard_token", ${JSON.stringify(sessionToken)});
      localStorage.setItem("dashboard_user", ${JSON.stringify(JSON.stringify(user))});
      window.location.replace("/");
    } catch (e) {
      window.location.replace("/?token=" + encodeURIComponent(${JSON.stringify(sessionToken)}));
    }
  </script>
</body>
</html>`);
  } catch (err) {
    console.error("[AUTH] Error in Discord callback:", err);
    return res.redirect(`/?error=${encodeURIComponent("Authentication error: " + err.message)}`);
  }
});

// Quick dev sign-in (for local testing before Discord Client Secret is configured)
app.post("/api/auth/dev-login", (req, res) => {
  const adminId = ADMIN_DISCORD_IDS[0] || "754248398957183007";
  const user = {
    id: adminId,
    name: "Aryan479",
    username: "Aryan479",
    email: "admin@discord.local",
    picture: "https://cdn.discordapp.com/embed/avatars/0.png",
    provider: "discord",
    status: "approved",
    role: "admin",
  };
  syncUserApproval(user);
  const token = createSessionToken(user);
  console.log(`[AUTH] Dev login initiated for: ${user.name} (${user.id})`);
  return res.json({ success: true, token, user });
});

app.get("/api/auth/verify", (req, res) => {
  const auth = req.headers.authorization || "";
  const tokenStr = auth.replace(/^Bearer\s+/i, "").trim();
  const user = verifySessionToken(tokenStr);
  if (user) {
    return res.json({ valid: true, user });
  }
  return res.status(401).json({ valid: false, error: "Invalid or expired session token" });
});

// Admin Approvals API
app.get("/api/admin/approvals", (req, res) => {
  const auth = req.headers.authorization || "";
  const tokenStr = auth.replace(/^Bearer\s+/i, "").trim();
  const user = verifySessionToken(tokenStr);
  if (!user || user.status !== "approved" || user.role !== "admin") {
    return res.status(403).json({ error: "Access denied: Admin privileges required." });
  }

  const data = loadApprovals();
  const pending = Object.values(data.pending || {}).sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
  const approved = Object.values(data.approved || {}).sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0));

  return res.json({ pending, approved });
});

app.post("/api/admin/approve-user", (req, res) => {
  const auth = req.headers.authorization || "";
  const tokenStr = auth.replace(/^Bearer\s+/i, "").trim();
  const user = verifySessionToken(tokenStr);
  if (!user || user.status !== "approved" || user.role !== "admin") {
    return res.status(403).json({ error: "Access denied: Admin privileges required." });
  }

  const { userId, role } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const data = loadApprovals();
  const pendingUser = data.pending[userId] || {};
  const existingApproved = data.approved[userId] || {};

  data.approved[userId] = {
    id: userId,
    name: pendingUser.name || existingApproved.name || "Approved User",
    username: pendingUser.username || existingApproved.username || "user",
    picture: pendingUser.picture || existingApproved.picture || "",
    role: role || existingApproved.role || "user",
    approvedAt: Date.now(),
    approvedBy: user.username || user.name || "admin",
  };
  delete data.pending[userId];
  saveApprovals(data);

  console.log(`[AUTH] Admin '${user.username || user.name}' approved user '${data.approved[userId].username}' (${userId})`);
  return res.json({ success: true, user: data.approved[userId] });
});

app.post("/api/admin/reject-user", (req, res) => {
  const auth = req.headers.authorization || "";
  const tokenStr = auth.replace(/^Bearer\s+/i, "").trim();
  const user = verifySessionToken(tokenStr);
  if (!user || user.status !== "approved" || user.role !== "admin") {
    return res.status(403).json({ error: "Access denied: Admin privileges required." });
  }

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const data = loadApprovals();
  delete data.pending[userId];
  saveApprovals(data);

  console.log(`[AUTH] Admin '${user.username || user.name}' rejected user '${userId}'`);
  return res.json({ success: true });
});

app.post("/api/admin/revoke-user", (req, res) => {
  const auth = req.headers.authorization || "";
  const tokenStr = auth.replace(/^Bearer\s+/i, "").trim();
  const user = verifySessionToken(tokenStr);
  if (!user || user.status !== "approved" || user.role !== "admin") {
    return res.status(403).json({ error: "Access denied: Admin privileges required." });
  }

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }
  if (userId === user.id) {
    return res.status(400).json({ error: "You cannot revoke your own administrator access." });
  }

  const data = loadApprovals();
  const revoked = data.approved[userId];
  if (revoked) {
    delete data.approved[userId];
    data.pending[userId] = {
      ...revoked,
      requestedAt: Date.now(),
    };
    saveApprovals(data);
  }

  console.log(`[AUTH] Admin '${user.username || user.name}' revoked user '${userId}'`);
  return res.json({ success: true });
});



app.get("/api/guilds", (req, res) => {
  const guilds = [...client.guilds.cache.values()].map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.iconURL({ size: 128 }),
    memberCount: g.memberCount,
  }));
  res.json(guilds);
});

app.get("/api/winners", (req, res) => {
  res.json(winnersStore);
});

let lastLoginError = null;

app.get("/api/status", (req, res) => {
  const online = client.isReady();
  const botId = online && client.user ? client.user.id : null;
  const inviteUrl = botId
    ? `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`
    : null;
  res.json({
    online,
    username: online && client.user ? client.user.tag : null,
    botId,
    inviteUrl,
    servers: client.guilds.cache.size,
    hasToken: Boolean(process.env.TOKEN && process.env.TOKEN.trim()),
    error: online ? null : lastLoginError,
    checkedAt: Date.now(),
  });
});

app.get("/api/giveaways", async (req, res) => {
  const list = [];
  const build = (messageId, data, status) => {
    const guild = client.guilds.cache.get(data.guildId);
    const channel = guild ? guild.channels.cache.get(data.channelId) : null;

    const entries = Array.isArray(data.entries) ? data.entries : [];
    const counts = {};
    for (const id of entries) counts[id] = (counts[id] || 0) + 1;

    const participants = [];
    for (const [id, count] of Object.entries(counts)) {
      let name = String(id);
      if (guild) {
        const m = guild.members.cache.get(id);
        if (m) name = m.user.username;
      }
      participants.push({ id, name, entries: count });
    }
    participants.sort((a, b) => b.entries - a.entries);

    list.push({
      messageId,
      status,
      guildId: data.guildId,
      guildName: guild ? guild.name : "Unknown",
      channelId: data.channelId,
      channelName: channel ? channel.name : null,
      host: data.host || "",
      prize: data.prize,
      winners: data.winners,
      createdAt: data.createdAt || null,
      endAt: data.endAt || null,
      endedAt: data.endedAt || null,
      isDrop: !!data.isDrop,
      requiredRoleIds: data.requiredRoleIds || [],
      totalEntries: entries.length,
      participants,
    });
  };

  for (const [messageId, data] of activeGiveaways) build(messageId, data, "active");
  for (const [messageId, data] of endedGiveaways) build(messageId, data, "ended");

  list.sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return (a.endAt || 0) - (b.endAt || 0);
  });
  res.json(list);
});

app.delete("/api/winners/:messageId", (req, res) => {
  const { messageId } = req.params;
  const before = winnersStore.length;
  winnersStore = winnersStore.filter((e) => String(e.messageId) !== String(messageId));
  saveWinners();
  res.json({ success: true, removed: before - winnersStore.length });
});

app.post("/api/winners/:messageId/send-discord", async (req, res) => {
  const { messageId } = req.params;
  const entry = winnersStore.find((e) => String(e.messageId) === String(messageId));
  if (!entry) {
    return res.status(404).json({ error: "Winner record not found." });
  }
  const channelId = (req.body && req.body.channelId) || process.env.WINNER_LOG_CHANNEL_ID;
  if (!channelId) {
    return res.status(400).json({ error: "No log channel configured. Set WINNER_LOG_CHANNEL_ID in .env or pass channelId." });
  }
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return res.status(500).json({ error: "Could not find that channel. Make sure the bot can see it." });
    }
    const winners = (entry.winners || [])
      .filter((w) => !w.expired)
      .map((w) => {
        const id = w.id && !String(w.id).startsWith("wheel-") ? w.id : null;
        const username = w.username && w.username !== w.name ? ` (@${w.username})` : "";
        return id ? `<@${id}>${username}` : `**${w.name || "Unknown"}**${username}`;
      })
      .join(", ");
    const endedAt = entry.endedAt || Date.now();

    const winnerEmbed = new EmbedBuilder()
      .setColor(entry.isWheel ? 0x00BD5B : 0x6c60d7)
      .setTitle(entry.isWheel ? "🎰 Wheel Winner" : "🎉 Giveaway Winner")
      .setDescription(`**${winners}**`)
      .addFields(
        { name: "Prize", value: entry.prize || "—", inline: true },
        { name: "Date", value: `<t:${Math.floor(endedAt / 1000)}:F>`, inline: true }
      )
      .setTimestamp(new Date(endedAt));

    await channel.send({ embeds: [winnerEmbed] });
    res.json({ success: true, channelId: channel.id });
  } catch (err) {
    console.error("Send winner log error:", err);
    res.status(500).json({ error: err.message || "Failed to send winner log." });
  }
});

app.post("/api/winners", async (req, res) => {
  const entry = req.body;
  if (!entry || !entry.prize || !entry.winners || !entry.winners.length) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Wheel winners: auto-assign Giveaway Winner role + 1 month expiry
  if (entry.isWheel && client.isReady()) {
    const guild = (entry.guildId && client.guilds.cache.get(entry.guildId)) || client.guilds.cache.first();
    if (guild) {
      entry.guildId = guild.id;
      entry.guildName = guild.name;
      if (guild.members.cache.size < guild.memberCount) {
        await guild.members.fetch().catch(() => {});
      }
      for (const w of entry.winners) {
        const member = guild.members.cache.find((m) => m.user.username === w.name);
        if (member) {
          w.id = member.id;
          await member.roles.add(GIVEAWAY_WINNER_ROLE_ID).catch(() => {});
          scheduleWinnerRoleRemoval(guild.id, member.id, entry.roleAssignedUntil);
        }
      }
    }
  }

  recordWinners(entry);
  res.json({ success: true });
});

app.delete("/api/giveaways/:messageId/dashboard-only", async (req, res) => {
  const { messageId } = req.params;
  console.log(`Dashboard-only delete requested for: ${messageId}`);
  const data = activeGiveaways.get(messageId) || endedGiveaways.get(messageId);
  if (!data) {
    return res.status(404).json({ error: "Giveaway not found." });
  }
  activeGiveaways.delete(messageId);
  endedGiveaways.delete(messageId);
  saveGiveaways();
  saveEndedGiveaways();
  res.json({ success: true, prize: data.prize });
});

app.delete("/api/giveaways/:messageId", async (req, res) => {
  const { messageId } = req.params;
  const data = activeGiveaways.get(messageId) || endedGiveaways.get(messageId);
  if (!data) {
    return res.status(404).json({ error: "Giveaway not found." });
  }
  activeGiveaways.delete(messageId);
  endedGiveaways.delete(messageId);
  saveGiveaways();
  saveEndedGiveaways();
  const channel = await client.channels.fetch(data.channelId).catch(() => null);
  if (channel) {
    await channel.messages.delete(messageId).catch(() => {});
  }
  res.json({ success: true, prize: data.prize });
});

app.post("/api/giveaways/:messageId/reroll", async (req, res) => {
  const { messageId } = req.params;

  if (activeGiveaways.has(messageId)) {
    const data = activeGiveaways.get(messageId);
    try {
      await endGiveaway(messageId);
      return res.json({ success: true, action: "ended", prize: data.prize });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to end giveaway" });
    }
  }

  const data = endedGiveaways.get(messageId);
  if (!data) {
    return res.status(404).json({ error: "Giveaway not found (it's older than 1 hour or never existed)." });
  }

  try {
    const channel = await client.channels.fetch(data.channelId).catch(() => null);
    if (!channel) {
      return res.status(500).json({ error: "Could not find the giveaway channel." });
    }
    const pool = data.entries || [];
    if (!pool.length) {
      return res.status(400).json({ error: "No entries to reroll." });
    }
    const winners = pickWinners(pool, data.winners);
    const winnerMentions = winners.map((id) => `<@${id}>`).join(", ");

    const now = Date.now();
    const roleAssignedUntil = now + WINNER_ROLE_DURATION_MS;
    const winnerMembers = [];

    const guild = channel.guild || client.guilds.cache.get(data.guildId);
    for (const winnerId of winners) {
      if (guild) {
        const winnerMember = await guild.members.fetch(winnerId).catch(() => null);
        if (winnerMember) {
          if (data.winnersRoleId) {
            await winnerMember.roles.add(data.winnersRoleId).catch(() => null);
          }
          await winnerMember.roles.add(GIVEAWAY_WINNER_ROLE_ID).catch(() => null);
          winnerMembers.push({ id: winnerId, name: winnerMember.user.username });
          scheduleWinnerRoleRemoval(guild.id, winnerId, roleAssignedUntil);
        } else {
          winnerMembers.push({ id: winnerId, name: winnerId });
        }
      } else {
        winnerMembers.push({ id: winnerId, name: winnerId });
      }
    }

    recordWinners({
      messageId,
      guildId: data.guildId,
      guildName: guild?.name || "Unknown",
      channelId: data.channelId,
      prize: data.prize,
      endedAt: now,
      roleAssignedUntil,
      winners: winnerMembers,
    });

    const winnerEmbed = new EmbedBuilder()
      .setColor(0x00BD5B)
      .setTitle("🎲 Reroll!")
      .setDescription(`${winnerMentions} won the reroll for **${data.prize}** !!`)
      .setFooter({ text: "Good luck next time!" });

    const giveawayUrl = `https://discord.com/channels/${data.guildId}/${data.channelId}/${messageId}`;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Giveaway Message ↗")
        .setStyle(ButtonStyle.Link)
        .setURL(giveawayUrl)
    );
    await channel.send({ embeds: [winnerEmbed], components: [row] });
    res.json({ success: true, action: "rerolled", prize: data.prize, winners });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to reroll" });
  }
});

app.get("/api/guilds/:guildId/channels", async (req, res) => {
  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });
  const channels = guild.channels.cache
    .filter(
      (c) =>
        c.type === ChannelType.GuildText &&
        c.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages)
    )
    .map((c) => ({ id: c.id, name: c.name }));
  res.json(channels);
});

app.get("/api/guilds/:guildId/roles", async (req, res) => {
  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });
  const roles = [...guild.roles.cache.values()]
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));
  res.json(roles);
});

app.get("/api/guilds/:guildId/emojis", async (req, res) => {
  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });
  const emojis = guild.emojis.cache.map((e) => ({
    id: e.id,
    name: e.name,
    animated: e.animated,
    url: typeof e.imageURL === "function" ? e.imageURL() : (e.url || ""),
    formatted: e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`,
  }));
  res.json(emojis);
});

app.get("/api/guilds/:guildId/members", async (req, res) => {
  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  // Fetch recent messages (last 200 per channel, last 20 channels)
  const recent = {};
  const channels = guild.channels.cache
    .filter(
      (c) =>
        c.type === ChannelType.GuildText &&
        c.permissionsFor(client.user)?.has(PermissionsBitField.Flags.ReadMessageHistory)
    )
    .first(20);

  for (const c of channels) {
    try {
      const msgs = await c.messages.fetch({ limit: 200 });
      for (const m of msgs.values()) {
        if (m.author.bot) continue;
        recent[m.author.id] = (recent[m.author.id] || 0) + 1;
      }
    } catch {}
  }

  // Merge persisted activity + recent fetch
  const tracked = activityStore[guild.id] || {};
  const combined = { ...tracked };
  for (const [id, n] of Object.entries(recent)) {
    combined[id] = (combined[id] || 0) + n;
  }

  // Ensure full member list is cached for names & statuses
  if (guild.members.cache.size < guild.memberCount) {
    await guild.members.fetch().catch(() => {});
  }

  const memberCache = guild.members.cache;

  // Merge voice activity
  const vc = voiceActivityStore[guild.id] || {};

  // Build top 20 by (activityCount + normalized voice time)
  const entryList = Object.entries(combined)
    .map(([id, msgCount]) => {
      const m = memberCache.get(id);
      return {
        id,
        name: m ? m.user.username : id,
        status: m ? (m.presence?.status || "offline") : "offline",
        messages: msgCount,
        voiceTimeMs: vc[id] || 0,
        score: msgCount + Math.floor((vc[id] || 0) / 60000), // 1 msg = 1, 1 min VC = 1
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  res.json({ totalMembers: guild.memberCount, members: entryList });
});

app.get("/api/guilds/:guildId/voice-activity", async (req, res) => {
  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });
  const tracked = voiceActivityStore[guild.id] || {};
  const entry = Object.entries(tracked);
  if (!entry.length) return res.json([]);

  const memberCache = guild.members.cache;
  if (memberCache.size < guild.memberCount) {
    await guild.members.fetch().catch(() => {});
  }

  const names = new Map();
  for (const [id] of entry) {
    const m = memberCache.get(id);
    if (m) names.set(id, m.user.username);
  }
  const missing = entry.filter(([id]) => !names.has(id)).map(([id]) => id).slice(0, 100);
  await Promise.all(
    missing.map(async (id) => {
      try {
        const u = await client.users.fetch(id);
        names.set(id, u.username);
      } catch {}
    })
  );

  const list = entry
    .map(([id, ms]) => ({
      id,
      name: names.get(id) || id,
      voiceTimeMs: ms,
      voiceTime: fmtDuration(ms),
    }))
    .sort((a, b) => b.voiceTimeMs - a.voiceTimeMs)
    .slice(0, 200);

  res.json(list);
});

app.post("/api/giveaway", async (req, res) => {
  const {
    guildId,
    channelId,
    minutes,
    winners,
    prize,
    host,
    requiredRoleIds,
    blockedRoleIds,
    requireAllRoles,
    extraEntries,
    stackEntries,
    isDrop,
    winnersRoleId,
    color,
    emoji,
    image,
    thumbnail,
    message,
    rejectionMessage,
  } = req.body;

  if (!guildId || !channelId || !minutes || !winners || !prize) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  if (!guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return res.status(403).json({ error: "Bot is missing Manage Messages permission in that server." });
  }

  try {
    const msg = await startGiveaway({
      guild,
      channelId,
      minutes,
      winners,
      prize,
      host: host || "GFX GIVEAWAY",
      requiredRoleIds: Array.isArray(requiredRoleIds) ? requiredRoleIds.filter(Boolean) : [],
      blockedRoleIds: Array.isArray(blockedRoleIds) ? blockedRoleIds.filter(Boolean) : [],
      requireAllRoles: Boolean(requireAllRoles),
      extraEntries: Array.isArray(extraEntries)
        ? extraEntries.filter((e) => e && e.roleId && e.entries > 0)
        : [],
      stackEntries: Boolean(stackEntries),
      isDrop: Boolean(isDrop),
      winnersRoleId: winnersRoleId || null,
      color: typeof color === "number" ? color : 0x00BD5B,
      emoji: emoji || "🎉",
      image: image || null,
      thumbnail: thumbnail || null,
      message: message || null,
      rejectionMessage: rejectionMessage || null,
    });
    res.json({ success: true, messageId: msg.id, channelId: msg.channel.id });
  } catch (err) {
    console.error("Dashboard giveaway error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(DASHBOARD_PORT, "0.0.0.0", () => {
  console.log(`🚀 Dashboard running on port ${DASHBOARD_PORT} (http://localhost:${DASHBOARD_PORT})`);
  if (process.env.NODE_ENV !== "production" && process.env.AUTO_OPEN_BROWSER !== "false" && process.platform !== "linux") {
    openBrowser(`http://localhost:${DASHBOARD_PORT}`);
  }
});

// Open the dashboard in the default browser when the bot starts
function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === "win32"
      ? `start "" "${url}"`
      : platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err && process.env.NODE_ENV !== "production") console.log("Could not auto-open browser:", err.message);
  });
}

// ---- Ticket system config — fill these in with your server IDs ----
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID || "PUT_CATEGORY_ID_HERE";
const SUPPORT_ROLE_ID = process.env.SUPPORT_ROLE_ID || "PUT_SUPPORT_ROLE_ID_HERE";
const GIVEAWAY_WINNER_ROLE_ID = process.env.GIVEAWAY_WINNER_ROLE_ID || "1532972012341956678";
const ticketCounters = new Map();

// ---- Server tag auto-role ----
const SERVER_TAG = String(process.env.SERVER_TAG || "GFX").trim().toUpperCase();
const SERVER_TAG_ROLE_ID = process.env.SERVER_TAG_ROLE_ID || "1535157101310115921";
const GUILD_ID = process.env.GUILD_ID || "1395645163547791370";

// ---- Winners persistence + auto role removal ----
const WINNERS_FILE = path.join(__dirname, "winners.json");
const WINNER_ROLE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 1 month

let winnersStore = [];
try {
  winnersStore = JSON.parse(fs.readFileSync(WINNERS_FILE, "utf8"));
  if (!Array.isArray(winnersStore)) winnersStore = [];
} catch {
  winnersStore = [];
}

function saveWinners() {
  try {
    fs.writeFileSync(WINNERS_FILE, JSON.stringify(winnersStore, null, 2));
  } catch (err) {
    console.error("Failed to save winners:", err);
  }
}

function recordWinners(entry) {
  if (!entry.winners.length) return;
  winnersStore.unshift(entry);
  if (winnersStore.length > 200) winnersStore.length = 200;
  saveWinners();
  sendWinnerLog(entry);
}

async function sendWinnerLog(entry) {
  if (!client.isReady()) return;
  try {
    let channel = null;
    const channelId = process.env.WINNER_LOG_CHANNEL_ID || "1535915013729026150";
    if (channelId && channelId !== "PUT_LOG_CHANNEL_ID_HERE") {
      channel = await client.channels.fetch(channelId).catch(() => null);
    }

    // Fallback: search for a winner log channel in the guild if channelId didn't match
    if (!channel || !channel.isTextBased()) {
      for (const guild of client.guilds.cache.values()) {
        const found = guild.channels.cache.find(
          (c) =>
            c.isTextBased() &&
            ["winner-logs", "winner-log", "giveaway-winners", "giveaway-logs", "winners"].includes(
              c.name.toLowerCase().trim()
            )
        );
        if (found) {
          channel = found;
          break;
        }
      }
    }

    if (!channel || !channel.isTextBased()) return;

    const winners = (entry.winners || [])
      .filter((w) => !w.expired)
      .map((w) => {
        const id = w.id && !String(w.id).startsWith("wheel-") ? w.id : null;
        const username = w.username && w.username !== w.name ? ` (@${w.username})` : "";
        return id ? `<@${id}>${username}` : `**${w.name || "Unknown"}**${username}`;
      })
      .join(", ");
    const endedAt = entry.endedAt || Date.now();
    const embed = new EmbedBuilder()
      .setColor(entry.isWheel ? 0x00BD5B : 0x6c60d7)
      .setTitle(entry.isWheel ? "🎰 Wheel Winner Log" : "🎉 Giveaway Winner Log")
      .setDescription(`**${winners || "None"}**`)
      .addFields(
        { name: "Prize", value: entry.prize || "—", inline: true },
        { name: "Date", value: `<t:${Math.floor(endedAt / 1000)}:F>`, inline: true }
      )
      .setTimestamp(new Date(endedAt));

    const components = [];
    if (entry.messageId && entry.guildId && entry.channelId) {
      const msgLink = `https://discord.com/channels/${entry.guildId}/${entry.channelId}/${entry.messageId}`;
      components.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Giveaway Message ↗")
            .setStyle(ButtonStyle.Link)
            .setURL(msgLink)
        )
      );
    }

    await channel.send({ embeds: [embed], components }).catch(() => {});
  } catch (err) {
    console.error("sendWinnerLog error:", err.message);
  }
}

async function removeWinnerRole(guildId, userId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  await member.roles.remove(GIVEAWAY_WINNER_ROLE_ID).catch(() => {});
}

function scheduleWinnerRoleRemoval(guildId, userId, until) {
  const delay = until - Date.now();
  if (delay <= 0) {
    removeWinnerRole(guildId, userId);
    return;
  }
  safeSetTimeout(() => removeWinnerRole(guildId, userId), delay);
}

function scheduleAllRemovals() {
  for (const entry of winnersStore) {
    for (const w of entry.winners) {
      if (!w.expired) scheduleWinnerRoleRemoval(entry.guildId, w.id, entry.roleAssignedUntil);
    }
  }
}

async function expireWinnerRoles() {
  const now = Date.now();
  let changed = false;
  for (const entry of winnersStore) {
    for (const w of entry.winners) {
      if (!w.expired && entry.roleAssignedUntil <= now) {
        w.expired = true;
        changed = true;
        await removeWinnerRole(entry.guildId, w.id);
      }
    }
  }
  if (changed) {
    winnersStore = winnersStore.filter((e) => e.winners.some((w) => !w.expired));
    saveWinners();
  }
}

// messageId -> { channelId, prize, winners, entries: Set(userIds) }
const activeGiveaways = new Map();
// Store ended giveaways briefly so $greroll / dashboard reroll can use them
const endedGiveaways = new Map();

// ---- Ended giveaway persistence (kept until manually deleted) ----
const ENDED_GIVEAWAYS_FILE = path.join(__dirname, "endedGiveaways.json");

function saveEndedGiveaways() {
  try {
    const data = {};
    for (const [id, g] of endedGiveaways) data[id] = g;
    fs.writeFileSync(ENDED_GIVEAWAYS_FILE, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save ended giveaways:", err);
  }
}

function loadEndedGiveaways() {
  try {
    const data = JSON.parse(fs.readFileSync(ENDED_GIVEAWAYS_FILE, "utf8"));
    for (const [id, g] of Object.entries(data)) {
      endedGiveaways.set(id, { ...g, entries: Array.isArray(g.entries) ? g.entries : [] });
    }
    console.log(`✅ Restored ${endedGiveaways.size} ended giveaway(s)`);
  } catch {
    // No saved ended giveaways yet
  }
}

// ---- Giveaway persistence (survives bot restarts) ----
const GIVEAWAYS_FILE = path.join(__dirname, "giveaways.json");

function saveGiveaways() {
  try {
    const data = {};
    for (const [id, g] of activeGiveaways) data[id] = g;
    fs.writeFileSync(GIVEAWAYS_FILE, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save giveaways:", err);
  }
}

function loadGiveaways() {
  try {
    const data = JSON.parse(fs.readFileSync(GIVEAWAYS_FILE, "utf8"));
    for (const [id, g] of Object.entries(data)) {
      activeGiveaways.set(id, { ...g, entries: Array.isArray(g.entries) ? g.entries : [] });
    }
    console.log(`✅ Restored ${activeGiveaways.size} active giveaway(s)`);
  } catch {
    // No saved giveaways yet
  }
}

function resumeGiveaways() {
  const now = Date.now();
  for (const [messageId, data] of activeGiveaways) {
    const remaining = (data.endAt || 0) - now;
    if (remaining <= 0) {
      endGiveaway(messageId);
    } else {
      safeSetTimeout(() => endGiveaway(messageId), remaining);
    }
  }
}

// setTimeout only accepts ~24.8 days (2^31-1 ms) — split longer delays safely
function safeSetTimeout(fn, delay) {
  const MAX = 2147483647;
  if (delay <= MAX) return setTimeout(fn, delay);
  return setTimeout(() => safeSetTimeout(fn, delay - MAX), MAX);
}

// ---- Voice time tracking ----
const voiceJoinTimes = new Map(); // userId -> { guildId, joinedAt }
const VOICE_ACTIVITY_FILE = path.join(__dirname, "voiceActivity.json");
let voiceActivityStore = {};
try {
  voiceActivityStore = JSON.parse(fs.readFileSync(VOICE_ACTIVITY_FILE, "utf8"));
  if (typeof voiceActivityStore !== "object" || Array.isArray(voiceActivityStore)) voiceActivityStore = {};
} catch {
  voiceActivityStore = {};
}

function saveVoiceActivity() {
  try {
    fs.writeFileSync(VOICE_ACTIVITY_FILE, JSON.stringify(voiceActivityStore));
  } catch (err) {
    console.error("Failed to save voice activity:", err);
  }
}

function trackVoiceActivity(guildId, userId, durationMs) {
  const g = (voiceActivityStore[guildId] ||= {});
  g[userId] = (g[userId] || 0) + durationMs;
}

function fmtDuration(ms) {
  if (!ms) return "0m";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs}h ${mins}m`;
}
const ACTIVITY_FILE = path.join(__dirname, "activity.json");
let activityStore = {};
try {
  activityStore = JSON.parse(fs.readFileSync(ACTIVITY_FILE, "utf8"));
  if (typeof activityStore !== "object" || Array.isArray(activityStore)) activityStore = {};
} catch {
  activityStore = {};
}
let activityDirty = false;

function saveActivity() {
  try {
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activityStore));
  } catch (err) {
    console.error("Failed to save activity:", err);
  }
}

function trackActivity(guildId, userId) {
  const g = (activityStore[guildId] ||= {});
  g[userId] = (g[userId] || 0) + 1;
  activityDirty = true;
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  loadGiveaways();
  loadEndedGiveaways();
  resumeGiveaways();
  scheduleAllRemovals();
  setInterval(expireWinnerRoles, 5 * 60 * 1000);
  setInterval(() => {
    if (activityDirty) {
      saveActivity();
      activityDirty = false;
    }
  }, 10000);
  syncServerTagRoles();

  // Auto-deploy slash commands if needed
  try {
    const { commands } = require("./deploy-commands");
    if (Array.isArray(commands) && client.application) {
      await client.application.commands.set(commands);
      console.log(`✅ Auto-deployed ${commands.length} slash commands (including /spin)`);
    }
  } catch (err) {
    console.warn("Slash command registration notice:", err.message);
  }
});

// ---- Server tag auto-role logic ----
function hasServerTag(member) {
  if (!member || !member.user) return false;

  // 1. Official Discord Clan / Guild Tag
  const clan = member.user.clan || member.user.primaryGuild;
  if (clan && typeof clan === "object") {
    const clanTag = String(clan.tag || "").toUpperCase();
    const clanGid = String(clan.identityGuildId || clan.identity_guild_id || "");
    if (clanTag === SERVER_TAG || clanGid === GUILD_ID) return true;
  }

  // 2. Server Nickname
  if (member.nickname && member.nickname.toUpperCase().includes(SERVER_TAG)) {
    return true;
  }

  // 3. Global Display Name & Display Name
  if (member.user.globalName && member.user.globalName.toUpperCase().includes(SERVER_TAG)) {
    return true;
  }
  if (member.displayName && member.displayName.toUpperCase().includes(SERVER_TAG)) {
    return true;
  }

  // 4. Username
  if (member.user.username && member.user.username.toUpperCase().includes(SERVER_TAG)) {
    return true;
  }

  // 5. Presence / Custom Status
  if (member.presence && Array.isArray(member.presence.activities)) {
    for (const act of member.presence.activities) {
      if (act.state && act.state.toUpperCase().includes(SERVER_TAG)) return true;
      if (act.name && act.name.toUpperCase().includes(SERVER_TAG)) return true;
    }
  }

  // 6. Avatar decoration / banner tags if applicable
  if (member.avatarDecorationData && member.avatarDecorationData.asset) {
    return true;
  }

  return false;
}

async function syncServerTagRoles() {
  for (const guild of client.guilds.cache.values()) {
    const role = guild.roles.cache.get(SERVER_TAG_ROLE_ID);
    if (!role) continue;

    // Check bot role hierarchy
    const botMember = guild.members.me;
    if (botMember && botMember.roles.highest.position <= role.position) {
      console.warn(`⚠️ [ROLE HIERARCHY WARNING] In guild "${guild.name}", the bot's highest role is lower than or equal to "${role.name}". Drag the bot's role ABOVE "${role.name}" in Server Settings -> Roles.`);
    }

    if (guild.members.cache.size < guild.memberCount) {
      await guild.members.fetch().catch(() => {});
    }
    for (const member of guild.members.cache.values()) {
      await applyServerTagRole(member);
    }
  }
}

async function applyServerTagRole(member) {
  if (!member || member.user.bot) return;
  const role = member.guild.roles.cache.get(SERVER_TAG_ROLE_ID);
  if (!role) return;

  const equipped = hasServerTag(member);
  const hasRole = member.roles.cache.has(SERVER_TAG_ROLE_ID);

  try {
    if (equipped && !hasRole) {
      await member.roles.add(role, "Auto Tag Role: GFX tag detected");
      console.log(`✅ Server tag role [GFX] added to ${member.user.tag} (${member.id})`);
    } else if (!equipped && hasRole) {
      await member.roles.remove(role, "Auto Tag Role: GFX tag removed");
      console.log(`❌ Server tag role [GFX] removed from ${member.user.tag} (${member.id})`);
    }
  } catch (err) {
    console.error(`Failed to sync server tag role for ${member.user.tag}:`, err.message);
  }
}

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const oldHas = hasServerTag(oldMember);
  const newHas = hasServerTag(newMember);
  if (oldHas !== newHas) await applyServerTagRole(newMember);
});

client.on("guildMemberAdd", (member) => applyServerTagRole(member));

client.on("userUpdate", async (oldUser, newUser) => {
  for (const guild of client.guilds.cache.values()) {
    const member = guild.members.cache.get(newUser.id);
    if (member) await applyServerTagRole(member);
  }
});

client.on("presenceUpdate", async (oldPresence, newPresence) => {
  if (newPresence && newPresence.member) {
    await applyServerTagRole(newPresence.member);
  }
});

// ---------- Message lookup across channels & threads ----------
// Accepts a bare message ID or a full Discord message link and searches
// the given channel, all visible text channels, then active + archived
// threads (including forum posts) so reactions can be read from messages
// in threads — even archived ones.
function parseMessageTarget(input) {
  if (!input) return null;
  const str = String(input).trim();
  const urlMatch = str.match(/\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (urlMatch) return { messageId: urlMatch[3], channelId: urlMatch[2] };
  if (/^\d{17,20}$/.test(str)) return { messageId: str, channelId: null };
  return null;
}

async function findMessageAcrossGuild(guild, messageId, preferredChannel = null) {
  const canFetch = (ch) =>
    ch.isTextBased() &&
    ch.permissionsFor(client.user)?.has(PermissionsBitField.Flags.ReadMessageHistory);

  const searchedIds = new Set();
  const tryFetch = async (ch) => {
    if (!ch || searchedIds.has(ch.id) || !canFetch(ch)) return null;
    searchedIds.add(ch.id);
    try {
      return (await ch.messages.fetch(messageId).catch(() => null)) || null;
    } catch {
      return null;
    }
  };

  // 1) Preferred / explicitly specified channel first (cheapest).
  // Re-fetch it by ID so threads resolve too — GET /channels/{id} works
  // for thread channels that aren't in the cache after a restart.
  if (preferredChannel && preferredChannel.id) {
    const fresh = await guild.channels.fetch(preferredChannel.id).catch(() => null);
    const channel = fresh || preferredChannel;
    const msg = await tryFetch(channel);
    if (msg) return { message: msg, channel };
  }

  // 2) Make sure channels are cached
  try {
    if (guild.channels.cache.size === 0) await guild.channels.fetch();
  } catch {}

  // 3) Search every text channel the bot can read history in
  const channels = [];
  for (const ch of guild.channels.cache.values()) {
    if (ch.isThread() || !canFetch(ch)) continue;
    channels.push(ch);
    const msg = await tryFetch(ch);
    if (msg) return { message: msg, channel: ch };
  }

  // 4) Search threads: active (guild-wide) + archived (paginated)
  const threadChannels = [];
  try {
    const activeAll = await guild.channels.fetchActiveThreads().catch(() => null);
    if (activeAll) threadChannels.push(...activeAll.threads.values());
  } catch {}

  for (const ch of channels) {
    try {
      const active = await ch.threads.fetchActive().catch(() => null);
      if (active) threadChannels.push(...active.threads.values());
    } catch {}

    for (const type of ["public", "private"]) {
      let before;
      for (let page = 0; page < 3; page++) {
        let batch;
        try {
          batch = await ch.threads.fetchArchived({ type, before, limit: 100 }).catch(() => null);
        } catch {}
        if (!batch || !batch.threads.size) break;
        threadChannels.push(...batch.threads.values());
        before = batch.threads.last();
      }
    }
  }

  for (const t of threadChannels) {
    const msg = await tryFetch(t);
    if (msg) return { message: msg, channel: t };
  }

  return { message: null, channel: null };
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  trackActivity(message.guild.id, message.author.id);
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const member = message.member;

  // ---------- HELP ----------
  if (command === "help") {
    return message.reply({
      embeds: [
        {
          color: 0x5865f2,
          title: "📖 Command List",
          fields: [
            { name: "$gc <minutes> <winners> <@role> <prize>", value: "Start a giveaway (Manage Messages required)" },
            { name: "$grestore <messageId> <minutes>", value: "Re-attach an existing giveaway message and start a fresh countdown" },
            { name: "$gend <messageId>", value: "End a giveaway early and pick winner(s)" },
            { name: "$greroll <messageId>", value: "Reroll winner(s) for an ended giveaway" },
            { name: "$kick @user [reason]", value: "Kick a member" },
            { name: "$ban @user [reason]", value: "Ban a member" },
            { name: "$mute @user <minutes> [reason]", value: "Timeout a member" },
            { name: "$unmute @user", value: "Remove a member's timeout" },
            { name: "$clear <amount>", value: "Bulk delete messages (max 100)" },
            { name: "$ticketpanel", value: "Post the ticket panel — Support / Giveaway / PropAccountBuy (Manage Channels required)" },
          ],
        },
      ],
    });
  }

  // ---------- TICKET: PANEL ----------
  if (command === "ticketpanel") {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply("❌ You don't have permission to set up the ticket panel.");
    }

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🎫 Ticket Area")
      .setDescription("To create a ticket, use one of the buttons below.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket_support")
        .setLabel("Support")
        .setEmoji("✉️")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("create_ticket_giveaway")
        .setLabel("Giveaway")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("create_ticket_propaccount")
        .setLabel("PropAccountBuy")
        .setEmoji("💳")
        .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete().catch(() => {});
  }

  // ---------- GIVEAWAY: CREATE ----------
  if (command === "gc") {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("❌ You don't have permission to create a giveaway.");
    }

    const minutes = parseInt(args[0]);
    const winners = parseInt(args[1]);
    const entryRole = message.mentions.roles.first();
    const prize = args.slice(entryRole ? 3 : 2).join(" ");

    if (!minutes || !winners || !entryRole || !prize) {
      return message.reply(
        "Usage: `$gc <minutes> <winners> <@role> <prize>`\nExample: `$gc 10 1 @Premium Member 25K Giveaway Future Account`"
      );
    }

    const giveawayMessage = await startGiveaway({
      guild: message.guild,
      channelId: message.channel.id,
      minutes,
      winners,
      requiredRoleIds: [entryRole.id],
      prize,
      host: message.author.toString(),
    });

    await message.delete().catch(() => {});
    void giveawayMessage;
  }

  // ---------- GIVEAWAY: RESTORE (adopt an existing message + fresh countdown) ----------
  if (command === "grestore") {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("❌ You don't have permission to restore a giveaway.");
    }
    const messageId = args[0];
    const minutes = parseInt(args[1]);
    if (!messageId || !minutes) {
      return message.reply("Usage: `$grestore <messageId> <minutes>`\nExample: `$grestore 1535187120237449277 60`");
    }

    const target = await message.channel.messages.fetch(messageId).catch(() => null);
    if (!target) {
      return message.reply("❌ Couldn't find that message in this channel. Run the command in the same channel as the giveaway.");
    }

    const oldEmbed = target.embeds && target.embeds[0];
    if (!oldEmbed) {
      return message.reply("❌ That message has no giveaway embed I can read.");
    }

    // Auto-detect details from the existing embed so users only type the message ID + minutes
    const prize = (oldEmbed.title || "").replace(/^\s*🎉\s*/, "").trim() || "Giveaway";
    const winners = parseInt((oldEmbed.description || "").match(/Winners:\*\*\s*(\d+)/)?.[1], 10) || 1;
    const roleMatch = (oldEmbed.description || "").match(/Requirements:\*\*\s*<@&(\d+)>/);
    const requiredRoleIds = roleMatch ? [roleMatch[1]] : [];
    const hostMatch = (oldEmbed.description || "").match(/Hosted by:\*\*\s*(<@\d+>)/);

    if (!requiredRoleIds.length) {
      return message.reply("❌ Couldn't find the required role in that embed.");
    }

    const endTime = Math.floor((Date.now() + minutes * 60000) / 1000);
    const lines = [`Click the button below to enter!\n`];
    lines.push(`⏰ **Ends:** <t:${endTime}:R>`);
    lines.push(`👑 **Hosted by:** ${hostMatch ? hostMatch[1] : message.author.toString()}`);
    lines.push(`🏆 **Winners:** ${winners}`);
    lines.push(`🔒 **Requirements:** ${requiredRoleIds.map((id) => `<@&${id}>`).join(", ")}`);
    lines.push(`🏆 Previous giveaway winners cannot enter.`);

    const embed = {
      color: 0x00BD5B,
      title: `🎉 ${prize}`,
      description: lines.join("\n"),
      footer: { text: "Good luck!" },
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("enter_giveaway")
        .setLabel("Enter Giveaway")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("participants_giveaway")
        .setLabel("Participants 0")
        .setEmoji("👥")
        .setStyle(ButtonStyle.Secondary)
    );

    await target.edit({ embeds: [embed], components: [row] });

    activeGiveaways.set(target.id, {
      guildId: message.guild.id,
      channelId: message.channel.id,
      createdAt: Date.now(),
      host: hostMatch ? hostMatch[1] : message.author.toString(),
      prize,
      winners,
      requiredRoleIds,
      blockedRoleIds: [],
      requireAllRoles: false,
      extraEntries: [],
      stackEntries: false,
      isDrop: false,
      winnersRoleId: null,
      emoji: "🎉",
      entries: [],
      endAt: Date.now() + minutes * 60000,
    });
    saveGiveaways();
    safeSetTimeout(() => endGiveaway(target.id), minutes * 60000);

    await message.delete().catch(() => {});
    return message.channel.send(`✅ Giveaway restored with a fresh countdown! **${prize}** ends in **${minutes} minute(s)**.`);
  }

  // ---------- GIVEAWAY: END EARLY ----------
  if (command === "gend") {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("❌ You don't have permission to end a giveaway.");
    }
    const messageId = args[0];
    if (!messageId || !activeGiveaways.has(messageId)) {
      return message.reply("❌ That's not an active giveaway message ID.");
    }
    await endGiveaway(messageId);
    return message.reply("✅ Giveaway ended.");
  }

  // ---------- GIVEAWAY: REROLL ----------
  if (command === "greroll") {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("❌ You don't have permission to reroll a giveaway.");
    }
    const messageId = args[0];
    const data = endedGiveaways.get(messageId);
    if (!data) {
      return message.reply("❌ That's not a recently ended giveaway I can reroll.");
    }
    const pool = [...data.entries];
    if (pool.length === 0) {
      return message.channel.send("❌ No valid entries to reroll from.");
    }
    const newWinners = pickWinners(pool, data.winners);
    const announced = newWinners.map((id) => `<@${id}>`).join(", ");
    // Save rerolled winners to winnersStore so they appear on the dashboard
    const now = Date.now();
    const roleAssignedUntil = now + WINNER_ROLE_DURATION_MS;
    const winnerMembers = [];
    const guild = message.guild || client.guilds.cache.get(data.guildId);

    for (const winnerId of newWinners) {
      if (guild) {
        const winnerMember = await guild.members.fetch(winnerId).catch(() => null);
        if (winnerMember) {
          if (data.winnersRoleId) {
            await winnerMember.roles.add(data.winnersRoleId).catch(() => null);
          }
          await winnerMember.roles.add(GIVEAWAY_WINNER_ROLE_ID).catch(() => null);
          winnerMembers.push({ id: winnerId, name: winnerMember.user.username });
          scheduleWinnerRoleRemoval(guild.id, winnerId, roleAssignedUntil);
        } else {
          winnerMembers.push({ id: winnerId, name: winnerId });
        }
      } else {
        winnerMembers.push({ id: winnerId, name: winnerId });
      }
    }

    recordWinners({
      messageId,
      guildId: data.guildId,
      guildName: guild?.name || "Unknown",
      channelId: data.channelId,
      prize: data.prize,
      endedAt: now,
      roleAssignedUntil,
      winners: winnerMembers,
    });
    return message.channel.send(
      `🔁 New winner(s) for **${data.prize}**: ${announced}`
    );
  }

  // ---------- MODERATION: KICK ----------
  if (command === "kick") {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply("❌ You don't have permission to kick members.");
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply("Usage: `$kick @user [reason]`");
    const reason = args.slice(1).join(" ") || "No reason provided";
    if (!target.kickable) return message.reply("❌ I can't kick that member.");
    await target.kick(reason);
    return message.reply(`✅ Kicked ${target.user.tag} — ${reason}`);
  }

  // ---------- MODERATION: BAN ----------
  if (command === "ban") {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply("❌ You don't have permission to ban members.");
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply("Usage: `$ban @user [reason]`");
    const reason = args.slice(1).join(" ") || "No reason provided";
    if (!target.bannable) return message.reply("❌ I can't ban that member.");
    await target.ban({ reason });
    return message.reply(`✅ Banned ${target.user.tag} — ${reason}`);
  }

  // ---------- MODERATION: MUTE (timeout) ----------
  if (command === "mute") {
    if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply("❌ You don't have permission to mute members.");
    }
    const target = message.mentions.members.first();
    const minutes = parseInt(args[1]);
    if (!target || !minutes) return message.reply("Usage: `$mute @user <minutes> [reason]`");
    const reason = args.slice(2).join(" ") || "No reason provided";
    await target.timeout(minutes * 60000, reason);
    return message.reply(`🔇 Muted ${target.user.tag} for ${minutes} minute(s) — ${reason}`);
  }

  // ---------- MODERATION: UNMUTE ----------
  if (command === "unmute") {
    if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply("❌ You don't have permission to unmute members.");
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply("Usage: `$unmute @user`");
    await target.timeout(null);
    return message.reply(`🔊 Unmuted ${target.user.tag}`);
  }

  // ---------- MODERATION: CLEAR ----------
  if (command === "clear") {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("❌ You don't have permission to clear messages.");
    }
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply("Usage: `$clear <amount 1-100>`");
    }
    await message.channel.bulkDelete(amount, true).catch(() => {});
    const confirmation = await message.channel.send(`🧹 Cleared ${amount} messages.`);
    setTimeout(() => confirmation.delete().catch(() => {}), 3000);
  }

function parseWheelEntries(rawInput) {
  if (!rawInput) return [];
  const rawItems = typeof rawInput === "string" ? rawInput.split(/[\n,;]+/) : Array.isArray(rawInput) ? rawInput : [String(rawInput)];
  const results = [];

  for (let item of rawItems) {
    item = item.trim().replace(/^[\d+.-]+[.)]\s*/, "").replace(/^["']|["']$/g, "").trim();
    if (!item) continue;

    const match = item.match(/^(.+?)\s*(?:[xX*:]|\()\s*(\d+)\s*\)?$/);
    if (match && match[1].trim() && parseInt(match[2], 10) > 0) {
      const name = match[1].trim();
      const count = Math.min(200, parseInt(match[2], 10));
      for (let i = 0; i < count; i++) results.push(name);
    } else {
      results.push(item);
    }
  }
  return results;
}

  // ---------- WHEEL OF NAMES: SPIN ----------
  if (command === "spin") {
    const sub = (args[0] || "").toLowerCase();
    let entries = [];
    let wheelName = "";
    let colorPalette = "green_black";

    try {
      switch (sub) {
        case "members": {
          const role = message.mentions.roles.first();
          await message.guild.members.fetch();
          let members = message.guild.members.cache.filter((m) => !m.user.bot);
          if (role) {
            members = members.filter((m) => m.roles.cache.has(role.id));
            wheelName = `${role.name} Members`;
          } else {
            wheelName = `${message.guild.name} Members`;
          }
          entries = members.map((m) => m.displayName);
          break;
        }

        case "custom": {
          const entriesString = args.slice(1).join(" ");
          if (!entriesString) {
            return message.reply("Usage: `$spin custom <entry1>, <entry2>, ...`\nExample: `$spin custom Pizza x2, Burgers, Tacos`");
          }
          entries = parseWheelEntries(entriesString);
          wheelName = "Custom Wheel";
          break;
        }

        case "reactions": {
          const parsed = parseMessageTarget(args[1]);
          if (!parsed) {
            return message.reply("Usage: `$spin reactions <messageId>` or `$spin reactions <message link>`\nExample: `$spin reactions 1535187120237449277`");
          }
          const preferred = parsed.channelId ? { id: parsed.channelId } : message.channel;
          const { message: target } = await findMessageAcrossGuild(message.guild, parsed.messageId, preferred);

          if (!target) {
            return message.reply("❌ Couldn't find that message in any visible channel. Make sure the message ID is correct and the bot has access to that channel (including archived threads).");
          }
          const users = new Set();
          for (const [emoji, reaction] of target.reactions.cache) {
            const reactionUsers = await reaction.users.fetch().catch(() => []);
            reactionUsers.forEach((u) => {
              if (!u.bot) users.add(u.displayName || u.username);
            });
          }
          entries = Array.from(users);
          wheelName = "Reaction Giveaway";
          break;
        }

        case "voice": {
          let voiceChannel = message.member.voice?.channel;
          if (!voiceChannel) {
            return message.reply("❌ You must be in a voice channel, or mention a channel: `$spin voice`");
          }
          const voiceMembers = voiceChannel.members.filter((m) => !m.user.bot);
          entries = voiceMembers.map((m) => m.displayName);
          wheelName = `${voiceChannel.name} Voice`;
          break;
        }

        default: {
          const directText = args.join(" ").trim();
          if (directText && (directText.includes(",") || directText.includes("\n") || args.length >= 2)) {
            entries = parseWheelEntries(directText);
            wheelName = "Wheel of Spin";
          } else {
            return message.reply(
              "🎡 **Wheel of Spin** — Usage:\n`$spin <entry1>, <entry2>, ...` — spin with custom entries\n`$spin members [@role]` — spin with server members\n`$spin reactions <messageId>` — spin with message reactions\n`$spin voice` — spin with voice channel members"
            );
          }
        }
      }

      if (entries.length < 2) {
        return message.reply("❌ Need at least 2 entries to spin the wheel.");
      }
      if (entries.length > 1000) {
        entries = entries.slice(0, 1000);
        wheelName += " (Limited to 1000)";
      }

      const win = await message.reply({ content: "🎡 Spinning the wheel..." });

      const spin = await generateWheelGIF(entries, {
        colorPalette,
        duration: 4000,
        fps: 20,
        spinRevolutions: 4,
      });
      const gifBuffer = spin.buffer;
      const winner = spin.winner;
      const spinDuration = spin.spinDuration;

      // Resolve the winning member so we can mention them properly
      const spinMember = message.guild.members.cache.find(
        (m) => m.displayName === winner || m.user.username === winner || m.user.globalName === winner
      );
      const winnerText = spinMember ? `<@${spinMember.id}>` : `**${winner}**`;

      const attachment = new AttachmentBuilder(gifBuffer, { name: "wheel-spin.webp" });

      // 1) Show the wheel (animation starts) — plain message, no embed
      const wheelMsg = await win.edit({
        files: [attachment],
      });

      // 2) Wait for the wheel to fully stop before announcing
      await new Promise((r) => setTimeout(r, spinDuration + 500));

      // 3) Only AFTER the wheel stops: announce the winner
      const announceMsg = await message.channel.send(`🎉 **We have a winner!**\n\n${winnerText}`);

      // Save winner to dashboard + auto-assign Giveaway Winner role (1 month expiry)
      try {
        const guildId = message.guild.id;
        const now = Date.now();
        const roleAssignedUntil = now + WINNER_ROLE_DURATION_MS;
        const winnerData = { id: spinMember ? spinMember.id : winner, name: winner, username: spinMember ? spinMember.user.username : winner };
        if (spinMember) {
          await spinMember.roles.add(GIVEAWAY_WINNER_ROLE_ID).catch(() => {});
          scheduleWinnerRoleRemoval(guildId, spinMember.id, roleAssignedUntil);
        }
        recordWinners({
          messageId: announceMsg.id,
          guildId,
          guildName: message.guild.name,
          channelId: message.channel.id,
          prize: wheelName,
          endedAt: now,
          roleAssignedUntil,
          isWheel: true,
          winners: [winnerData],
        });
      } catch (err) {
        console.error("Spin winner logging failed:", err.message);
      }

      // Reaction on the announcement
      try {
        await announceMsg.react("🎉").catch(() => {});
      } catch {}

      return;
    } catch (err) {
      console.error("Spin command error:", err);
      return message.reply(`❌ An error occurred: ${err.message}`);
    }
  }
});

// ---------- Slash command handlers ----------
async function handleSlashCommand(interaction) {
  const { commandName, options } = interaction;
  const member = interaction.member;

  switch (commandName) {
    case "help": {
      return interaction.reply({
        embeds: [
          {
            color: 0x5865f2,
            title: "📖 Command List",
            fields: [
              { name: "/gc <minutes> <winners> <@role> <prize>", value: "Start a giveaway (Manage Messages required)" },
              { name: "/grestore <messageId> <minutes>", value: "Re-attach an existing giveaway message and start a fresh countdown" },
              { name: "/gend <messageId>", value: "End a giveaway early and pick winner(s)" },
              { name: "/greroll <messageId>", value: "Reroll winner(s) for an ended giveaway" },
              { name: "/kick @user [reason]", value: "Kick a member" },
              { name: "/ban @user [reason]", value: "Ban a member" },
              { name: "/mute @user <minutes> [reason]", value: "Timeout a member" },
              { name: "/unmute @user", value: "Remove a member's timeout" },
              { name: "/clear <amount>", value: "Bulk delete messages (max 100)" },
              { name: "/ticketpanel", value: "Post the ticket panel — Support / Giveaway / PropAccountBuy (Manage Channels required)" },
              { name: "/spin members|custom|reactions|voice", value: "Spin a wheel of names to pick a winner" },
            ],
          },
        ],
      });
    }

    case "ticketpanel": {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply("❌ You don't have permission to set up the ticket panel.");
      }

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("🎫 Ticket Area")
        .setDescription("To create a ticket, use one of the buttons below.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket_support")
          .setLabel("Support")
          .setEmoji("✉️")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("create_ticket_giveaway")
          .setLabel("Giveaway")
          .setEmoji("🎉")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("create_ticket_propaccount")
          .setLabel("PropAccountBuy")
          .setEmoji("💳")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply("✅ Ticket panel posted.");
    }

    case "gc": {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply("❌ You don't have permission to create a giveaway.");
      }

      const minutes = options.getInteger("minutes");
      const winners = options.getInteger("winners");
      const entryRole = options.getRole("role");
      const prize = options.getString("prize");

      const giveawayMessage = await startGiveaway({
        guild: interaction.guild,
        channelId: interaction.channel.id,
        minutes,
        winners,
        requiredRoleIds: [entryRole.id],
        prize,
        host: interaction.user.toString(),
      });

      return interaction.reply(`✅ Giveaway started! ${interaction.channel} — **${prize}** ends in **${minutes} minute(s)**.`);
    }

    case "grestore": {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply("❌ You don't have permission to restore a giveaway.");
      }
      const messageId = options.getString("message_id");
      const minutes = options.getInteger("minutes");

      const target = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (!target) {
        return interaction.reply("❌ Couldn't find that message in this channel. Run the command in the same channel as the giveaway.");
      }

      const oldEmbed = target.embeds && target.embeds[0];
      if (!oldEmbed) {
        return interaction.reply("❌ That message has no giveaway embed I can read.");
      }

      const prize = (oldEmbed.title || "").replace(/^\s*🎉\s*/, "").trim() || "Giveaway";
      const winners = parseInt((oldEmbed.description || "").match(/Winners:\*\*\s*(\d+)/)?.[1], 10) || 1;
      const roleMatch = (oldEmbed.description || "").match(/Requirements:\*\*\s*<@&(\d+)>/);
      const requiredRoleIds = roleMatch ? [roleMatch[1]] : [];
      const hostMatch = (oldEmbed.description || "").match(/Hosted by:\*\*\s*(<@\d+>)/);

      if (!requiredRoleIds.length) {
        return interaction.reply("❌ Couldn't find the required role in that embed.");
      }

      const endTime = Math.floor((Date.now() + minutes * 60000) / 1000);
      const lines = [`Click the button below to enter!\n`];
      lines.push(`⏰ **Ends:** <t:${endTime}:R>`);
      lines.push(`👑 **Hosted by:** ${hostMatch ? hostMatch[1] : interaction.user.toString()}`);
      lines.push(`🏆 **Winners:** ${winners}`);
      lines.push(`🔒 **Requirements:** ${requiredRoleIds.map((id) => `<@&${id}>`).join(", ")}`);
      lines.push(`🏆 Previous giveaway winners cannot enter.`);

      const embed = {
        color: 0x00BD5B,
        title: `🎉 ${prize}`,
        description: lines.join("\n"),
        footer: { text: "Good luck!" },
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("enter_giveaway")
          .setLabel("Enter Giveaway")
          .setEmoji("🎉")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("participants_giveaway")
          .setLabel("Participants 0")
          .setEmoji("👥")
          .setStyle(ButtonStyle.Secondary)
      );

      await target.edit({ embeds: [embed], components: [row] });

      activeGiveaways.set(target.id, {
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        createdAt: Date.now(),
        host: hostMatch ? hostMatch[1] : interaction.user.toString(),
        prize,
        winners,
        requiredRoleIds,
        blockedRoleIds: [],
        requireAllRoles: false,
        extraEntries: [],
        stackEntries: false,
        isDrop: false,
        winnersRoleId: null,
        emoji: "🎉",
        entries: [],
        endAt: Date.now() + minutes * 60000,
      });
      saveGiveaways();
      safeSetTimeout(() => endGiveaway(target.id), minutes * 60000);

      return interaction.reply(`✅ Giveaway restored with a fresh countdown! **${prize}** ends in **${minutes} minute(s)**.`);
    }

    case "gend": {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply("❌ You don't have permission to end a giveaway.");
      }
      const messageId = options.getString("message_id");
      if (!messageId || !activeGiveaways.has(messageId)) {
        return interaction.reply("❌ That's not an active giveaway message ID.");
      }
      await endGiveaway(messageId);
      return interaction.reply("✅ Giveaway ended.");
    }

    case "greroll": {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply("❌ You don't have permission to reroll a giveaway.");
      }
      const messageId = options.getString("message_id");
      const data = endedGiveaways.get(messageId);
      if (!data) {
        return interaction.reply("❌ That's not a recently ended giveaway I can reroll.");
      }
      const pool = [...data.entries];
      if (pool.length === 0) {
        return interaction.channel.send("❌ No valid entries to reroll from.");
      }
      const newWinners = pickWinners(pool, data.winners);
      const announced = newWinners.map((id) => `<@${id}>`).join(", ");
      const now = Date.now();
      const roleAssignedUntil = now + WINNER_ROLE_DURATION_MS;
      const winnerMembers = [];
      const guild = interaction.guild || client.guilds.cache.get(data.guildId);

      for (const winnerId of newWinners) {
        if (guild) {
          const winnerMember = await guild.members.fetch(winnerId).catch(() => null);
          if (winnerMember) {
            if (data.winnersRoleId) {
              await winnerMember.roles.add(data.winnersRoleId).catch(() => null);
            }
            await winnerMember.roles.add(GIVEAWAY_WINNER_ROLE_ID).catch(() => null);
            winnerMembers.push({ id: winnerId, name: winnerMember.user.username });
            scheduleWinnerRoleRemoval(guild.id, winnerId, roleAssignedUntil);
          } else {
            winnerMembers.push({ id: winnerId, name: winnerId });
          }
        } else {
          winnerMembers.push({ id: winnerId, name: winnerId });
        }
      }

      recordWinners({
        messageId,
        guildId: data.guildId,
        guildName: guild?.name || "Unknown",
        channelId: data.channelId,
        prize: data.prize,
        endedAt: now,
        roleAssignedUntil,
        winners: winnerMembers,
      });
      await interaction.reply(`🔁 New winner(s) for **${data.prize}**: ${announced}`);
      return;
    }

    case "kick": {
      if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply("❌ You don't have permission to kick members.");
      }
      const target = options.getMember("user");
      if (!target) return interaction.reply("❌ That member isn't in this server.");
      const reason = options.getString("reason") || "No reason provided";
      if (!target.kickable) return interaction.reply("❌ I can't kick that member.");
      await target.kick(reason);
      return interaction.reply(`✅ Kicked ${target.user.tag} — ${reason}`);
    }

    case "ban": {
      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply("❌ You don't have permission to ban members.");
      }
      const target = options.getMember("user");
      if (!target) return interaction.reply("❌ That member isn't in this server.");
      const reason = options.getString("reason") || "No reason provided";
      if (!target.bannable) return interaction.reply("❌ I can't ban that member.");
      await target.ban({ reason });
      return interaction.reply(`✅ Banned ${target.user.tag} — ${reason}`);
    }

    case "mute": {
      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply("❌ You don't have permission to mute members.");
      }
      const target = options.getMember("user");
      const minutes = options.getInteger("minutes");
      if (!target) return interaction.reply("❌ That member isn't in this server.");
      const reason = options.getString("reason") || "No reason provided";
      await target.timeout(minutes * 60000, reason);
      return interaction.reply(`🔇 Muted ${target.user.tag} for ${minutes} minute(s) — ${reason}`);
    }

    case "unmute": {
      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply("❌ You don't have permission to unmute members.");
      }
      const target = options.getMember("user");
      if (!target) return interaction.reply("❌ That member isn't in this server.");
      await target.timeout(null);
      return interaction.reply(`🔊 Unmuted ${target.user.tag}`);
    }

    case "clear": {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply("❌ You don't have permission to clear messages.");
      }
      const amount = options.getInteger("amount");
      if (!amount || amount < 1 || amount > 100) {
        return interaction.reply("Usage: /clear <amount 1-100>");
      }
      await interaction.channel.bulkDelete(amount, true).catch(() => {});
      await interaction.reply(`🧹 Cleared ${amount} messages.`);
      return;
    }

    case "spin": {
      await interaction.deferReply();
      const subcommand = options.getSubcommand();
      let entries = [];
      let wheelName = "";
      const colorPalette = "green_black";

      try {
        switch (subcommand) {
          case "members": {
            const role = options.getRole("role");
            await interaction.guild.members.fetch();
            let members = interaction.guild.members.cache.filter((m) => !m.user.bot);
            if (role) {
              members = members.filter((m) => m.roles.cache.has(role.id));
              wheelName = `${role.name} Members`;
            } else {
              wheelName = `${interaction.guild.name} Members`;
            }
            entries = members.map((m) => m.displayName);
            break;
          }

          case "custom": {
            const entriesString = options.getString("entries");
            entries = parseWheelEntries(entriesString);
            wheelName = "Custom Wheel";
            break;
          }

          case "reactions": {
            const parsed = parseMessageTarget(options.getString("message_id"));
            const channelOption = options.getChannel("channel");
            const guild = interaction.guild;

            if (!parsed) {
              return interaction.editReply(
                "❌ That doesn't look like a valid message ID or Discord message link."
              );
            }
            const preferred = parsed.channelId ? { id: parsed.channelId } : channelOption || interaction.channel;
            const { message: target, channel: foundIn } = await findMessageAcrossGuild(
              guild,
              parsed.messageId,
              preferred
            );

            if (!target) {
              return interaction.editReply(
                `❌ Couldn't find a message with that ID. Make sure the message is in a channel the bot can see (not an archived thread or private channel).`
              );
            }
            if (foundIn && channelOption) {
              console.log(`[spin reactions] Found message in <#${foundIn.id}> (${foundIn.name})`);
            }
            const users = new Set();
            for (const [emoji, reaction] of target.reactions.cache) {
              const reactionUsers = await reaction.users.fetch().catch(() => []);
              reactionUsers.forEach((u) => {
                if (!u.bot) users.add(u.displayName || u.username);
              });
            }
            entries = Array.from(users);
            wheelName = "Reaction Giveaway";
            break;
          }

          case "voice": {
            const voiceChannel = interaction.member.voice?.channel;
            if (!voiceChannel) {
              return interaction.editReply("❌ You must be in a voice channel to use /spin voice.");
            }
            const voiceMembers = voiceChannel.members.filter((m) => !m.user.bot);
            entries = voiceMembers.map((m) => m.displayName);
            wheelName = `${voiceChannel.name} Voice`;
            break;
          }
        }

        if (entries.length < 2) {
          return interaction.editReply("❌ Need at least 2 entries to spin the wheel.");
        }
        if (entries.length > 1000) {
          entries = entries.slice(0, 1000);
          wheelName += " (Limited to 1000)";
        }

        const spin = await generateWheelGIF(entries, {
          colorPalette,
          duration: 4000,
          fps: 20,
          spinRevolutions: 4,
        });
        const gifBuffer = spin.buffer;
        const winner = spin.winner;
        const spinDuration = spin.spinDuration;

        // Resolve the winning member so we can mention them properly
        const spinMember = interaction.guild.members.cache.find(
          (m) => m.displayName === winner || m.user.username === winner || m.user.globalName === winner
        );
        const winnerText = spinMember ? `<@${spinMember.id}>` : `**${winner}**`;

        const attachment = new AttachmentBuilder(gifBuffer, { name: "wheel-spin.webp" });

        // 1) Show the wheel (animation starts) — plain message, no embed
        const wheelMsg = await interaction.editReply({
          files: [attachment],
        });

        // 2) Wait for the wheel to fully stop before announcing
        await new Promise((r) => setTimeout(r, spinDuration + 500));

        // 3) Only AFTER the wheel stops: announce the winner
        const announceMsg = await interaction.followUp({
          content: `🎉 **We have a winner!**\n\n${winnerText}`,
        });

        try {
          const guildId = interaction.guild.id;
          const now = Date.now();
          const roleAssignedUntil = now + WINNER_ROLE_DURATION_MS;
        const winnerData = { id: spinMember ? spinMember.id : winner, name: winner, username: spinMember ? spinMember.user.username : winner };
          if (spinMember) {
            await spinMember.roles.add(GIVEAWAY_WINNER_ROLE_ID).catch(() => {});
            scheduleWinnerRoleRemoval(guildId, spinMember.id, roleAssignedUntil);
          }
          recordWinners({
            messageId: announceMsg.id,
            guildId,
            guildName: interaction.guild.name,
            channelId: interaction.channel.id,
            prize: wheelName,
            endedAt: now,
            roleAssignedUntil,
            isWheel: true,
            winners: [winnerData],
          });
        } catch (err) {
          console.error("Spin winner logging failed:", err.message);
        }

        // Reactions on the announcement
        try {
          await announceMsg.react("🎉").catch(() => {});
        } catch {}

        return;
      } catch (err) {
        console.error("Spin command error:", err);
        return interaction.editReply(`❌ An error occurred: ${err.message}`);
      }
    }

    default:
      return interaction.reply("❌ Unknown command.");
  }
}

// ---------- Giveaway button entry ----------
async function handleGiveawayEntry(messageId, guildMember) {
  const data = activeGiveaways.get(messageId);
  if (!data) return { ok: false, reason: "ended" };

  const memberRoles = guildMember.roles.cache;
  const user = guildMember.user;

  if (memberRoles.has(GIVEAWAY_WINNER_ROLE_ID)) {
    await user
      .send("🏆 You are already a giveaway winner! Please wait **1 month** before entering another giveaway.")
      .catch(() => {});
    return { ok: false, reason: "winner" };
  }

  const blockedRoleIds = Array.isArray(data.blockedRoleIds) ? data.blockedRoleIds : [];
  if (blockedRoleIds.some((id) => memberRoles.has(id))) {
    return { ok: false, reason: "blocked" };
  }

  const requiredRoleIds = Array.isArray(data.requiredRoleIds) ? data.requiredRoleIds : [];
  if (requiredRoleIds.length) {
    const hasAll = requiredRoleIds.every((id) => memberRoles.has(id));
    const hasAny = requiredRoleIds.some((id) => memberRoles.has(id));
    if (data.requireAllRoles ? !hasAll : !hasAny) {
      return { ok: false, reason: "requirements" };
    }
  }

  if (!Array.isArray(data.entries)) {
    data.entries = [];
  }

  if (data.entries.includes(user.id)) {
    return { ok: false, reason: "already_entered" };
  }

  let weight = 1;
  const extraEntries = Array.isArray(data.extraEntries) ? data.extraEntries : [];
  if (extraEntries.length) {
    const applicable = extraEntries.filter((e) => memberRoles.has(e.roleId)).map((e) => e.entries);
    if (applicable.length) {
      weight = data.stackEntries
        ? 1 + applicable.reduce((a, b) => a + b, 0)
        : 1 + Math.max(...applicable);
    }
  }

  for (let i = 0; i < weight; i++) data.entries.push(user.id);

  saveGiveaways();

  if (data.isDrop && new Set(data.entries).size >= data.winners) {
    endGiveaway(messageId).catch(console.error);
  }

  return { ok: true, entries: weight };
}

// ---------- Voice channel time tracking ----------
client.on("voiceStateUpdate", (oldState, newState) => {
  if (oldState.channelId === newState.channelId) return;

  // User joined a voice channel
  if (oldState.channelId === null && newState.channelId) {
    voiceJoinTimes.set(newState.member.id, {
      guildId: newState.guild.id,
      joinedAt: Date.now(),
    });
  }

  // User left a voice channel
  if (newState.channelId === null && oldState.channelId) {
    const join = voiceJoinTimes.get(newState.member.id);
    if (join && join.guildId === newState.guild.id) {
      voiceJoinTimes.delete(newState.member.id);
      const duration = Date.now() - join.joinedAt;
      if (duration > 5000) trackVoiceActivity(join.guildId, newState.member.id, duration);
    }
  }
});

// Persist voice activity periodically
setInterval(() => {
  if (Object.values(voiceActivityStore).some((g) => Object.keys(g).length > 0)) saveVoiceActivity();
}, 60000);

async function buildParticipantsEmbed(guild, giveawayId, page = 0, fallbackData = null) {
  let data = activeGiveaways.get(giveawayId) || endedGiveaways.get(giveawayId) || fallbackData;
  if (!data) return null;

  const entries = Array.isArray(data.entries) ? data.entries : [];
  const participantCount = new Set(entries).size;
  const counts = {};
  for (const id of entries) counts[id] = (counts[id] || 0) + 1;
  const sorted = Object.entries(counts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));

  const pageItems = sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const lines = [];
  for (const p of pageItems) {
    let m = guild.members.cache.get(p.id);
    if (!m) {
      m = await guild.members.fetch(p.id).catch(() => null);
    }
    const username = m ? m.user.username : p.id;
    lines.push(`<@${p.id}> (${username}, ${p.count} ${p.count === 1 ? "entry" : "entries"})`);
  }

  const descLines = [
    `**Total entries:** ${entries.length}`,
    `**Participants:** ${participantCount}`,
    "",
    sorted.length > 0 ? lines.join("\n") : "*No participants yet.*",
  ];

  const embed = new EmbedBuilder()
    .setColor(0x00BD5B)
    .setTitle(`👥 ${data.prize}`)
    .setDescription(descLines.join("\n"));

  if (totalPages > 1) {
    embed.setFooter({
      text: `Page ${currentPage + 1} of ${totalPages} • Total: ${sorted.length} participants`,
    });
  }

  const components = [];
  if (totalPages > 1) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`part_page:${giveawayId}:${currentPage - 1}`)
        .setLabel("◀ Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`part_info:${giveawayId}`)
        .setLabel(`${currentPage + 1} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`part_page:${giveawayId}:${currentPage + 1}`)
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1)
    );
    components.push(row);
  }

  return { embed, components };
}

// ---------- TICKET BUTTON INTERACTIONS ----------
client.on("interactionCreate", async (interaction) => {
  try {
  // ---------- SLASH COMMANDS ----------
  if (interaction.isChatInputCommand()) {
    return await handleSlashCommand(interaction);
  }

  // Ignore interactions the bot doesn't recognize (e.g. from other apps or stale buttons)
  if (
    interaction.isButton() &&
    !["enter_giveaway", "participants_giveaway", "create_ticket_support", "create_ticket_giveaway", "create_ticket_propaccount", "mark_winner", "close_ticket"].includes(interaction.customId) &&
    !interaction.customId.startsWith("part_page:") &&
    !interaction.customId.startsWith("part_info:")
  ) {
    return;
  }
  if (interaction.isStringSelectMenu() && interaction.customId !== "propaccount_select") {
    return;
  }

  // Handle the prop account size dropdown
  if (interaction.isStringSelectMenu() && interaction.customId === "propaccount_select") {
    const choice = interaction.values[0];
    const labels = {
      "5k": "5K Account",
      "10k": "10K Account",
      "25k": "25K Account",
      "50k": "50K Account",
      "100k": "100K Account",
      other: "Other / Not Sure",
    };
    const label = labels[choice] || choice;

    await interaction.reply(`✅ ${interaction.user} selected: **${label}**\nStaff will assist you shortly.`);

    // Rename channel to reflect the chosen account size (skipped for "other")
    if (choice !== "other") {
      const newName = `propaccount-${choice}`;
      await interaction.channel.setName(newName).catch(() => {});
    }
    return;
  }

  if (!interaction.isButton()) return;

// Auto-recover active giveaway if bot restarted or lost memory while timer is still running
function recoverGiveawayFromMessage(message) {
  if (!message || !message.embeds || !message.embeds.length) return null;
  const embed = message.embeds[0];
  const desc = embed.description || "";

  const endMatch = desc.match(/Ends:\*\*\s*<t:(\d+):/i) || desc.match(/<t:(\d+):R>/i);
  if (!endMatch) return null;

  const endAt = parseInt(endMatch[1], 10) * 1000;
  if (isNaN(endAt) || endAt <= Date.now()) return null; // Truly expired

  const prize = (embed.title || "").replace(/^\s*🎉\s*/, "").trim() || "Giveaway";
  const winners = parseInt(desc.match(/Winners:\*\*\s*(\d+)/i)?.[1], 10) || 1;
  const roleMatches = [...desc.matchAll(/<@&(\d+)>/g)].map((m) => m[1]);
  const hostMatch = desc.match(/Hosted by:\*\*\s*([^\n]+)/i)?.[1]?.trim() || "GFX GIVEAWAY";

  const recoveredData = {
    guildId: message.guild ? message.guild.id : null,
    channelId: message.channel ? message.channel.id : null,
    createdAt: Date.now(),
    host: hostMatch,
    prize,
    winners,
    requiredRoleIds: roleMatches,
    blockedRoleIds: [],
    requireAllRoles: false,
    extraEntries: [],
    stackEntries: false,
    isDrop: false,
    winnersRoleId: null,
    emoji: "🎉",
    entries: [],
    endAt,
  };

  activeGiveaways.set(message.id, recoveredData);
  saveGiveaways();
  safeSetTimeout(() => endGiveaway(message.id), endAt - Date.now());
  console.log(`🔄 Auto-recovered active giveaway [${message.id}] "${prize}" ending in ${Math.round((endAt - Date.now()) / 1000)}s`);
  return recoveredData;
}

  // Enter giveaway button
  if (interaction.customId === "enter_giveaway") {
    let data = activeGiveaways.get(interaction.message.id);
    if (!data) {
      data = recoverGiveawayFromMessage(interaction.message);
    }
    if (!data) {
      const endedData = endedGiveaways.get(interaction.message.id);
      if (endedData && Array.isArray(endedData.entries) && endedData.entries.includes(interaction.user.id)) {
        return await interaction.reply({
          content: "✅ You are already entered in this giveaway!",
          flags: MessageFlags.Ephemeral,
        });
      }
      return await interaction.reply({
        content: "✅ You are already entered in this giveaway!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!guildMember) {
      return await interaction.reply({ content: "❌ Couldn't verify your membership.", flags: MessageFlags.Ephemeral });
    }

    const result = await handleGiveawayEntry(interaction.message.id, guildMember);
    if (!result.ok) {
      if (result.reason === "winner") {
        return await interaction.reply({
          content: "🏆 You are already a giveaway winner! Please wait **1 month** before entering another giveaway.",
          flags: MessageFlags.Ephemeral,
        });
      }
      if (result.reason === "requirements") {
        return await interaction.reply({
          content: data.rejectionMessage || "❌ You don't meet the role requirements to enter this giveaway.",
          flags: MessageFlags.Ephemeral,
        });
      }
      if (result.reason === "already_entered") {
        return await interaction.reply({
          content: "✅ You are already entered in this giveaway!",
          flags: MessageFlags.Ephemeral,
        });
      }
      if (result.reason === "blocked") {
        return await interaction.reply({
          content: "🏆 You are already a winner! Please wait **1 month** before entering another giveaway.",
          flags: MessageFlags.Ephemeral,
        });
      }
      return await interaction.reply({
        content: "✅ You are already entered in this giveaway!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const total = data.entries.length;

    // Live update the Participants button label on the Discord message
    try {
      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("enter_giveaway")
          .setLabel("Enter Giveaway")
          .setEmoji(data.emoji || "🎉")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("participants_giveaway")
          .setLabel(`Participants ${total}`)
          .setEmoji("👥")
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.message.edit({ components: [updatedRow] }).catch(() => {});
    } catch {}

    return await interaction.reply({
      content: `✅ You entered the giveaway for **${data.prize}**! You now have **${result.entries}** ${result.entries === 1 ? "entry" : "entries"} in this giveaway (${total} total).`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Participants button - shows scrollable paginated embed of all participants
  if (interaction.customId === "participants_giveaway") {
    let data = activeGiveaways.get(interaction.message.id) || endedGiveaways.get(interaction.message.id);
    if (!data) {
      data = recoverGiveawayFromMessage(interaction.message);
    }
    if (!data) {
      return await interaction.reply({ content: "❌ No information found for this giveaway.", flags: MessageFlags.Ephemeral });
    }

    const built = await buildParticipantsEmbed(interaction.guild, interaction.message.id, 0, data);
    if (!built) {
      return await interaction.reply({ content: "❌ No information found for this giveaway.", flags: MessageFlags.Ephemeral });
    }

    return await interaction.reply({
      embeds: [built.embed],
      components: built.components,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Handle pagination for participants embed (Prev / Next)
  if (interaction.customId.startsWith("part_page:")) {
    const parts = interaction.customId.split(":");
    const giveawayId = parts[1];
    const page = parseInt(parts[2], 10) || 0;

    let fallbackData = null;
    if (!activeGiveaways.has(giveawayId) && !endedGiveaways.has(giveawayId)) {
      fallbackData = recoverGiveawayFromMessage(interaction.message);
    }

    const built = await buildParticipantsEmbed(interaction.guild, giveawayId, page, fallbackData);
    if (!built) {
      return await interaction.reply({ content: "❌ Giveaway not found.", flags: MessageFlags.Ephemeral });
    }

    return await interaction.update({
      embeds: [built.embed],
      components: built.components,
    });
  }

  // Create a new ticket channel (Support, Giveaway, or PropAccountBuy)
  if (
    interaction.customId === "create_ticket_support" ||
    interaction.customId === "create_ticket_giveaway" ||
    interaction.customId === "create_ticket_propaccount"
  ) {
    const isGiveaway = interaction.customId === "create_ticket_giveaway";
    const isPropAccount = interaction.customId === "create_ticket_propaccount";
    const ticketType = isGiveaway ? "giveaway" : isPropAccount ? "propaccount" : "support";

    if (isGiveaway && !interaction.member.roles.cache.has(GIVEAWAY_WINNER_ROLE_ID)) {
      return await interaction.reply({
        content: "❌ Only giveaway winners can open a giveaway ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guild = interaction.guild;
    const existing = guild.channels.cache.find(
      (c) => c.topic === `ticket-owner:${interaction.user.id}:${ticketType}`
    );
    if (existing) {
      return await interaction.reply({
        content: `❌ You already have an open ${ticketType} ticket: ${existing}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const count = (ticketCounters.get(guild.id) || 0) + 1;
    ticketCounters.set(guild.id, count);

    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
        ],
      },
    ];

    if (SUPPORT_ROLE_ID && SUPPORT_ROLE_ID !== "PUT_SUPPORT_ROLE_ID_HERE") {
      overwrites.push({
        id: SUPPORT_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      });
    }

    const channelOptions = {
      name: `${ticketType}-${count}`,
      type: ChannelType.GuildText,
      topic: `ticket-owner:${interaction.user.id}:${ticketType}`,
      permissionOverwrites: overwrites,
    };
    if (TICKET_CATEGORY_ID && TICKET_CATEGORY_ID !== "PUT_CATEGORY_ID_HERE") {
      channelOptions.parent = TICKET_CATEGORY_ID;
    }

    const ticketChannel = await guild.channels.create(channelOptions);

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(
        isGiveaway
          ? `🎉 Giveaway Ticket #${count}`
          : isPropAccount
          ? `💳 Prop Account Purchase #${count}`
          : `🎫 Support Ticket #${count}`
      )
      .setDescription(
        isGiveaway
          ? `Hello ${interaction.user}, congrats on winning! Please confirm your details here to claim your prize.`
          : isPropAccount
          ? `Hello ${interaction.user}, thanks for your interest in purchasing a prop account.\nPlease select which account size you'd like from the dropdown below.`
          : `Hello ${interaction.user}, support will be with you shortly.\nPlease describe your issue below.`
      );

    const buttons = [
      new ButtonBuilder().setCustomId("close_ticket").setLabel("Close Ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger),
    ];
    if (isGiveaway) {
      buttons.unshift(
        new ButtonBuilder().setCustomId("mark_winner").setLabel("Mark as Winner").setEmoji("🏆").setStyle(ButtonStyle.Success)
      );
    }
    const actionRow = new ActionRowBuilder().addComponents(...buttons);

    const components = [actionRow];

    if (isPropAccount) {
      const accountSelect = new StringSelectMenuBuilder()
        .setCustomId("propaccount_select")
        .setPlaceholder("Select an account size")
        .addOptions(
          { label: "5K Account", value: "5k", emoji: "💳" },
          { label: "10K Account", value: "10k", emoji: "💳" },
          { label: "25K Account", value: "25k", emoji: "💳" },
          { label: "50K Account", value: "50k", emoji: "💳" },
          { label: "100K Account", value: "100k", emoji: "💳" },
          { label: "Other / Not Sure", value: "other", emoji: "❓" }
        );
      components.unshift(new ActionRowBuilder().addComponents(accountSelect));
    }

    await ticketChannel.send({
      content: SUPPORT_ROLE_ID && SUPPORT_ROLE_ID !== "PUT_SUPPORT_ROLE_ID_HERE" ? `<@&${SUPPORT_ROLE_ID}>` : undefined,
      embeds: [embed],
      components,
    });

    return await interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, flags: MessageFlags.Ephemeral });
  }

  // Tag the ticket owner with the giveaway winner role
  if (interaction.customId === "mark_winner") {
    const hasSupportRole =
      SUPPORT_ROLE_ID !== "PUT_SUPPORT_ROLE_ID_HERE" && interaction.member.roles.cache.has(SUPPORT_ROLE_ID);
    const isManager = interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles);

    if (!hasSupportRole && !isManager) {
      return await interaction.reply({ content: "❌ Only staff can mark a winner.", flags: MessageFlags.Ephemeral });
    }

    const topicParts = (interaction.channel.topic || "").split(":");
    const ownerId = topicParts[1];
    if (!ownerId) {
      return await interaction.reply({ content: "❌ Couldn't find the ticket owner.", flags: MessageFlags.Ephemeral });
    }

    const ownerMember = await interaction.guild.members.fetch(ownerId).catch(() => null);
    if (!ownerMember) {
      return await interaction.reply({ content: "❌ Couldn't find that member in the server.", flags: MessageFlags.Ephemeral });
    }

    await ownerMember.roles.add(GIVEAWAY_WINNER_ROLE_ID).catch(() => null);
    return await interaction.reply(`🏆 ${ownerMember} has been tagged as a giveaway winner!`);
  }

  // Close an existing ticket
  if (interaction.customId === "close_ticket") {
    const hasSupportRole =
      SUPPORT_ROLE_ID !== "PUT_SUPPORT_ROLE_ID_HERE" && interaction.member.roles.cache.has(SUPPORT_ROLE_ID);
    const isTicketOwner = (interaction.channel.topic || "").startsWith(`ticket-owner:${interaction.user.id}`);
    const isManager = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

    if (!hasSupportRole && !isTicketOwner && !isManager) {
      return await interaction.reply({ content: "❌ You can't close this ticket.", flags: MessageFlags.Ephemeral });
    }

    await interaction.reply("🔒 Closing this ticket in 5 seconds...");
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
  } catch (err) {
    console.error("Interaction error:", err.message);
  }
});

function pickWinners(pool, count) {
  if (!Array.isArray(pool) || !pool.length || count <= 0) return [];
  const uniqueUsers = Array.from(new Set(pool));
  const maxWinners = Math.min(count, uniqueUsers.length);

  const winners = [];
  let availablePool = [...pool];

  while (winners.length < maxWinners && availablePool.length > 0) {
    const randomIndex = Math.floor(Math.random() * availablePool.length);
    const chosen = availablePool[randomIndex];
    if (!winners.includes(chosen)) {
      winners.push(chosen);
    }
    // Remove all entries of the selected winner so they can't win twice
    availablePool = availablePool.filter((id) => id !== chosen);
  }

  return winners;
}

async function startGiveaway({
  guild,
  channelId,
  minutes,
  winners,
  prize,
  host,
  requiredRoleIds = [],
  blockedRoleIds = [],
  requireAllRoles = false,
  extraEntries = [],
  stackEntries = false,
  isDrop = false,
  winnersRoleId = null,
  color = 0x00BD5B,
  emoji = "🎉",
  image = null,
  thumbnail = null,
  message = null,
  rejectionMessage = null,
}) {
  const channel = await guild.channels.fetch(channelId);
  const endTime = Math.floor((Date.now() + minutes * 60000) / 1000);

  const lines = [`Click the button below to enter!\n`];
  lines.push(`⏰ **Ends:** <t:${endTime}:R>`);
  lines.push(`👑 **Hosted by:** ${host}`);
  lines.push(`🏆 **Winners:** ${winners}`);

  if (requiredRoleIds.length) {
    const roles = requiredRoleIds.map((id) => `<@&${id}>`).join(", ");
    lines.push(`🔒 **Requirements:** ${requireAllRoles ? "All of" : "Any of"} ${roles}`);
  }

  if (extraEntries.length) {
    const extraLines = extraEntries.map(
      (e) => `<@&${e.roleId}> → **${e.entries}** extra ${e.entries === 1 ? "entry" : "entries"}`
    );
    lines.push(`\n⭐ **Extra Entries:**\n${extraLines.join("\n")}`);
  }

  lines.push(`🏆 Previous giveaway winners cannot enter.`);

  const embed = {
    color,
    title: `🎉 ${prize}`,
    description: lines.join("\n"),
    footer: { text: "Good luck!" },
  };

  if (thumbnail) embed.thumbnail = { url: thumbnail };
  if (image) embed.image = { url: image };

  const sendOptions = { embeds: [embed] };
  if (message) sendOptions.content = message;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("enter_giveaway")
      .setLabel("Enter Giveaway")
      .setEmoji(emoji)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("participants_giveaway")
      .setLabel("Participants 0")
      .setEmoji("👥")
      .setStyle(ButtonStyle.Secondary)
  );
  sendOptions.components = [row];

  const giveawayMessage = await channel.send(sendOptions);

  activeGiveaways.set(giveawayMessage.id, {
    guildId: guild.id,
    channelId,
    createdAt: Date.now(),
    host,
    prize,
    winners,
    requiredRoleIds,
    blockedRoleIds,
    requireAllRoles,
    extraEntries,
    stackEntries,
    isDrop,
    winnersRoleId,
    emoji,
    entries: [],
    endAt: Date.now() + minutes * 60000,
    rejectionMessage,
  });

  saveGiveaways();

  // Auto-end when the timer runs out
  safeSetTimeout(() => endGiveaway(giveawayMessage.id), minutes * 60000);

  return giveawayMessage;
}

async function endGiveaway(messageId) {
  const data = activeGiveaways.get(messageId);
  if (!data) return;
  activeGiveaways.delete(messageId);
  data.endedAt = Date.now();
  endedGiveaways.set(messageId, data);
  saveGiveaways();
  saveEndedGiveaways();

  const channel = await client.channels.fetch(data.channelId).catch(() => null);
  if (!channel) return;

  const pool = data.entries || [];
  const now = Date.now();

  // Disable button and update embed on original giveaway message
  try {
    const origMsg = await channel.messages.fetch(messageId).catch(() => null);
    if (origMsg) {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("enter_giveaway_ended")
          .setLabel("Giveaway Ended")
          .setEmoji(data.emoji || "🎉")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("participants_giveaway")
          .setLabel(`Participants ${pool.length}`)
          .setEmoji("👥")
          .setStyle(ButtonStyle.Secondary)
      );

      const oldEmbed = origMsg.embeds && origMsg.embeds[0];
      const editOptions = { components: [disabledRow] };
      if (oldEmbed) {
        const updatedEmbed = EmbedBuilder.from(oldEmbed)
          .setDescription(
            `⏰ **Ended:** <t:${Math.floor(now / 1000)}:R>\n👑 **Hosted by:** ${data.host || "GFX GIVEAWAY"}\n🏆 **Winners:** ${data.winners}\n👥 **Total Entries:** ${pool.length}`
          )
          .setFooter({ text: "Giveaway Ended" });
        editOptions.embeds = [updatedEmbed];
      }
      await origMsg.edit(editOptions).catch(() => {});
    }
  } catch {}

  if (pool.length === 0) {
    return channel.send(`🎉 Giveaway for **${data.prize}** ended — no valid entries.`);
  }

  const winners = pickWinners(pool, data.winners);
  const roleAssignedUntil = now + WINNER_ROLE_DURATION_MS;
  const winnerMembers = [];

  for (const winnerId of winners) {
    const winnerMember = await channel.guild.members.fetch(winnerId).catch(() => null);
    if (winnerMember) {
      if (data.winnersRoleId) {
        await winnerMember.roles.add(data.winnersRoleId).catch(() => null);
      }
      await winnerMember.roles.add(GIVEAWAY_WINNER_ROLE_ID).catch(() => null);
      winnerMembers.push({ id: winnerId, name: winnerMember.user.username });
      scheduleWinnerRoleRemoval(channel.guild.id, winnerId, roleAssignedUntil);
    }
  }

  recordWinners({
    messageId,
    guildId: channel.guild.id,
    guildName: channel.guild.name,
    channelId: channel.id,
    prize: data.prize,
    endedAt: now,
    roleAssignedUntil,
    winners: winnerMembers,
  });

  const winnerMentions = winnerMembers.map((w) => `<@${w.id}>`).join(", ");

  const winnerEmbed = new EmbedBuilder()
    .setColor(0x00BD5B)
    .setTitle("🎉 Congratulations!")
    .setDescription(`${winnerMentions} won the giveaway of **${data.prize}** !!`)
    .setFooter({ text: "Good luck next time!" });

  const giveawayUrl = `https://discord.com/channels/${data.guildId}/${data.channelId}/${messageId}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Giveaway Message ↗")
      .setStyle(ButtonStyle.Link)
      .setURL(giveawayUrl)
  );

  return channel.send({ embeds: [winnerEmbed], components: [row] });
}

// ---- Crash protection: never let one bad event kill the bot/web server ----
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason && reason.message ? reason.message : reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err && err.message ? err.message : err);
});

const rawToken = process.env.TOKEN ? String(process.env.TOKEN).trim().replace(/^["']|["']$/g, "").trim() : "";

if (!rawToken) {
  lastLoginError = "No Discord bot TOKEN found in environment variables.";
  console.error("\n❌ [BOT ERROR] No Discord bot TOKEN found in .env file or environment variables!");
  console.error("👉 Please create or edit your .env file or Render Environment tab and set: TOKEN=your_discord_bot_token_here\n");
} else {
  client.login(rawToken).catch((err) => {
    lastLoginError = err.message || "Failed to log in to Discord";
    console.error(`\n❌ [DISCORD LOGIN ERROR] ${err.message}`);
    if (err.message.includes("TOKEN_INVALID") || err.message.includes("An invalid token")) {
      console.error("👉 NOTE: If you uploaded code to GitHub, Discord automatically revoked your token for security.");
      console.error("👉 Please go to Discord Developer Portal (https://discord.com/developers/applications) -> Bot -> Reset Token.");
      console.error("👉 Update TOKEN in your Render Environment dashboard.\n");
    }
  });
}

// ---------- CMD/CLI Interface ----------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log("\n🎮 CMD Interface ready. Type 'help' for commands.\n");

function cmdLog(msg) {
  console.log(`\n[CMD] ${msg}`);
}

function cmdError(msg) {
  console.error(`\n[CMD ERROR] ${msg}`);
}

rl.on("line", async (input) => {
  const trimmed = input.trim();
  if (!trimmed) return;
  if (trimmed === "exit" || trimmed === "quit" || trimmed === "stop") {
    console.log("Bot stopped. Run `node index.js` to start it again.");
    process.exit(0);
  }
  if (trimmed === "restart") {
    console.log("Restarting bot... (only this index.js process is restarted)");
    const child = spawn(process.execPath, ["index.js"], {
      cwd: __dirname,
      detached: true,
      stdio: "inherit",
    });
    child.unref();
    setTimeout(() => process.exit(0), 250);
    return;
  }
  if (trimmed === "help") {
    console.log(`
  Commands:
  help                         - Show this help
  restart                      - Restart this bot (own process only)
  stop                         - Stop this bot (own process only)
  status                       - Bot status
  list                         - List active giveaways
  start <minutes> <winners> <channelId> <prize>  - Start a giveaway
  end <messageId>              - End a giveaway early
  reroll <messageId>           - Reroll an ended giveaway
  clear <messageId>            - Remove from dashboard only
  clearall                     - Remove all active giveaways
  spin <prize1,prize2,...>     - Spin a wheel and announce winner
  quit / stop                  - Exit bot
`);
    return;
  }
  if (trimmed === "status") {
    const online = client.isReady();
    console.log(`  Bot: ${online ? "Online" : "Offline"}`);
    if (online) {
      console.log(`  User: ${client.user.tag}`);
      console.log(`  Servers: ${client.guilds.cache.size}`);
      console.log(`  Active giveaways: ${activeGiveaways.size}`);
    }
    return;
  }
  if (trimmed === "list") {
    if (activeGiveaways.size === 0) {
      console.log("  No active giveaways.");
      return;
    }
    for (const [id, data] of activeGiveaways) {
      const guild = client.guilds.cache.get(data.guildId);
      const channel = guild ? guild.channels.cache.get(data.channelId) : null;
      console.log(`  • [${id}] ${data.prize} — ${channel ? `#${channel.name}` : "unknown channel"} — Ends in ${(Math.max(0, data.endAt - Date.now()) / 60000).toFixed(1)}min — ${data.entries.length} entries`);
    }
    return;
  }
  if (trimmed.startsWith("start ")) {
    const parts = trimmed.slice(6).split(" ");
    const minutes = parseInt(parts[0]);
    const winners = parseInt(parts[1]);
    const channelId = parts[2];
    const prize = parts.slice(3).join(" ");
    if (!minutes || !winners || !channelId || !prize) {
      cmdError("Usage: start <minutes> <winners> <channelId> <prize>");
      return;
    }
    if (!client.isReady()) { cmdError("Bot is not ready."); return; }
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) { cmdError("Channel not found."); return; }
    const guild = channel.guild;
    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      cmdError("Bot missing ManageMessages permission in this channel."); return;
    }
    try {
      const msg = await startGiveaway({ guild, channelId, minutes, winners, prize, host: "CMD" });
      cmdLog(`Started giveaway "${prize}" — Message ID: ${msg.id}`);
    } catch (err) {
      cmdError(err.message);
    }
    return;
  }
  if (trimmed.startsWith("end ")) {
    const messageId = trimmed.slice(4).trim();
    if (!client.isReady()) { cmdError("Bot is not ready."); return; }
    try {
      await endGiveaway(messageId);
      cmdLog(`Ended giveaway ${messageId}`);
    } catch (err) {
      cmdError(err.message || "Giveaway not found.");
    }
    return;
  }
  if (trimmed.startsWith("reroll ")) {
    const messageId = trimmed.slice(7).trim();
    if (!client.isReady()) { cmdError("Bot is not ready."); return; }
    const data = endedGiveaways.get(messageId);
    if (!data) { cmdError("That giveaway is not in the ended list."); return; }
    try {
      const channel = await client.channels.fetch(data.channelId).catch(() => null);
      if (!channel) { cmdError("Channel not found."); return; }
      const pool = data.entries || [];
      if (!pool.length) { cmdError("No entries to reroll."); return; }
      const winners = pickWinners(pool, data.winners);
      const winnerMentions = winners.map((id) => `<@${id}>`).join(", ");
      const hostStr = String(data.host || "GFX GIVEAWAY");
      const hostMention = hostStr.match(/<@!?(\d+)>/)?.[1] ? `<@${hostStr.match(/<@!?(\d+)>/)[1]}>` : hostStr;
      const winnerEmbed = new EmbedBuilder()
        .setColor(0x00BD5B)
        .setTitle("🎲 Reroll!")
        .setDescription(`${winnerMentions} won the reroll for **${data.prize}** !!`)
        .addFields({ name: "Hosted by", value: hostMention, inline: true })
        .setFooter({ text: "Good luck next time!" });
      const giveawayUrl = `https://discord.com/channels/${data.guildId}/${data.channelId}/${messageId}`;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Giveaway Message ↗").setStyle(ButtonStyle.Link).setURL(giveawayUrl)
      );
      await channel.send({ embeds: [winnerEmbed], components: [row] });
      recordWinners({ messageId, guildId: channel.guild.id, guildName: channel.guild.name, channelId: channel.id, prize: data.prize, endedAt: Date.now(), roleAssignedUntil: Date.now() + 2592000000, winners: winners.map((id) => ({ id, name: id })) });
      cmdLog(`Rerolled ${messageId} — Winners: ${winners.join(", ")}`);
    } catch (err) {
      cmdError(err.message || "Failed to reroll.");
    }
    return;
  }
  if (trimmed.startsWith("clear ")) {
    const messageId = trimmed.slice(6).trim();
    activeGiveaways.delete(messageId);
    endedGiveaways.delete(messageId);
    saveGiveaways();
    saveEndedGiveaways();
    cmdLog(`Removed ${messageId} from dashboard.`);
    return;
  }
  if (trimmed === "clearall") {
    if (!(await new Promise((r) => { rl.question("Clear ALL giveaways? (yes/no): ", (a) => r(a.toLowerCase() === "yes")); }))) return;
    activeGiveaways.clear();
    endedGiveaways.clear();
    saveGiveaways();
    saveEndedGiveaways();
    cmdLog("Cleared all giveaways from dashboard.");
    return;
  }
  if (trimmed.startsWith("spin ")) {
    const prizes = trimmed.slice(5).split(",").map(s => s.trim()).filter(Boolean);
    if (prizes.length < 2) { cmdError("Need at least 2 prizes separated by commas."); return; }
    const wheelColors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#00BD5B", "#E74C3C", "#9B59B6", "#1ABC9C"];
    const winner = prizes[Math.floor(Math.random() * prizes.length)];
    const embed = new EmbedBuilder()
      .setColor(0x00BD5B)
      .setTitle("🎰 Wheel of Spin!")
      .setDescription(`**${winner}** won the spin!`)
      .setFooter({ text: "Prizes: " + prizes.join(" • ") });
    if (client.isReady()) {
      // Find first text channel to post in
      const guild = client.guilds.cache.first();
      if (guild) {
        const channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText);
        if (channel) {
          await channel.send({ embeds: [embed] });
          cmdLog(`Spin result: ${winner}`);
        } else {
          console.log(`\n🎰 WINNER: ${winner} | Prizes: ${prizes.join(", ")}`);
          cmdLog("Result shown above (no suitable channel found).");
        }
      } else {
        console.log(`\n🎰 WINNER: ${winner} | Prizes: ${prizes.join(", ")}`);
        cmdLog("Result shown above (no guild found).");
      }
    } else {
      console.log(`\n🎰 WINNER: ${winner} | Prizes: ${prizes.join(", ")}`);
      cmdLog("Bot not ready - result printed above.");
    }
    return;
  }
  cmdError(`Unknown command: ${trimmed}. Type 'help' for commands.`);
});
