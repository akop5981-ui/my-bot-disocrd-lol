require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== STORAGE =====
const xp = new Map();
const warns = new Map();
const joins = new Map();
const autorole = new Map();

// ===== READY =====
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===== WELCOMER + AUTOROLE + ANTI RAID =====
client.on('guildMemberAdd', async member => {
  try {

    const channel = member.guild.systemChannel;

    if (channel) {
      channel.send(
        `welcomer ${member} to **${member.guild.name}** u are the **${member.guild.memberCount}** member`
      );
    }

    // ===== AUTOROLE =====
    const roleId = autorole.get(member.guild.id);

    if (roleId) {
      const role = member.guild.roles.cache.get(roleId);

      if (role) {
        await member.roles.add(role).catch(() => {});
      }
    }

    // ===== ANTI RAID =====
    const now = Date.now();

    if (!joins.has(member.guild.id)) {
      joins.set(member.guild.id, []);
    }

    const data = joins.get(member.guild.id);

    data.push(now);

    const recent = data.filter(t => now - t < 10000);

    joins.set(member.guild.id, recent);

    if (recent.length >= 5) {
      channel?.send('⚠️ Anti-raid detected!');
    }

  } catch (err) {
    console.error(err);
  }
});

// ===== LEVEL SYSTEM =====
client.on('messageCreate', async message => {
  try {

    if (!message.guild) return;
    if (message.author.bot) return;

    const key = `${message.guild.id}-${message.author.id}`;

    let userXp = xp.get(key) || 0;

    userXp += 5;

    xp.set(key, userXp);

    const level = Math.floor(userXp / 100);

    if (userXp % 100 === 0) {
      message.channel.send(
        `${message.author} reached level **${level}** 🎉`
      );
    }

  } catch (err) {
    console.error(err);
  }
});

// ===== SLASH COMMANDS =====
const commands = [

  // PING
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command'),

  // BAN
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    ),

  // KICK
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    ),

  // WARN
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

  // WARNINGS
  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Show warnings')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    ),

  // UNWARN
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

  // AUTOROLE
  new SlashCommandBuilder()
    .setName('setautorole')
    .setDescription('Set auto role')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role')
        .setRequired(true)
    )

].map(cmd => cmd.toJSON());

// ===== REGISTER COMMANDS =====
const rest = new REST({ version: '10' })
  .setToken(process.env.TOKEN);

(async () => {
  try {

    console.log('🔄 Registering slash commands...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('✅ Slash commands registered');

  } catch (err) {
    console.error(err);
  }
})();

// ===== INTERACTION HANDLER =====
client.on('interactionCreate', async interaction => {
  try {

    if (!interaction.isChatInputCommand()) return;

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

      const user = interaction.options.getUser('user');

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply('❌ User not found');
      }

      await member.ban().catch(() => {});

      return interaction.reply(
        `✅ Banned ${user.tag}`
      );
    }

    // ===== KICK =====
    if (commandName === 'kick') {

      const user = interaction.options.getUser('user');

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply('❌ User not found');
      }

      await member.kick().catch(() => {});

      return interaction.reply(
        `👢 Kicked ${user.tag}`
      );
    }

    // ===== WARN =====
    if (commandName === 'warn') {

      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      if (!warns.has(user.id)) {
        warns.set(user.id, []);
      }

      const userWarns = warns.get(user.id);

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

      const user = interaction.options.getUser('user');

      const userWarns = warns.get(user.id) || [];

      if (!userWarns.length) {
        return interaction.reply(
          `${user.tag} has no warnings`
        );
      }

      const list = userWarns
        .map(w => `ID: ${w.id} | ${w.reason}`)
        .join('\n');

      return interaction.reply(
        `⚠️ Warnings for ${user.tag}\n${list}`
      );
    }

    // ===== UNWARN =====
    if (commandName === 'unwarn') {

      const user = interaction.options.getUser('user');
      const id = interaction.options.getInteger('id');

      const userWarns = warns.get(user.id);

      if (!userWarns) {
        return interaction.reply('No warnings');
      }

      const filtered = userWarns.filter(w => w.id !== id);

      warns.set(user.id, filtered);

      return interaction.reply(
        `✅ Removed warning ID ${id}`
      );
    }

    // ===== AUTOROLE =====
    if (commandName === 'setautorole') {

      const role = interaction.options.getRole('role');

      autorole.set(interaction.guild.id, role.id);

      return interaction.reply(
        `✅ Autorole set to ${role.name}`
      );
    }

  } catch (err) {
    console.error(err);
  }
});

// ===== ANTI CRASH =====
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
