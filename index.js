const Discord = require("discord.js");
const fs = require("fs");
const client = new Discord.Client();
const prefix = "!";

client.commands = new Discord.Collection();

const help = require("./commands/help.js");
client.commands.set(help.name, help);
for (const file of fs.readdirSync("./commands")) {
  if (file.name === "help") continue;
  const cmd = require("./commands/" + file);
  client.commands.set(cmd.name, cmd);
}

client.on("ready", () => console.log(`Logged in as ${client.user.tag}!`));

client.on("message", (message) => {
  if (message.author.bot) return; //not botself
  if (!message.content.startsWith(prefix)) return; //need command tag

  const args = message.content.slice(prefix.length).trim().split(" ");
  const command = args.shift().toLowerCase();
  let cmd = client.commands.get(command);
  if (cmd) cmd.run(client, message, args);
});

client.login(process.env.token);
