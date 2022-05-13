import { CommandInteraction, InteractionButtonOptions, MessageActionRow, MessageActionRowComponent, MessageButton, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';
import { ITrigger } from 'discord.js-pages';

import Assets from '@RTTRPG/assets';
import { EventManager } from '@RTTRPG/game/managers';
import { findMessage, save, User } from '@RTTRPG/game';
import { EventSelection, EventTrigger } from '@RTTRPG/@type';
import { BaseEmbed } from '@RTTRPG/modules';

export default class SelectManager extends EventManager {
  protected readonly selections: EventSelection[][]
  protected readonly last?: SelectManager;

  public constructor(user: User, interaction: CommandInteraction, builder = findMessage(interaction.id).builder, last?: SelectManager) {
    super(user, interaction, builder);
    this.selections = [];
    this.last = last;
    if(new.target === SelectManager) this.init();
  }

  protected override init() {
    if(this.last) {
      this.addButtonSelection('back_select', 0, (user)=> {
        if(!this.last) return;
        this.changeManager(this.last);
      }, { style: 'SECONDARY', customId: '' });
    }
  }

  public addButtonSelection(name: string, row: number, callback: EventTrigger, option?: InteractionButtonOptions) {
    this.resizeSelection(row);

    const rowselection = this.selections[row];
    rowselection.push({
      name: name,
      type: 'button',
      callback: callback,
      options: option
    });

    return this;
  }  
  
  public addMenuSelection(name: string, row: number, callback: EventTrigger, option?: MessageSelectMenuOptions) {
    this.resizeSelection(row);

    const rowselection = this.selections[row];
    rowselection.push({
      name: name,
      type: 'select',
      callback: callback,
      options: option
    });

    return this;
  }

  public override start() {
    const data = this.toActionData();

    this.user.status.name = "selecting";
    this.builder.addComponents(data.actions).addTriggers(data.triggers)
    super.start();
  }

  private resizeSelection(size: number) {
    while(this.selections.length <= size+1) {
      this.selections.push([]);
    }
  }

  protected changeManager<T extends SelectManager>(target: T) {
		this.builder.setComponents([]);
    target.selections.length = 0;
    target.init();
    const data = target.toActionData();
    this.builder.setComponents(data.actions).setTriggers(data.triggers);
  }

  protected toActionData() {
    const actions: MessageActionRow[] = [];
    const triggers: ITrigger<MessageActionRowComponent>[] = [];

    this.selections.forEach((e, i)=>{
      const action = new MessageActionRow();
      e.forEach((select, ii) => {
        const id = `${select.name}${i}${ii}`;
        const name = Assets.bundle.find(this.locale, `select.${select.name}`);
        
        if(select.type === "button") {
          const option = (select.options || {style: 'PRIMARY'}) as InteractionButtonOptions;
          if(!option.style) option.style = 'PRIMARY';
          action.addComponents(new MessageButton(option).setCustomId(id).setLabel(name));
        } else if(select.type === "select") {
          const option = select.options as MessageSelectMenuOptions;
          action.addComponents(new MessageSelectMenu(option).setCustomId(id));
        }
        
        triggers.push({
          name: id,
          callback: (interactionCallback, currentRow)=> {
            select.callback(this.user, actions, interactionCallback, currentRow);
            save();
          }
        });
      });
      actions.push(action);
    });

    return {
      actions: actions,
      triggers: triggers
    }
  }
}