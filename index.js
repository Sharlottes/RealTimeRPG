const Discord = require("discord.js")
const fs = require("fs")
const intent_list = new Discord.Intents(["GUILD_MEMBERS", "GUILD_MESSAGES", "GUILDS", "GUILD_INVITES"])
const client = new Discord.Client({ ws: { intents: intent_list } })
const prefix = '!';
const token = process.env.token

client.commands = new Discord.Collection() 

client.commands.load = dir => {
  for (const file of fs.readdirSync(dir)) {
    const cmd = require(`./commands/${file}`);
    client.commands.set(cmd.name, cmd);
  }
  console.log(client.commands.map(c => c.name).join(', ') + ' command loaded.');
}

client.commands.load(__dirname + "/commands");

client.on("ready", () => console.log(`Logged in as ${client.user.tag}!`))

client.on("message", (message) => {
  if (message.author.bot) return; //not botself
  if (!msg.content.startsWith(prefix)) return; //need command tag

  const args = msg.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  let cmd = client.commands.get(command);
  if(cmd) cmd.run(client, msg, args);


  /*
  if (message.content == "embed") {
    let img = "https://cdn.discordapp.com/icons/419671192857739264/6dccc22df4cb0051b50548627f36c09b.webp?size=256"
    let embed = new Discord.MessageEmbed()
      .setTitle("타이틀")
      .setURL("http://www.naver.com")
      .setAuthor("나긋해", img, "http://www.naver.com")
      .setThumbnail(img)
      //.addBlankField()  < 해당 구문은 .addField('\u200b', '\u200b') 로 대체할 수 있습니다.
      .addField("Inline field title", "Some value here")
      .addField("Inline field title", "Some value here", true)
      .addField("Inline field title", "Some value here", true)
      .addField("Inline field title", "Some value here", true)
      .addField("Inline field title", "Some value here1\nSome value here2\nSome value here3\n")
      //.addBlankField()  < 해당 구문은 .addField('\u200b', '\u200b') 로 대체할 수 있습니다.
      .setTimestamp()
      .setFooter("나긋해가 만듬", img)

    message.channel.send(embed)
  }
  */
  if (message.content == "si.help") {
    let helpImg = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png"
    let commandList = [
      { name: "ping", desc: "check bot status" },
      { name: "help", desc: "show avaliable commands" },
      { name: "info <unitname>", desc: "show its information" },
      { name: "create <unitname>", desc: "add new unit" }
    ]
    let commandStr = ""
    let embed = new Discord.MessageEmbed().setAuthor("Avaliable Commands", helpImg).setColor("#186de6")

    commandList.forEach((x) => {
      commandStr += `• !\`\`${changeCommandStringLength(`${x.name}`)}\`\` : **${x.desc}**\n`
    })

    embed.addField("Commands: ", commandStr)

    message.channel.send(embed)
  }
})

function changeCommandStringLength(str, limitLen = 8) {
  let tmp = str
  limitLen -= tmp.length

  for (let i = 0; i < limitLen; i++) {
    tmp += " "
  }

  return tmp
}

client.login(token)
