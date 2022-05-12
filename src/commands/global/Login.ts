import { Command } from "@RTTRPG/commands";
import { CommandInteraction, CacheType } from "discord.js";

class Login extends Command {
    public run(interaction: CommandInteraction<CacheType>): void {
        throw new Error("Method not implemented.");
    }
    
    public constructor() {
        super({category: "global"});
        
        this.builder
            .setName("login")
            .setDescription("desc")
            .setDefaultPermission(true);
    }
}

export default Login;