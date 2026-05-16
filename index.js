require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===== COMMANDS =====
const commands = [

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User')
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
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ Slash commands registered instantly');

  } catch (err) {
    console.error(err);
  }
})();

// ===== COMMAND HANDLER =====
client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    return interaction.reply('🏓 Pong!');
  }

  if (interaction.commandName === 'ban') {

    const user = interaction.options.getUser('user');

    return interaction.reply(
      `Would ban ${user.tag}`
    );
  }

});

client.login(process.env.TOKEN);
