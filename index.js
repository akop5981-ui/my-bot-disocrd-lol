require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

// ================= STORAGE =================
const xp = new Map();
const warns = new Map();
const joins = new Map();

const settings = {
  autorole: new Map(),
  welcome: new Map(),
  logs: new Map()
};

// ================= READY =================
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} online`);
});

// ================= WELCOMER =================
client.on('guildMemberAdd', async member => {

  const welcomeChannelId =
    settings.welcome.get(member.guild.id);

  let channel = null;

  if (welcomeChannelId) {
    channel =
      member.guild.channels.cache.get(welcomeChannelId);
  }

  if (!channel) {
    channel = member.guild.systemChannel;
  }

  if (channel) {
    channel.send(
      `welcomer ${member} to **${member.guild.name}** u are the **${member.guild.memberCount}** member`
    );
  }

  // ===== AUTOROLE =====
  const roleId =
    settings.autorole.get(member.guild.id);

  if (roleId) {

    const role =
      member.guild.roles.cache.get(roleId);

    if (role) {
      member.roles.add(role).catch(() => {});
    }
  }

  // ===== ANTI RAID =====
  const now = Date.now();

  if (!joins.has(member.guild.id)) {
    joins.set(member.guild.id, []);
  }

  const data = joins.get(member.guild.id);

  data.push(now);

  const recent =
    data.filter(t => now - t < 10000);

  joins.set(member.guild.id, recent);

  if (recent.length >= 5) {
    channel?.send(
      '⚠️ Anti-raid triggered!'
    );
  }
});

// ================= LEVEL SYSTEM =================
client.on('messageCreate', async message => {

  if (!message.guild) return;
  if (message.author.bot) return;

  const key =
    `${message.guild.id}-${message.author.id}`;

  let userXp = xp.get(key) || 0;

  userXp += 5;

  xp.set(key, userXp);

  const level =
    Math.floor(userXp / 100);

  if (userXp % 100 === 0) {

    const embed = new EmbedBuilder()
      .setTitle('🎉 Level Up')
      .setDescription(
        `${message.author} reached level **${level}**`
      );

    message.channel.send({
      embeds: [embed]
    });
  }

});

// ================= COMMANDS =================
const commands = [

  // ===== PING =====
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command'),

  // ===== BAN =====
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    ),

  // ===== KICK =====
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    ),

  // ===== TIMEOUT =====
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('minutes')
        .setDescription('Minutes')
        .setRequired(true)
    ),

  // ===== WARN =====
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason')
        .setRequired(true)
    ),

  // ===== WARNINGS =====
  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Show warnings')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    ),

  // ===== UNWARN =====
  new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove warning')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('id')
        .setDescription('Warning ID')
        .setRequired(true)
    ),

  // ===== PURGE =====
  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Amount')
        .setRequired(true)
    ),

  // ===== SET AUTOROLE =====
  new SlashCommandBuilder()
    .setName('setautorole')
    .setDescription('Set autorole')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role')
        .setRequired(true)
    ),

  // ===== SETWELCOME =====
  new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Set welcome channel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  // ===== RANK =====
  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check rank')

].map(cmd => cmd.toJSON());

// ================= REGISTER COMMANDS =================
const rest = new REST({
  version: '10'
}).setToken(process.env.TOKEN);

(async () => {

  try {

    console.log(
      '🔄 Registering slash commands...'
    );

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log(
      '✅ Slash commands registered'
    );

  } catch (err) {
    console.error(err);
  }

})();

// ================= INTERACTION HANDLER =================
client.on('interactionCreate',
async interaction => {

  if (!interaction.isChatInputCommand())
    return;

  const { commandName } = interaction;

  // ===== PING =====
  if (commandName === 'ping') {
    return interaction.reply('🏓 Pong!');
  }

  // ===== BAN =====
  if (commandName === 'ban') {

    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.BanMembers
      )
    ) {
      return interaction.reply({
        content: '❌ No permission',
        ephemeral: true
      });
    }

    const user =
      interaction.options.getUser('user');

    const member =
      await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member) {
      return interaction.reply(
        '❌ User not found'
      );
    }

    await member.ban().catch(() => {});

    return interaction.reply(
      `✅ Banned ${user.tag}`
    );
  }

  // ===== KICK =====
  if (commandName === 'kick') {

    const user =
      interaction.options.getUser('user');

    const member =
      await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member) {
      return interaction.reply(
        '❌ User not found'
      );
    }

    await member.kick().catch(() => {});

    return interaction.reply(
      `👢 Kicked ${user.tag}`
    );
  }

  // ===== TIMEOUT =====
  if (commandName === 'timeout') {

    const user =
      interaction.options.getUser('user');

    const minutes =
      interaction.options.getInteger(
        'minutes'
      );

    const member =
      await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member) {
      return interaction.reply(
        '❌ User not found'
      );
    }

    await member.timeout(
      minutes * 60 * 1000
    );

    return interaction.reply(
      `⏰ Timed out ${user.tag}`
    );
  }

  // ===== WARN =====
  if (commandName === 'warn') {

    const user =
      interaction.options.getUser('user');

    const reason =
      interaction.options.getString(
        'reason'
      );

    if (!warns.has(user.id)) {
      warns.set(user.id, []);
    }

    const userWarns =
      warns.get(user.id);

    const warnData = {
      id: userWarns.length + 1,
      reason
    };

    userWarns.push(warnData);

    return interaction.reply(
      `⚠️ Warned ${user.tag}\nID: ${warnData.id}\nReason: ${reason}`
    );
  }

  // ===== WARNINGS =====
  if (commandName === 'warnings') {

    const user =
      interaction.options.getUser('user');

    const userWarns =
      warns.get(user.id) || [];

    if (!userWarns.length) {
      return interaction.reply(
        `${user.tag} has no warnings`
      );
    }

    const list =
      userWarns
      .map(
        w =>
        `ID: ${w.id} | ${w.reason}`
      )
      .join('\n');

    return interaction.reply(
      `⚠️ Warnings for ${user.tag}\n${list}`
    );
  }

  // ===== UNWARN =====
  if (commandName === 'unwarn') {

    const user =
      interaction.options.getUser('user');

    const id =
      interaction.options.getInteger('id');

    const userWarns =
      warns.get(user.id);

    if (!userWarns) {
      return interaction.reply(
        'No warnings'
      );
    }

    const filtered =
      userWarns.filter(
        w => w.id !== id
      );

    warns.set(user.id, filtered);

    return interaction.reply(
      `✅ Removed warning ID ${id}`
    );
  }

  // ===== PURGE =====
  if (commandName === 'purge') {

    const amount =
      interaction.options.getInteger(
        'amount'
      );

    await interaction.channel
      .bulkDelete(amount);

    return interaction.reply({
      content:
        `🗑️ Deleted ${amount} messages`,
      ephemeral: true
    });
  }

  // ===== SET AUTOROLE =====
  if (commandName === 'setautorole') {

    const role =
      interaction.options.getRole(
        'role'
      );

    settings.autorole.set(
      interaction.guild.id,
      role.id
    );

    return interaction.reply(
      `✅ Autorole set to ${role.name}`
    );
  }

  // ===== SETWELCOME =====
  if (commandName === 'setwelcome') {

    const channel =
      interaction.options.getChannel(
        'channel'
      );

    settings.welcome.set(
      interaction.guild.id,
      channel.id
    );

    return interaction.reply(
      `✅ Welcome channel set to ${channel}`
    );
  }

  // ===== RANK =====
  if (commandName === 'rank') {

    const key =
      `${interaction.guild.id}-${interaction.user.id}`;

    const userXp =
      xp.get(key) || 0;

    const level =
      Math.floor(userXp / 100);

    return interaction.reply(
      `📊 Level: ${level}\nXP: ${userXp}`
    );
  }

});

// ================= ANTI CRASH =================
process.on(
  'unhandledRejection',
  err => {
    console.error(err);
  }
);

process.on(
  'uncaughtException',
  err => {
    console.error(err);
  }
);

// ================= LOGIN =================
client.login(process.env.TOKEN);
