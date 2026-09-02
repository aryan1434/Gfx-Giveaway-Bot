# GFX Giveaway Discord Bot 🎉

An advanced Discord Giveaway & Wheel Spinner Bot with a modern, animated web dashboard.

---

## ✨ Key Features

- 🎁 **Discord Giveaways**: Slash commands (`/gc`, `/gend`, `/greroll`, `/grestore`) & prefix commands (`$gc`, etc.).
- 🎡 **Animated Wheel of Spin**: Interactive wheel generator with GIF creation for Discord and dashboard.
- 🏷️ **Server Tag Auto-Role**: Automatically detects server tag (`GFX`) in username, status, bio, clan tag, and assigns configured role.
- 🏆 **Winner Logging**: Dispatches rich logs to `#winner-logs` channel with message links and timestamps.
- 🔒 **1-Month Winner Lock**: Automatically prevents recent winners from entering other giveaways for 30 days.
- 🌐 **Cyberpunk Web Dashboard**: Real-time stats, particle canvas starfield, live giveaway manager, and activity tracker.
- ☁️ **Ready for Render & Docker**: Pre-configured `render.yaml`, `Dockerfile`, `.node-version`.

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration (`.env`)
Create or edit your `.env` file:
```env
TOKEN=your_discord_bot_token_here
PORT=3000
DASHBOARD_PASSWORD=your_password_here
AUTH_SECRET=your_random_secret_here

# Channel & Role IDs
WINNER_LOG_CHANNEL_ID=1535915013729026150
SERVER_TAG=GFX
SERVER_TAG_ROLE_ID=1535157101310115921
GIVEAWAY_WINNER_ROLE_ID=1532972012341956678
GUILD_ID=1395645163547791370
```

### 3. Run Locally
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying on Render

1. Push your code to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com/) -> **New +** -> **Web Service**.
3. Select your repository.
4. Render will auto-detect settings from `render.yaml`.
5. Enter your environment variables in Render's **Environment** tab (`TOKEN`, etc.).
6. Click **Deploy Web Service**!
