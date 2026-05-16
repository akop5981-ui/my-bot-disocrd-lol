require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  ActivityType,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ChannelType,
  MessageFlags
} = require('discord.js');

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= CONFIG =================
const PREFIX = '.';

// ================= STORAGE =================
const afk = new Map();
const warnings = new Map();
const welcome = new Map();
const autorole = new Map();
const autoreact = new Map();

// ================= READY =================
client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{ name: 'N3xel Bot', type: ActivityType.Playing }]
  });

  // ================= SLASH COMMANDS =================
  const commands = [
    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set AFK')
      .addStringOption(o =>
        o.setName('reason').setDescription('reason').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get avatar')
      .addUserOption(o =>
        o.setName('user').setDescription('user')
      ),

    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Send message')
      .addChannelOption(o =>
        o.setName('channel')
          .setDescription('channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addStringOption(o =>
        o.setName('text').setDescription('text').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('welcomeenable')
      .setDescription('Enable welcome')
      .addChannelOption(o =>
        o.setName('channel')
          .setDescription('channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('welcomedisable')
      .setDescription('Disable welcome'),

    new SlashCommandBuilder()
      .setName('autorole')
      .setDescription('Set autorole')
      .addRoleOption(o =>
        o.setName('role').setDescription('role').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn user')
      .addUserOption(o =>
        o.setName('user').setRequired(true)
      )
      .addStringOption(o =>
        o.setName('reason').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('warnings')
      .setDescription('View warnings')
      .addUserOption(o =>
        o.setName('user').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('unwarn')
      .setDescription('Remove warning')
      .addUserOption(o =>
        o.setName('user').setRequired(true)
      )
      .addIntegerOption(o =>
        o.setName('id').setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log('Slash commands ready');
});

// ================= WELCOME FIXED =================
client.on('guildMemberAdd', async (member) => {

  const channelId = welcome.get(member.guild.id);
  if (!channelId) return;

  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) return;

  channel.send(
    `Welcome ${member} to **${member.guild.name}** you are the **${member.guild.memberCount}th member**`
  );

  const roleId = autorole.get(member.guild.id);
  if (roleId) {
    const role = member.guild.roles.cache.get(roleId);
    if (role) member.roles.add(role).catch(() => {});
  }
});

// ================= MESSAGE SYSTEM =================
client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  // AUTO REACT
  const emoji = autoreact.get(message.channel.id);
  if (emoji) message.react(emoji).catch(() => {});

  // AFK MENTION
  message.mentions.users.forEach(u => {
    if (afk.has(u.id)) {
      message.reply(`${u.username} is AFK: ${afk.get(u.id).reason}`);
    }
  });

  // REMOVE AFK
  if (afk.has(message.author.id) && !message.content.startsWith('.afk')) {
    afk.delete(message.author.id);
    message.channel.send(`Welcome back ${message.author}`);
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ================= AFK =================
  if (cmd === 'afk') {
    afk.set(message.author.id, { reason: args.join(' ') || 'No reason' });
    return message.reply('You are now AFK');
  }

  // ================= AVATAR =================
  if (cmd === 'avatar') {
    const user = message.mentions.users.first() || message.author;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x000000)
          .setTitle(`${user.username} Avatar`)
          .setImage(user.displayAvatarURL({ size: 1024 }))
      ]
    });
  }

  // ================= SAY =================
  if (cmd === 'say') {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply('Admin only');

    const channel = message.mentions.channels.first();
    const text = args.slice(1).join(' ');

    if (!channel || !text)
      return message.reply('Usage: .say #channel message');

    await channel.send(text);
    message.delete().catch(() => {});
  }

  // ================= WELCOME ENABLE =================
  if (cmd === 'welcomeenable') {
    const ch = message.mentions.channels.first();
    if (!ch) return message.reply('Usage: .welcomeenable #channel');

    welcome.set(message.guild.id, ch.id);
    return message.reply(`Welcome enabled in ${ch}`);
  }

  // ================= WELCOME DISABLE =================
  if (cmd === 'welcomedisable') {
    welcome.delete(message.guild.id);
    return message.reply('Welcome disabled');
  }

  // ================= AUTOROLE =================
  if (cmd === 'autorole') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply('Usage: .autorole @role');

    autorole.set(message.guild.id, role.id);
    return message.reply(`Autorole set: ${role.name}`);
  }

  // ================= STEAL EMOJI =================
  if (cmd === 'steal') {
    const emoji = args[0];
    const name = args[1];

    const match = emoji?.match(/<(a)?:\w+:(\d+)>/);
    if (!match) return message.reply('Invalid emoji');

    const url = `https://cdn.discordapp.com/emojis/${match[2]}.png`;

    try {
      const created = await message.guild.emojis.create({
        attachment: url,
        name
      });

      message.reply(`Added ${created}`);
    } catch {
      message.reply('Failed');
    }
  }

  // ================= STEAL STICKER =================
  if (cmd === 'stealsticker') {
    const name = args[0];
    if (!message.reference) return message.reply('Reply to sticker');

    const msg = await message.channel.messages.fetch(message.reference.messageId);
    const sticker = msg.stickers.first();
    if (!sticker) return message.reply('No sticker');

    try {
      await message.guild.stickers.create({
        file: sticker.url,
        name,
        tags: 'sticker'
      });

      message.reply('Sticker added');
    } catch {
      message.reply('Failed');
    }
  }

  // ================= WARN =================
  if (cmd === 'warn') {
    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason';

    if (!user) return message.reply('Mention user');

    if (!warnings.has(user.id)) warnings.set(user.id, []);

    const list = warnings.get(user.id);
    list.push({ id: list.length + 1, reason });

    message.reply(`Warned ${user.tag}`);
  }

  // ================= WARNINGS =================
  if (cmd === 'warnings') {
    const user = message.mentions.users.first();
    const list = warnings.get(user?.id);

    if (!list?.length) return message.reply('No warnings');

    message.reply(list.map(w => `ID:${w.id} ${w.reason}`).join('\n'));
  }

  // ================= UNWARN =================
  if (cmd === 'unwarn') {
    const user = message.mentions.users.first();
    const id = parseInt(args[1]);

    const list = warnings.get(user?.id);
    if (!list) return message.reply('No warnings');

    const index = list.findIndex(w => w.id === id);
    if (index === -1) return message.reply('Invalid ID');

    list.splice(index, 1);
    message.reply('Removed warning');
  }

});

// ================= LOGIN =================
client.login(process.env.TOKEN);
