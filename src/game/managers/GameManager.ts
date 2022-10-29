import { bundle } from "assets";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import BaseEvent from "../contents/types/BaseEvent";
import User from "../User";

/**
 * 이벤트 관리 클래스, user에 종속됨
 */
export default class GameManager {
    private currentEvent: BaseEvent | undefined;

    constructor(private readonly user: User) { };

    startEvent(event: BaseEvent, interaction: ChatInputCommandInteraction<CacheType>) {
        if (this.currentEvent?.only) {
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