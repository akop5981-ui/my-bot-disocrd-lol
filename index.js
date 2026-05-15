require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  PermissionsBitField
} = require('discord.js');

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
  console.log(`${client.user.tag} is online`);
});

// ===== WELCOMER =====
client.on('guildMemberAdd', async member => {
  const channel = member.guild.systemChannel;
  if (!channel) return;

  channel.send(
    `welcomer ${member} to **${member.guild.name}** u are the **${member.guild.memberCount}** member`
  );

  // AUTO ROLE
  const roleId = autorole.get(member.guild.id);
  if (roleId) {
    const role = member.guild.roles.cache.get(roleId);
    if (role) member.roles.add(role).catch(() => {});
  }

  // ANTI RAID
  const now = Date.now();

  if (!joins.has(member.guild.id)) joins.set(member.guild.id, []);
  const data = joins.get(member.guild.id);

  data.push(now);

  const recent = data.filter(t => now - t < 10000);
  joins.set(member.guild.id, recent);

  if (recent.length >= 5) {
    member.guild.systemChannel?.send("⚠️ Anti-raid detected!");
  }
});

// ===== LEVEL SYSTEM =====
client.on('messageCreate', message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const key = `${message.guild.id}-${message.author.id}`;

  let userXp = xp.get(key) || 0;
  userXp += 5;
  xp.set(key, userXp);

  const level = Math.floor(userXp / 100);

  if (userXp % 100 === 0) {
    message.channel.send(`${message.author} reached level **${level}** 🎉`);
  }

  // SIMPLE WARN CHECK (optional auto action)
});

// ===== SLASH COMMAND HANDLER =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // ===== BAN =====
  if (commandName === 'ban') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return interaction.reply({ content: 'No permission', ephemeral: true });

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);

    await member.ban();
    return interaction.reply(`✅ Banned ${user.tag}`);
  }

  // ===== KICK =====
  if (commandName === 'kick') {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);

    await member.kick();
    return interaction.reply(`👢 Kicked ${user.tag}`);
  }

  // ===== WARN =====
  if (commandName === 'warn') {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    const key = user.id;

    if (!warns.has(key)) warns.set(key, []);
    warns.get(key).push(reason);

    return interaction.reply(`⚠️ Warned ${user.tag} | Reason: ${reason}`);
  }

  // ===== SET AUTOROLE =====
  if (commandName === 'setautorole') {
    const role = interaction.options.getRole('role');
    autorole.set(interaction.guild.id, role.id);

    return interaction.reply(`✅ Auto role set to ${role.name}`);
  }

  // ===== SET WELCOME (simple placeholder) =====
  if (commandName === 'setwelcome') {
    return interaction.reply(`✅ Welcome is already system channel (basic version)`);
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
