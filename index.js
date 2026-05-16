const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // optional, for guild commands

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

// ---------- persistent settings ----------
const SETTINGS_FILE = './welcome-settings.json';
let welcomeChannelId = null;
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      welcomeChannelId = data.channelId || null;
    }
  } catch (e) { console.error('Failed to load settings', e); }
}
function saveSettings() {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ channelId: welcomeChannelId }, null, 2));
}
loadSettings();

// ---------- client setup ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ---------- helper: admin only checker ----------
function isAdmin(interaction) {
  return interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

// ---------- the container welcome message ----------
function buildWelcomeEmbed(member, memberCount) {
  const guildName = member.guild.name;
  const userMention = member.toString();
  const containerText = 
    `╭─────────────────────────────╮\n` +
    `│      ★ WELCOME CONTAINER ★     │\n` +
    `╰─────────────────────────────╯\n\n` +
    `${userMention} to **${guildName}**\n` +
    `✨ You are the **${memberCount}** member! ✨`;

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTitle('🎉 NEW MEMBER ARRIVED 🎉')
    .setDescription(`\`\`\`\n${containerText}\n\`\`\``)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `We now have ${memberCount} members` })
    .setTimestamp();

  return embed;
}

// ---------- event: auto welcome ----------
client.on('guildMemberAdd', async (member) => {
  if (!welcomeChannelId) return;
  const channel = member.guild.channels.cache.get(welcomeChannelId);
  if (!channel) return;
  const memberCount = member.guild.memberCount;
  const embed = buildWelcomeEmbed(member, memberCount);
  await channel.send({ embeds: [embed] }).catch(console.error);
});

// ---------- define all slash commands ----------
const commands = [
  // welcomer set (admin only)
  new SlashCommandBuilder()
    .setName('welcomer')
    .setDescription('Set or remove the welcome channel')
    .addSubcommand(sub => sub.setName('set').setDescription('Set welcome channel').addChannelOption(opt => opt.setName('channel').setDescription('The channel to send welcomes').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove welcome channel setting')),

  // moderation (admin only)
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addIntegerOption(opt => opt.setName('minutes').setDescription('Minutes (1-40320)').setRequired(true)),
  new SlashCommandBuilder().setName('purge').setDescription('Delete recent messages').addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true)),

  // utility
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  new SlashCommandBuilder().setName('help').setDescription('Show all commands')
];

// register commands (guild or global)
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands.map(cmd => cmd.toJSON()) });
      console.log(`✅ Registered guild commands in ${GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands.map(cmd => cmd.toJSON()) });
      console.log('✅ Registered global commands (may take up to 1 hour)');
    }
  } catch (err) {
    console.error('Failed to register commands', err);
  }
})();

// ---------- interaction handler ----------
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const { commandName, options } = interaction;

  // ---------- welcomer set/remove ----------
  if (commandName === 'welcomer') {
    if (!isAdmin(interaction)) return interaction.reply({ content: '❌ You need Administrator permission.', ephemeral: true });
    const sub = options.getSubcommand();
    if (sub === 'set') {
      const channel = options.getChannel('channel');
      if (channel.type !== 0) return interaction.reply({ content: '❌ Must be a text channel.', ephemeral: true });
      welcomeChannelId = channel.id;
      saveSettings();
      await interaction.reply(`✅ Welcome channel set to ${channel}. Auto‑welcome is enabled.`);
    } else if (sub === 'remove') {
      welcomeChannelId = null;
      saveSettings();
      await interaction.reply('✅ Welcome channel removed. Auto‑welcome disabled.');
    }
    return;
  }

  // ---------- KICK ----------
  if (commandName === 'kick') {
    if (!isAdmin(interaction)) return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
    const user = options.getUser('user');
    const reason = options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: '❌ User not in this server.', ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: '❌ I cannot kick that user.', ephemeral: true });
    await member.kick(reason);
    await interaction.reply(`🔨 Kicked ${user.tag} | Reason: ${reason}`);
  }

  // ---------- BAN ----------
  else if (commandName === 'ban') {
    if (!isAdmin(interaction)) return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
    const user = options.getUser('user');
    const reason = options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: '❌ User not in server.', ephemeral: true });
    if (!member.bannable) return interaction.reply({ content: '❌ I cannot ban that user.', ephemeral: true });
    await member.ban({ reason });
    await interaction.reply(`🔨 Banned ${user.tag} | Reason: ${reason}`);
  }

  // ---------- TIMEOUT ----------
  else if (commandName === 'timeout') {
    if (!isAdmin(interaction)) return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
    const user = options.getUser('user');
    const minutes = options.getInteger('minutes');
    if (minutes < 1 || minutes > 40320) return interaction.reply({ content: '❌ Minutes must be between 1 and 40320.', ephemeral: true });
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) return interaction.reply({ content: '❌ User not in server.', ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: '❌ I cannot timeout that user.', ephemeral: true });
    const ms = minutes * 60 * 1000;
    await member.timeout(ms, `Timeout by ${interaction.user.tag}`);
    await interaction.reply(`⏱️ Timed out ${user.tag} for ${minutes} minutes.`);
  }

  // ---------- PURGE ----------
  else if (commandName === 'purge') {
    if (!isAdmin(interaction)) return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
    const amount = options.getInteger('amount');
    if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ Amount must be between 1 and 100.', ephemeral: true });
    const fetched = await interaction.channel.messages.fetch({ limit: amount });
    await interaction.channel.bulkDelete(fetched, true);
    await interaction.reply({ content: `🧹 Deleted ${fetched.size} messages.`, ephemeral: true });
  }

  // ---------- PING ----------
  else if (commandName === 'ping') {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`🏓 Pong! Latency: ${latency}ms | API: ${Math.round(client.ws.ping)}ms`);
  }

  // ---------- HELP ----------
  else if (commandName === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🛠️ All Commands')
      .addFields(
        { name: '👋 Welcomer', value: '`/welcomer set #channel` (admin)\n`/welcomer remove` (admin)' },
        { name: '⚒️ Moderation (admin only)', value: '`/kick`, `/ban`, `/timeout`, `/purge`' },
        { name: 'ℹ️ Utility', value: '`/ping`, `/help`' }
      )
      .setFooter({ text: 'Auto‑welcome uses the container design you asked for.' });
    await interaction.reply({ embeds: [helpEmbed] });
  }
});

client.login(TOKEN); 
