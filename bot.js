const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GPT_SYSTEM_MESSAGE = process.env.GPT_SYSTEM_MESSAGE;
const GPT_TEMP = Number(process.env.GPT_TEMP);
const GPT_MAX_TOKENS = Number(process.env.GPT_MAX_TOKENS);

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
  const threadName = userMsg.length <= 15 ? userMsg : userMsg.substr(0,15) + '...';
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
        "role":  v.author.id == client.user.id ? 'assistant' : 'user',
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

  try{
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo", //言語モデル
      messages: inputMsgs,
      temperature: GPT_TEMP,
      max_tokens: GPT_MAX_TOKENS
    });
    const reply = completion.data.choices[0].message.content;
    const usage = completion.data.usage;
    console.log(`reply: ${reply}`);
    console.log(`usage: ${JSON.stringify(usage)}`);
    return reply;
  }catch(e){
    console.log(e);
    return "エラーが発生しました";
  }
}

const getCleanMessage = (str) => {
  const rexp = /<@.+>/g;
  return str.replace(rexp,'').trim();
}