const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GPT_SYSTEM_MESSAGE = process.env.GPT_SYSTEM_MESSAGE;

const { REST, Routes, MessageType } = require('discord.js');
const { Client, GatewayIntentBits } = require('discord.js');
const Discord = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");

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

const client = new Discord.Client(options);


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (msg) => {
  if(msg.author.bot) return;
  if(msg.type != MessageType.Default) return;
  if(msg.content.includes("@here") || msg.content.includes("@everyone")) return;

  console.log(`message: ${msg}`);

  if(msg.mentions.has(client.user.id)) {
    await startThread(msg);
  } else if(msg.channel.ownerId == client.user.id){
    await replyThreadMsg(msg);
  }
});

client.login(BOT_TOKEN);


const startThread = async (msg) => {
  const userMsg = getCleanMessage(msg.content);
  const getReply = await getGptReply([
    {
      "role": "user",
      "content": userMsg,
    }
  ]);
  const threadName = userMsg.length <= 15 ? userMsg : userMsg.sustr(0,15) + '...';
  const thread = await msg.startThread({
    name: threadName,
    autoArchiveDuration: 60,
  });
  await thread.send(getReply);
};

const replyThreadMsg = async (msg) => {
  const channel = msg.channel;
  const msgCount = channel.messageCount;
  const starterMsg = await channel.fetchStarterMessage();
  const messages = await channel.messages.fetch({limit: msgCount});

  const inputMsgs = [];
  messages.forEach((v, k) => {
    if(v.type != MessageType.Default) return;

    inputMsgs.unshift(
      {
        "role":  v.author.id == CLIENT_ID ? 'assistant' : 'user',
        "content": getCleanMessage(v.content),
      }
    );
  });
  inputMsgs.unshift(
    {
      "role": 'user',
      "content": getCleanMessage(starterMsg.content),
    }
  );

  const reply = await getGptReply(inputMsgs);
  await msg.channel.send(reply);
};


const getGptReply = async (inputMsgs) => {
  inputMsgs.unshift(
    {
      "role": "system",
      "content": GPT_SYSTEM_MESSAGE,
    }
  );
  console.log(`input: ${JSON.stringify(inputMsgs)}`);

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo", //言語モデル
    messages: inputMsgs,
  });

  const reply = completion.data.choices[0].message.content;
  console.log(`reply: ${reply}`);

  return reply;
}

const getCleanMessage = (str) => {
  const rexp = /<@\d+>/g;
  return str.replace(rexp,'').trim();
}