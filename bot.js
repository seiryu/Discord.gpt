const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const { REST, Routes } = require('discord.js');
const { Client, GatewayIntentBits } = require('discord.js');
const Discord = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");

const settings = require('./config.js');


const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const options = {
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
}

const commands = [
  {
    name: 'gpt',
    description: 'ChatGPTと会話を始める',
  },
];

const client = new Discord.Client(options);


(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'gpt') {
    await interaction.reply('会話用のスレッドを作成します');

    const channel = interaction.channel;
    try{
      await channel.threads.create({
        name: 'ChatGPTと話そう！',
        autoArchiveDuration: 60,
      });
    } catch(error) {
      await channel.send('コマンドの実行に失敗しました');
    }
  }
});




client.on('messageCreate', async (msg) => {
  if(msg.author.bot) return;
  if(msg.channel.ownerId != CLIENT_ID) return;

  const channel = msg.channel;
  const msgCount = channel.messageCount;
  const messages = await channel.messages.fetch({limit: msgCount});

  const gptMsg = [];
  messages.forEach((v, k) => {
    const role = v.author.id == CLIENT_ID ? 'assistant' : 'user';
    const content = v.content;
    gptMsg.unshift(
      {
        "role": role,
        "content": content,
      }
    );
  });

  console.log(gptMsg);

  var reply = await getGptReply(gptMsg);
  msg.channel.send(reply);
});

client.login(BOT_TOKEN);



const getGptReply =  async (msg) => {
  msg.unshift(
    {
      "role": "system",
      "content": settings.system_message,
    }
  );
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo", //言語モデル
    messages: msg,
  });
 console.log(completion.data.choices[0].message.content); //コンソールに出力
 return completion.data.choices[0].message.content;
}