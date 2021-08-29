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
});

client.login(token)
