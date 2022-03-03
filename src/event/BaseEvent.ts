import { Event, EventData, Rationess } from "../@type";
import { User } from "../modules";
import Assets from "@뇌절봇/assets";
import { findMessage } from "@뇌절봇/game/rpg_";

export class BaseEvent implements Event, Rationess {
    data: EventData;
    onStart: (user: User)=>void;

    constructor(data: EventData, callback?: (user: User)=>void) {
        this.onStart = callback || (()=>{return});
        this.data = data;
    }

    start(user: User) {
        if(this.data.title) findMessage(user)?.interaction.editReply(Assets.bundle.find(user.lang, `event.${this.data.title}`));
        this.onStart(user);
    }
    
    getRatio(): number {
        return this.data.ratio;
    }
}