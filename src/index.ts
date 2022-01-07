// 참조된 패키지들에서 모듈 가져오기.
// 이렇게 하면 불러온 모듈들이 모두 하나의 변수를 통해 참조?가 되지만 다른 방식으로 할 수도 있음.
// import { Client } from "discord.js";
// 위 같은 방식으로 불러오면 해당 패키지내의 모든 모듈을 불러오지 않고 해당 모듈 하나만 불러옴.
import Discord, { Client, Intents } from "discord.js";

// 직접 쓴 코드도 같은 방식으로 불러올 수 있음.
import { firebaseAdmin } from "./net";
import assets from "./assets"
import config from "./config.json";


// 파이어베이스 초기화

firebaseAdmin;
const startArgs: Map<string, any> = new Map<string, any>();

// 기본 인자 설정

// 프로그램 실행 인자 추출
process.argv.forEach((arg: string, index: number, array: string[]) => {
  if(arg.slice(0, 2) == "--" && array.length > index + 1) {
    const key: string = arg.slice(2);
    const value: string = array[index + 1];
    
    if(value == "true" || value == "false") {
      startArgs.set(key, Boolean(value));
    } else if(Number(value).toString() != "NaN") {
      startArgs.set(key, Number(value));
    } else {
      startArgs.set(key, value);
    }
  }
});

assets.init(config.debug);
// Discord.Client에 commands 속성이 없길래 그냥 다른 객체로 분리함.
const client: Client = new Discord.Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }); 

// 속성 뒤에 ?는 해당 값이 널인지 확인하고 널이 아니면 실행
client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`)

  // 봇 시작시 로딩
  commands.forEach(command => {
    client.application?.commands.create(command.builder.toJSON());
  })
});

// 명령어 구현부
client.on("interactionCreate", async interaction => {
  if(interaction.isCommand()) {
    try {
      if(commands.has(interaction.commandName)) {
        const whiteList: any = config.whiteList;
        let channelName: string =
          interaction.channel instanceof Discord.TextChannel ||
          interaction.channel instanceof Discord.NewsChannel
            ? interaction.channel.name
            : interaction.user.username;
    
        if((whiteList == false || whiteList.includes(channelName)) || interaction.channel?.type == "DM") {
          commands.get(interaction.commandName)?.run(interaction);
        } else {
          interaction.reply("Commands are available only in the dm channel or the following channels.")
        }
      } else {
        interaction.reply("Error... Undefined command!");
      }
    } catch(error) {
      const err: any = error;
      if(!interaction.replied) {
        interaction.reply(err);
      } else {
        interaction.followUp(err);
      }
    } finally {
      if(!interaction.replied) {
        interaction.reply({content: "no reply.", ephemeral: true});
      }
    }
  } else return;
});

/* 전 버전 방식 명령어 구현부
const prefix = "!";
client.on("message", (message: Message) => {
  if (message.author.bot) return; //not botself
  if (!message.content.startsWith(prefix)) return; //need command tag

  // 명령어
  const args: string[] = message.content.slice(prefix.length).trim().split(" ");
  const command: string | undefined = args.shift()?.toLowerCase();
  
  if(command != undefined && commands.has(command)) {
    const whiteList: any = config.whiteList;
    let name: string = message.channel instanceof Discord.TextChannel || message.channel instanceof Discord.NewsChannel ?
    message.channel.name : message.author.username;

    if((whiteList == false || whiteList.includes(name)) || message.channel.type == "DM") {
    }
  }
});
*/

client.login(config.botToken);

const app = {
  client: client,
  option: startArgs,
  config: config
}

export default app;