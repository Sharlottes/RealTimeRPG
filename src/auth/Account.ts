import Discord from "discord.js";
import types from ".";

type Language = types.Language;

class Account {
    public readonly name: string;
    public readonly email: string;
    public readonly user: Discord.User;
    public lang: Language;

    public constructor(name: string, email: string, lang: Language = "ko", user: Discord.User) {
        this.name = name;
        this.email = email;
        this.lang = lang;
        this.user = user;
    }
}

export default Account;