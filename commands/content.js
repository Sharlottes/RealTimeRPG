const Discord = require("discord.js");
const fs = require("fs");

exports.run = (client, message, args) => {
  console.log(client + " called content commands with" + JSON.stringify(args));

  let stop = false;
  let jsonFiles = fs.readdirSync("./json");
  let kvStrs = [""];
  let keys = [""];
  let files = [""];
  let fileIndex = 0,
    keyIndex = 0,
    kvIndex = 0;

  jsonFiles.forEach((f) => {
    if (f !== undefined) files[fileIndex++] = f;
    if (stop || args[0] === undefined || args[0] != f.split(".")[0]) return;

    let jsonBuffer = fs.readFileSync("./json/" + f);
    let jsonData = JSON.parse(jsonBuffer.toString(), (k, v) => {
      if (JSON.stringify(v).includes("{")) keys[keyIndex++] = k;
      return v;
    });

    if (jsonData[args[1]] !== undefined) {
      let value = JSON.stringify(jsonData[args[1]]);
      JSON.parse(value, (k1, v1) => {
        if (args[2] !== undefined) {
          if (k1 == args[2]) kvStrs[kvIndex++] = `${k1} : ${v1}`;
        } else kvStrs[kvIndex++] = `${k1} : ${v1}`;

        return v1;
      });
    }

    stop = true;
  });

  let helpImg =
    "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png";
  let str = "";
  let maxLength = 1000;
  if (!stop || args[0] === undefined) {
    message.channel.send("**content type is not found!**");
    files.forEach((k) => {
      str += `• !content **${f.replace(".json", "")}** <content> <value>\n`;
      if (str.length >= maxLength || files.indexOf(f) == files.length - 2) {
        message.channel.send(
          new Discord.MessageEmbed()
            .setAuthor(`All Content Types`, helpImg)
            .setColor("#186de6")
            .addField(`Commands`, str)
        );
        str = "";
      }
    });
  } else if (args[1] === undefined) {
    message.channel.send(`**${args[0]} content is not found!**`);
    keys.forEach((k) => {
      str += `• !content ${args[0]} **${k}** <value>\n`;
      if (str.length >= maxLength || keys.indexOf(k) == keys.length - 2) {
        message.channel.send(
          new Discord.MessageEmbed()
            .setAuthor(`All ${args[0]} contents`, helpImg)
            .setColor("#186de6")
            .addField(`Commands`, str)
        );
        str = "";
      }
    });
  } else {
    kvStrs.forEach((kv) => {
      str += `${kv}\n`;
      if (str.length >= maxLength || kvStrs.indexOf(kv) == kvStrs.length - 2) {
        message.channel.send(
          new Discord.MessageEmbed()
            .setAuthor(`All ${args[0]} - ${args[1]} Values`, helpImg)
            .setColor("#186de6")
            .addField(`Values`, str)
        );
        str = "";
      }
    });
  }
};

exports.name = "content";
exports.description =
  "show contents.\nex) !content, !content block, !content block air, !content block air health...";
