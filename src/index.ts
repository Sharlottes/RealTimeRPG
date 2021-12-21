// 참조된 패키지들에서 모듈 가져오기.
// 이렇게 하면 불러온 모듈들이 모두 하나의 변수를 통해 참조?가 되지만 다른 방식으로 할 수도 있음.
// import { Client } from "discord.js";
// 위 같은 방식으로 불러오면 해당 패키지내의 모든 모듈을 불러오지 않고 해당 모듈 하나만 불러옴.
import Discord, { Client, Message } from "discord.js";

// 직접 쓴 코드도 같은 방식으로 불러올 수 있음.
import commands from "./commands";

// Discord.Client에 commands 속성이 없길래 그냥 다른 객체로 분리함.
const client: Client = new Discord.Client(); 
const prefix = "!";

// 속성 뒤에 ?는 해당 값이 널인지 확인하고 널이 아니면 실행
// ps. !가 아니라 ? 인데 지금 확인하고 고침..
client.on("ready", () => console.log(`Logged in as ${client.user?.tag}!`));

client.on("message", (message: Message) => {
  
  if (message.author.bot) return; //not botself
  if (!message.content.startsWith(prefix)) return; //need command tag
  

  // 명령어
  const args: string[] = message.content.slice(prefix.length).trim().split(" ");
  const command: string | undefined = args.shift()?.toLowerCase();
  
  if(command != undefined && commands.has(command)) {
    commands.get(command)?.run(client, message, args);
  }

});

client.login(process.env.token);
