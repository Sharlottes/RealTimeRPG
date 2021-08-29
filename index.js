const Discord = require("discord.js")
const client = new Discord.Client()
const fs = require("fs")
const prefix = '!';

client.commands = new Discord.Collection() 

client.commands.load = dir => {
  for (const file of fs.readdirSync(dir)) {
    const cmd = require(`./commands/${file}`);
    client.commands.set(cmd.name, cmd);
  }
  console.log(client.commands.map(c => c.name).join(', ') + ' command loaded.');
}

client.commands.load("commands/general");

client.on("ready", () => console.log(`Logged in as ${client.user.tag}!`))

client.on("message", (message) => {
  if (message.author.bot) return; //not botself
  if (!message.content.startsWith(prefix)) return; //need command tag

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  let cmd = client.commands.get(command);
  if(cmd) cmd.run(client, message, args);
});

client.login(process.env.token)
