import Discord, { Client, Message } from "discord.js";
import commands , { Command } from "./index";

class Help implements Command {
    // 타입을 제대로 지정하면 자동완성의 도움이 지리니까 할 수 있다면 해놓는 걸 추천.
    public readonly name = "help";
    public readonly description = "show avaliable commands";
    
    public run (client: Client, message: Message, args: string[]) {
        let helpImg = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png"
        let embed = new Discord.MessageEmbed().setAuthor("Avaliable Commands", helpImg).setColor("#186de6")
    
        let commandStr = ""
        commands.forEach(x => commandStr += `• !${x.name} : **${x.description}**\n`);
        embed.addField("Commands: ", commandStr)
    
        message.channel.send(embed)
    };
}

export default Help;