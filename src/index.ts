// 참조된 패키지들에서 모듈 가져오기.
// 이렇게 하면 불러온 모듈들이 모두 하나의 변수를 통해 참조?가 되지만 다른 방식으로 할 수도 있음.
// import { Client } from "discord.js";
// 위 같은 방식으로 불러오면 해당 패키지내의 모든 모듈을 불러오지 않고 해당 모듈 하나만 불러옴.
import Discord from "discord.js";
import fs from "fs";

// 직접 쓴 코드도 같은 방식으로 불러올 수 있음.
import { help } from "./commands";

// Discord.Client 타입으로 선언해도 되지만, Client 내에 commands 속성이 없길래 그냥 commands로 바꿈
// 코딩시만 Discord.Client 타입으로 선언하고 컴파일 시에 any로 바꾸는 방식으로 해도 댐
const client: any = new Discord.Client(); 
const prefix = "!";

client.commands = new Discord.Collection();
client.commands.set(help.name, help);


// file이 string 형식으로 되길래 왠지 모르겠어서 얘도 걍 any 함.
let file: any;
for (file of fs.readdirSync("./commands")) {
  if (file.name === "help") continue;
  const cmd = require("./commands/" + file);
  client.commands.set(cmd.name, cmd);
}

client.on("ready", () => console.log(`Logged in as ${client.user!.tag}!`));

client.on("message", (message: any) => {
  if (message.author.bot) return; //not botself
  if (!message.content.startsWith(prefix)) return; //need command tag

  const args = message.content.slice(prefix.length).trim().split(" ");
  const command = args.shift()!.toLowerCase();
  let cmd = client.commands.get(command);
  if (cmd) cmd.run(client, message, args);
});

client.login(process.env.token);
