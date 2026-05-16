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

// ===== WELCOMER + ANTI RAID + AUTOROLE =====
client.on('guildMemberAdd', async member => {
  try {
    const channel = member.guild.systemChannel;

    if (channel) {
      channel.send(
        `welcomer ${member} to **${member.guild.name}** u are the **${member.guild.memberCount}** member`
      );
    }

    // ===== AUTO ROLE =====
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
      channel?.send('⚠️ Anti-raid triggered!');
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

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to ban')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to kick')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
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

  new SlashCommandBuilder()
    .setName('setautorole')
    .setDescription('Set autorole')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role')
        .setRequired(true)
    )

].map(cmd => cmd.toJSON());

// ===== REGISTER COMMANDS =====
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

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

// ===== COMMAND HANDLER =====
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

      return interaction.reply(`✅ Banned ${user.tag}`);
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

      return interaction.reply(`👢 Kicked ${user.tag}`);
    }

    // ===== WARN =====
    if (commandName === 'warn') {

      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      if (!warns.has(user.id)) {
        warns.set(user.id, []);
      }

      warns.get(user.id).push(reason);

      return interaction.reply(
        `⚠️ Warned ${user.tag}\nReason: ${reason}`
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
