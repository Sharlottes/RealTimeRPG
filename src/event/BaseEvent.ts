import { Event } from ".";
import { UserSecure } from "../modules";
import { Message } from '../index';
import Assets from "@뇌절봇/assets";

export class BaseEvent implements Event {
    ratio: number;
    title: string;
    onStart: Function;

    constructor(ratio: number, title: string, callback?: (user: UserSecure.User, msg: Message)=>void) {
        this.onStart = callback || (()=>{});
        this.ratio = ratio;
        this.title = title;
    }

    start(user: UserSecure.User, msg: Message) {
        if(this.title) msg.interaction.editReply(Assets.bundle.find(user.lang, this.title));
        this.onStart(user, msg);
    }
}