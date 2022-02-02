import { UserSecure } from "../modules";
import { Message } from '../index';
import { BaseEvent } from "./BaseEvent";
import { MessageActionRow, MessageButton, MessageEmbed, MessageActionRowComponent, MessageButtonStyleResolvable } from "discord.js";
import { PagesBuilder, ITrigger } from "discord.js-pages";
import Assets from "@뇌절봇/assets";

export type EventSelection = {
    name: string;
    callback: (user: UserSecure.User, msg: Message, button?: MessageActionRow)=>void;
    style?: MessageButtonStyleResolvable;
}

export class SelectEvent extends BaseEvent {
    private readonly selections: EventSelection[];

    constructor(ratio: number, title: string, selections: EventSelection[], callback?: (user: UserSecure.User, msg: Message)=>void) {
        super(ratio, title, callback);
        this.selections = selections;
    }

    addSelection(selection: EventSelection) {
        this.selections.push(selection);
        return this;
    }

    start(user: UserSecure.User, msg: Message): void {
        const buttons: MessageActionRow = new MessageActionRow();
        const triggers: ITrigger<MessageActionRowComponent>[] = [];
        let description: string = "";

        this.selections.forEach((select, i) => {
            const name = Assets.bundle.find(user.lang, `select.${select.name}`);
            buttons.addComponents(new MessageButton().setCustomId(name+i).setLabel(name).setStyle(select.style||'PRIMARY'));
            triggers.push({
                name: name+i,
                callback: ()=> { 
                    if(msg.builder) msg.interaction.editReply({embeds: [msg.builder], components: []});
                    select.callback(user, msg, buttons);
                }
            });
            description += `${i}. ${name}\n`;
        });

        user.status.name = "selecting";
        msg.builder = new PagesBuilder(msg.interaction)
        .setPages(new MessageEmbed()).setTitle(Assets.bundle.find(user.lang, this.title)).setDescription(description) //make embed
        .setDefaultButtons([]) //remove default components
        .setComponents([buttons]).setTriggers(triggers); //make new components
        msg.builder.build();
        msg.interaction.editReply({embeds: [msg.builder], components: [buttons]});

        super.start(user, msg);
    }
};