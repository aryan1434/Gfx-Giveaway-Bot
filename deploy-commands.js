require("dotenv").config();
const { Client, GatewayIntentBits, Events } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  {
    name: "help",
    description: "Show all available commands",
  },
  {
    name: "gc",
    description: "Start a giveaway (Admin/Manage Messages required)",
    options: [
      { name: "minutes", type: 4, description: "Duration in minutes", required: true },
      { name: "winners", type: 4, description: "Number of winners", required: true },
      { name: "prize", type: 3, description: "Giveaway prize", required: true },
      { name: "role", type: 8, description: "Required role to enter (optional)", required: false },
    ],
  },
  {
    name: "grestore",
    description: "Re-attach an existing giveaway message with a fresh countdown",
    options: [
      { name: "message_id", type: 3, description: "Message ID of the giveaway", required: true },
      { name: "minutes", type: 4, description: "New duration in minutes", required: true },
    ],
  },
  {
    name: "gend",
    description: "End a giveaway early and pick winner(s)",
    options: [
      { name: "message_id", type: 3, description: "Message ID of the giveaway", required: true },
    ],
  },
  {
    name: "greroll",
    description: "Reroll winner(s) for an ended giveaway",
    options: [
      { name: "message_id", type: 3, description: "Message ID of the giveaway", required: true },
    ],
  },
  {
    name: "kick",
    description: "Kick a member",
    options: [
      { name: "user", type: 6, description: "The member to kick", required: true },
      { name: "reason", type: 3, description: "Reason for the kick", required: false },
    ],
  },
  {
    name: "ban",
    description: "Ban a member",
    options: [
      { name: "user", type: 6, description: "The member to ban", required: true },
      { name: "reason", type: 3, description: "Reason for the ban", required: false },
    ],
  },
  {
    name: "mute",
    description: "Timeout a member",
    options: [
      { name: "user", type: 6, description: "The member to mute", required: true },
      { name: "minutes", type: 4, description: "Timeout duration in minutes", required: true },
      { name: "reason", type: 3, description: "Reason for the mute", required: false },
    ],
  },
  {
    name: "unmute",
    description: "Remove a member's timeout",
    options: [
      { name: "user", type: 6, description: "The member to unmute", required: true },
    ],
  },
  {
    name: "clear",
    description: "Bulk delete messages (max 100)",
    options: [
      { name: "amount", type: 4, description: "Number of messages to delete (1-100)", required: true },
    ],
  },
  {
    name: "ticketpanel",
    description: "Post the ticket panel (Manage Channels required)",
  },
  {
    name: "spin",
    description: "Spin a wheel to pick a random winner",
    options: [
      {
        name: "members",
        type: 1,
        description: "Spin with server members",
        options: [
          { name: "role", type: 8, description: "Only include members with this role", required: false },
        ],
      },
      {
        name: "custom",
        type: 1,
        description: "Spin with custom entries",
        options: [
          { name: "entries", type: 3, description: 'Comma-separated entries (e.g. "Pizza, Burgers, Tacos")', required: true },
        ],
      },
      {
        name: "reactions",
        type: 1,
        description: "Spin with users who reacted to a message",
        options: [
          { name: "message_id", type: 3, description: "Message ID to read reactions from", required: true },
          { name: "channel", type: 7, description: "Channel containing the message (defaults to this channel)", required: false },
        ],
      },
      {
        name: "voice",
        type: 1,
        description: "Spin with members in your current voice channel",
      },
    ],
  },
];

module.exports = { commands };

if (require.main === module) {
  client.once(Events.ClientReady, async () => {
    try {
      console.log(`Deploying ${commands.length} slash commands...`);
      const result = await client.application.commands.set(commands);
      console.log(`✅ Deployed ${result.size} global commands: ${result.map((c) => `/${c.name}`).join(", ")}`);
    } catch (err) {
      console.error("❌ Failed to deploy commands:", err);
    } finally {
      client.destroy();
      process.exit(0);
    }
  });

  const rawToken = process.env.TOKEN ? String(process.env.TOKEN).trim().replace(/^["']|["']$/g, "").trim() : "";
  if (rawToken) {
    client.login(rawToken);
  } else {
    console.error("No TOKEN found in .env");
  }
}
