const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GPT_SYSTEM_MESSAGE = process.env.GPT_SYSTEM_MESSAGE;

console.log(GPT_SYSTEM_MESSAGE);

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

const client = new Discord.Client(options);


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (msg) => {
  if(msg.author.bot) return;
  if(msg.content.includes("@here") || msg.content.includes("@everyone") || msg.type == "REPLY") return;

  if(msg.mentions.has(client.user.id)) {
    await startThread(msg);
  } else if(msg.channel.ownerId == client.user.id){
    await replyThreadMsg(msg);
  }
});

client.login(BOT_TOKEN);


const startThread = async (msg) => {
  const user_msg = removeMentionFromMessage(msg.content);
  const gpt_reply = await getGptReply(
    [
      {
        "role": "user",
        "content": user_msg,
      }
    ]
  );
  const thread = await msg.startThread({
    name: user_msg,
    autoArchiveDuration: 60,
  });
  await thread.send(gpt_reply);
};

const replyThreadMsg = async (msg) => {
  const channel = msg.channel;
  const msgCount = channel.messageCount;
  const starterMsg = await channel.fetchStarterMessage();
  const messages = await channel.messages.fetch({limit: msgCount});

  const inputMsgs = [];
  messages.forEach((v, k) => {
    const role = v.author.id == CLIENT_ID ? 'assistant' : 'user';
    const content = removeMentionFromMessage(v.content);
    inputMsgs.unshift(
      {
        "role": role,
        "content": content,
      }
    );
  });
  inputMsgs.unshift(
    {
      "role": 'user',
      "content": removeMentionFromMessage(starterMsg.content),
    }
  );

  console.log(inputMsgs);

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
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo", //言語モデル
    messages: inputMsgs,
  });
 console.log(completion.data.choices[0].message.content); //コンソールに出力
 return completion.data.choices[0].message.content;
}

const removeMentionFromMessage = (str) => {
  const rexp = /<@\d+>/g;
  return str.replace(rexp,'').trim();
}