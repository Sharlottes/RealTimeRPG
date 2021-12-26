import { Client, Message } from "discord.js";
import { Command } from ".";

class Login implements Command {
    public readonly name: string;
    public readonly description: string;
    
    public constructor() {
        this.name = "login";
        this.description = "";
    }
    
    public run(client: Client, message: Message, args: string[]) {
        
    }
}

export default Login;