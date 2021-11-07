const Discord = require("discord.js");
const fs = require("fs");

exports.run = (client, message, args) => {
  console.log("content commands is called with" + JSON.stringify(args));

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
      var vstr = JSON.stringify(v);
      if (JSON.stringify(v).slice(0, 1).includes("{") && !vstr.includes("{}"))
        keys[keyIndex++] = k;
      return v;
    });

    console.log(jsonData.keys());

    if (jsonData[args[1]] !== undefined) {
      let value = JSON.stringify(jsonData[args[1]]);
      JSON.parse(value, (k, v) => {
        if (args[2] !== undefined) {
          if (k.includes(args[2])) {
            kvStrs[kvIndex++] = `${k} : ${v}`;
          }
        } else {
          kvStrs[kvIndex++] = `${k} : ${v}`;
        }

        return v;
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
      str += `• !content **${k.replace(".json", "")}** <content> <value>\n`;
      if (str.length >= maxLength || files.indexOf(k) == files.length - 2) {
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
      if (k !== "immunities" && k !== "")
        str += `• !content ${args[0]} **${k}** <value>\n`;
    });

    for (var i = 0; i < str.length % maxLength; i++) {
      sstr = str.slice(
        i * maxLength,
        Math.min(str.length, (i + 1) * maxLength)
      );

      if (sstr !== "")
        message.channel.send(
          new Discord.MessageEmbed()
            .setAuthor(`All ${args[0]} contents`, helpImg)
            .setColor("#186de6")
            .addField(`Commands`, sstr)
        );
    }
  } else {
    kvStrs.forEach((kv) => {
      str += `${kv}\n`;
      if (str.length >= maxLength || kvStrs.indexOf(kv) == kvStrs.length - 1) {
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
