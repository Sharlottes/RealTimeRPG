import { CacheType, CommandInteraction } from "discord.js";

import { Command } from "@뇌절봇/commands";

class Login extends Command {
    public constructor() {
        super({category: "global"});
        
        this.builder
            .setName("login")
            .setDescription("desc")
            .setDefaultPermission(true);
    }
    
    public run(interaction: CommandInteraction<CacheType>) {

    }
}

export default Login;