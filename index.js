
import {
  Client,
  GatewayIntentBits,
  ActivityType,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} from 'discord.js';

import dotenv from 'dotenv';
dotenv.config();

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= PREFIX =================
const PREFIX = '.';

// ================= STORAGE =================
const afk = new Map();
const warnings = new Map();
const welcomeChannels = new Map();
const autoRoles = new Map();
const autoReact = new Map();

// ================= READY =================
client.once('clientReady', async () => {

  console.log(`${client.user?.tag} online`);

  client.user?.setPresence({
    status: 'dnd',
    activities: [
      {
        name: 'N3xel',
        type: ActivityType.Playing
      }
    ]
  });

  // ================= SLASH COMMANDS =================
  const commands = [

    // ================= AFK =================
    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set AFK')
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason')
          .setRequired(true)
      ),

    // ================= AVATAR =================
    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('View avatar')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('Target user')
      ),

    // ================= SAY =================
    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Send message')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Target channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('text')
          .setDescription('Message')
          .setRequired(true)
      ),

    // ================= WELCOME ENABLE =================
    new SlashCommandBuilder()
      .setName('welcomeenable')
      .setDescription('Enable welcome')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Welcome channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),

    // ================= WELCOME DISABLE =================
    new SlashCommandBuilder()
      .setName('welcomedisable')
      .setDescription('Disable welcome'),

    // ================= AUTOROLE =================
    new SlashCommandBuilder()
      .setName('autorole')
      .setDescription('Set autorole')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role')
          .setRequired(true)
      ),

    // ================= WARN =================
    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn user')
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

    // ================= WARNINGS =================
    new SlashCommandBuilder()
      .setName('warnings')
      .setDescription('View warnings')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User')
          .setRequired(true)
      ),

    // ================= UNWARN =================
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
      )

  ].map(command => command.toJSON());

  const rest = new REST({
    version: '10'
  }).setToken(process.env.TOKEN as string);

  await rest.put(
    Routes.applicationCommands(
      client.user!.id
    ),
    { body: commands }
  );

  console.log('Slash commands loaded');

});

// ================= MEMBER JOIN =================
client.on('guildMemberAdd', async (member) => {

  // ================= WELCOME =================
  const welcomeChannel =
    welcomeChannels.get(member.guild.id);

  if (welcomeChannel) {

    const channel =
      member.guild.channels.cache.get(
        welcomeChannel
      );

    if (
      channel &&
      channel.isTextBased()
    ) {

      const container =
        new ContainerBuilder()
          .setAccentColor(0x000000)

          .addTextDisplayComponents(

            new TextDisplayBuilder()
              .setContent(
                `welcomer ${member} to **${member.guild.name}** u are the **${member.guild.memberCount}th** member`
              )

          )

          .addSeparatorComponents(

            new SeparatorBuilder()
              .setSpacing(
                SeparatorSpacingSize.Large
              )

          )

          .addTextDisplayComponents(

            new TextDisplayBuilder()
              .setContent(
                `[bot link](https://discord.com/channels/1502271579634008084/1504341678520008734)\n[law! Must read it.](https://discord.com/channels/1502271579634008084/1504333246232658031)\n[updates!](https://discord.com/channels/1502271579634008084/1504342351622049812)`
              )

          );

      await channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

    }

  }

  // ================= AUTOROLE =================
  const roleId =
    autoRoles.get(member.guild.id);

  if (roleId) {

    const role =
      member.guild.roles.cache.get(
        roleId
      );

    if (role) {

      member.roles.add(role)
        .catch(() => {});

    }

  }

});

// ================= MESSAGE CREATE =================
client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  // ================= AUTOREACT =================
  const emoji =
    autoReact.get(message.channel.id);

  if (emoji) {

    message.react(emoji)
      .catch(() => {});

  }

  // ================= AFK MENTION =================
  message.mentions.users.forEach(user => {

    if (afk.has(user.id)) {

      const data =
        afk.get(user.id);

      message.reply(
        `${user.username} is AFK\nReason: ${data.reason}`
      );

    }

  });

  // ================= REMOVE AFK =================
  if (
    afk.has(message.author.id) &&
    !message.content.startsWith('.afk')
  ) {

    afk.delete(message.author.id);

    message.channel.send(
      `Welcome back ${message.author}`
    );

  }

  if (
    !message.content.startsWith(PREFIX)
  ) return;

  const args =
    message.content
      .slice(PREFIX.length)
      .trim()
      .split(/ +/);

  const cmd =
    args.shift()?.toLowerCase();

  // ================= AFK =================
  if (cmd === 'afk') {

    const reason =
      args.join(' ') || 'No reason';

    afk.set(message.author.id, {
      reason
    });

    return message.reply(
      `${message.author.username} is now AFK\nReason: ${reason}`
    );

  }

  // ================= AVATAR =================
  if (cmd === 'avatar') {

    const user =
      message.mentions.users.first() ||
      message.author;

    const embed =
      new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(
          `${user.username} Avatar`
        )
        .setImage(
          user.displayAvatarURL({
            size: 1024
          })
        );

    return message.reply({
      embeds: [embed]
    });

  }

  // ================= SAY =================
  if (cmd === 'say') {

    if (
      !message.member?.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply(
        'Admin only'
      );
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {

      return message.reply(
        'Usage: .say #channel hello'
      );

    }

    const text =
      args.slice(1).join(' ');

    if (!text) {

      return message.reply(
        'Usage: .say #channel hello'
      );

    }

    await channel.send(text);

    message.delete()
      .catch(() => {});

  }

  // ================= STEAL EMOJI =================
  if (cmd === 'steal') {

    const emoji = args[0];
    const name = args[1];

    if (!emoji || !name) {

      return message.reply(
        'Usage: .steal <emoji> <name>'
      );

    }

    const regex =
      /<(a)?:\w+:(\d+)>/;

    const match =
      emoji.match(regex);

    if (!match) {

      return message.reply(
        'Invalid emoji'
      );

    }

    const animated =
      match[1];

    const emojiId =
      match[2];

    const url =
      `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}?quality=lossless`;

    try {

      const created =
        await message.guild?.emojis.create({
          attachment: url,
          name
        });

      message.reply(
        `Added emoji ${created}`
      );

    } catch {

      message.reply(
        'Failed to steal emoji'
      );

    }

  }

  // ================= STEAL STICKER =================
  if (cmd === 'stealsticker') {

    const name = args[0];

    if (!name) {

      return message.reply(
        'Usage: .stealsticker <name>'
      );

    }

    if (!message.reference) {

      return message.reply(
        'Reply to sticker message'
      );

    }

    try {

      const replied =
        await message.channel.messages.fetch(
          message.reference.messageId
        );

      const sticker =
        replied.stickers.first();

      if (!sticker) {

        return message.reply(
          'No sticker found'
        );

      }

      await message.guild?.stickers.create({
        file: sticker.url,
        name,
        tags: 'sticker'
      });

      message.reply(
        `Sticker ${name} added`
      );

    } catch {

      message.reply(
        'Failed to steal sticker'
      );

    }

  }

});

// ================= INTERACTIONS =================
client.on('interactionCreate', async (interaction) => {

  if (
    !interaction.isChatInputCommand()
  ) return;

  // ================= AFK =================
  if (
    interaction.commandName === 'afk'
  ) {

    const reason =
      interaction.options.getString(
        'reason'
      );

    afk.set(interaction.user.id, {
      reason
    });

    return interaction.reply({
      content:
        `${interaction.user.username} is now AFK\nReason: ${reason}`
    });

  }

  // ================= AVATAR =================
  if (
    interaction.commandName === 'avatar'
  ) {

    const user =
      interaction.options.getUser(
        'user'
      ) || interaction.user;

    const embed =
      new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(
          `${user.username} Avatar`
        )
        .setImage(
          user.displayAvatarURL({
            size: 1024
          })
        );

    return interaction.reply({
      embeds: [embed]
    });

  }

  // ================= SAY =================
  if (
    interaction.commandName === 'say'
  ) {

    const channel =
      interaction.options.getChannel(
        'channel'
      );

    const text =
      interaction.options.getString(
        'text'
      );

    if (
      channel &&
      channel.isTextBased()
    ) {

      await channel.send(text!);

    }

    return interaction.reply({
      content: 'Sent',
      ephemeral: true
    });

  }

  // ================= WELCOME ENABLE =================
  if (
    interaction.commandName ===
    'welcomeenable'
  ) {

    const channel =
      interaction.options.getChannel(
        'channel'
      );

    if (!channel) return;

    welcomeChannels.set(
      interaction.guildId!,
      channel.id
    );

    return interaction.reply({
      content:
        `Welcome enabled in ${channel}`,
      ephemeral: true
    });

  }

  // ================= WELCOME DISABLE =================
  if (
    interaction.commandName ===
    'welcomedisable'
  ) {

    welcomeChannels.delete(
      interaction.guildId!
    );

    return interaction.reply({
      content:
        'Welcome disabled',
      ephemeral: true
    });

  }

  // ================= AUTOROLE =================
  if (
    interaction.commandName ===
    'autorole'
  ) {

    const role =
      interaction.options.getRole(
        'role'
      );

    if (!role) return;

    autoRoles.set(
      interaction.guildId!,
      role.id
    );

    return interaction.reply({
      content:
        `Autorole set to ${role}`,
      ephemeral: true
    });

  }

});

// ================= LOGIN =================
client.login(process.env.TOKEN as string);
