import { User } from "../modules";
import { BaseEvent } from "./BaseEvent";
import { MessageActionRow, MessageButton, MessageEmbed, MessageActionRowComponent, MessageSelectMenuOptions, InteractionButtonOptions, MessageSelectMenu, MessageComponentInteraction } from "discord.js";
import { PagesBuilder, ITrigger } from "discord.js-pages";
import Assets from "@뇌절봇/assets";
import { findMessage } from "@뇌절봇/game/rpg_";
import { EventData } from "@뇌절봇/@type";

export class EventSelection {
    readonly name: string;
    readonly type: "button" | "select";
    readonly callback: (user: User, components: MessageActionRow[], interactionCallback: MessageComponentInteraction, currentRow: MessageActionRowComponent)=>void;
    readonly options?: (InteractionButtonOptions | MessageSelectMenuOptions) | ((user: User)=>InteractionButtonOptions | MessageSelectMenuOptions);

    constructor(name: string, callback: (user: User, components: MessageActionRow[], interactionCallback: MessageComponentInteraction, currentRow: MessageActionRowComponent)=>void, type: ("button" | "select") = "button", options?: (InteractionButtonOptions | MessageSelectMenuOptions) | ((user: User)=>InteractionButtonOptions | MessageSelectMenuOptions)) {
        this.name = name;
        this.type = type;
        this.callback = callback;
        this.options = options;
    }
}

export class SelectEvent extends BaseEvent {
    private readonly selections: EventSelection[][];

    constructor(data: EventData, selections: EventSelection[][], callback?: (user: User)=>void) {
        super(data, callback);
        this.selections = selections;
    }

    addSelection(selection: EventSelection, row = 0): this {
        this.selections[row].push(selection);
        return this;
    }

    /**
     * 선택지 정보들을 PageBuilder가 받아들일 수 있는 타입으로 변환합니다. 
     * @param {EventSelection[][]} selections 컴포넌트 위치 | 1차 인자는 행, 2차 인자는 열을 담당 
     * @param {User} user 이 선택지를 볼 유저 
     */
    static toActionData(selections: EventSelection[][], user: User) {
        const actions: MessageActionRow[] = [];
        const triggers: ITrigger<MessageActionRowComponent>[] = [];
        let descriptions = "";

        selections.forEach(e=>{
            const action = new MessageActionRow();
            e.forEach((select, i) => {
                const name = Assets.bundle.find(user.lang, `select.${select.name}`);
                if(select.type === "button") {
                    const option = (select.options?(typeof(select.options)==='function'?select.options(user):select.options):{style: 'PRIMARY'}) as InteractionButtonOptions;
                    if(option&&!option.style) option.style = 'PRIMARY';
                    action.addComponents(new MessageButton(option).setCustomId(name+i).setLabel(name));
                } else if(select.type === "select") 
                    action.addComponents(new MessageSelectMenu(((typeof(select.options)==='function'?select.options(user):select.options) as MessageSelectMenuOptions)).setCustomId(name+i));
                triggers.push({
                    name: name+i,
                    callback: (interactionCallback, currentRow)=> {
                        select.callback(user, actions, interactionCallback, currentRow);
                    }
                });
                descriptions += `${i}. ${name}\n`;
            });
            actions.push(action);
        });

        return {
            actions: actions,
            triggers: triggers,
            descriptions: descriptions
        }
    }


    start(user: User): void {
		const msg = findMessage(user);
		if(!msg) return;
        
        const data = SelectEvent.toActionData(this.selections, user);

        user.status.name = "selecting";
        msg.builder = new PagesBuilder(msg.interaction)
        .setPages(new MessageEmbed()).setTitle(this.data.title?Assets.bundle.find(user.lang, `event.${this.data.title}`):"").setDescription(data.descriptions) //make embed
        .setDefaultButtons([]) //remove default components
        .setComponents(data.actions).setTriggers(data.triggers); //make new components
        msg.builder.build();
        msg.interaction.editReply({embeds: [msg.builder], components: data.actions});

        super.start(user);
    }
}