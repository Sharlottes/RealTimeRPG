import { bundle } from "@RTTRPG/assets";
import { CommandInteraction, CacheType } from "discord.js";
import BaseEvent from "../contents/types/BaseEvent";
import User from "../User";

/**
 * 이벤트 관리 클래스, user에 종속됨
 */
export default class GameManager {
    currentEvent: BaseEvent | undefined;

    constructor(private readonly user: User) {};

    startEvent(event: BaseEvent, interaction: CommandInteraction<CacheType>) {
        if(this.currentEvent) {
            if(!(interaction.deferred || interaction.replied)) interaction.deferReply();
            interaction.editReply(bundle.find(this.user.locale, "error.event_existing"));
            return;
        }
        this.currentEvent = event;
        event.start(this.user, interaction);
    }

    endEvent() {
        this.currentEvent = undefined;
    }
}