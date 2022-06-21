import { CommandInteraction, InteractionButtonOptions, MessageActionRow, MessageActionRowComponent, MessageButton, MessageSelectMenu, MessageSelectMenuOptions, MessageSelectOptionData } from 'discord.js';
import { ITrigger } from 'discord.js-pages';

import Assets from '@RTTRPG/assets';
import { BaseManager } from '@RTTRPG/game/managers';
import { findMessage, save, User } from '@RTTRPG/game';
import { EventSelection, EventTrigger } from '@RTTRPG/@type';
import { bundle } from '@RTTRPG/assets';

export default class SelectManager extends BaseManager {
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
      }, { style: 'SECONDARY'});
    }
  }

  public addButtonSelection(name: string, row: number, callback: EventTrigger, option?: Omit<InteractionButtonOptions, 'customId'>) {
    this.resizeSelection(row);

    this.selections[row].push({
      name: name,
      type: 'button',
      callback: callback,
      options: option
    });

    return this;
  }  
  
  public addMenuSelection(name: string, row: number, callback: EventTrigger, option?: Omit<MessageSelectMenuOptions, 'customId'>) {
    this.resizeSelection(row);

    this.selections[row].push({
      name: name,
      type: 'select',
      callback: callback,
      options: option
    });

    return this;
  }
  
  public addPagedMenuSelection<T>(name: string, row: number, callback: EventTrigger, list: T[], reducer: (elem: T, index: number) => MessageSelectOptionData, placeholder?: string) {
    let page = 0;
    const reoption = () => list.reduce<MessageSelectOptionData[]>((acc, elem, index) => {
      if(index < page * 8 || index > (page + 1) * 8) return acc;
      return [...acc, reducer(elem, index)];
    }, page == 0 ? [] : [{label: `<-- ${page}/${Math.floor(list.length/8)+1}`, value: '-1'}]).concat({label: `${page + 2}/${Math.floor(list.length/8)+1} -->`, value: '-2'});
     
    this.resizeSelection(row);
    this.selections[row].push({
      name: name,
      type: 'select',
      callback: async (user, row, interactionCallback, component) => {
			  if (interactionCallback.isSelectMenu()) {
	  			const id = interactionCallback.values[0];

		  		switch(id) {
				    case '-1': {
	    				if(page == 0) 
	    				  BaseManager.newErrorEmbed(this.user, this.interaction, bundle.find(this.locale, "error.first_page"));
              else page--;
	  	  			break;
	    			}
  				  case '-2': {
  	  				if(page + 1 > Math.floor(list.length/8)) 
  							BaseManager.newErrorEmbed(this.user, this.interaction, bundle.find(this.locale, "error.last_page"));
              else page++;
  	  				break;
  	  			}
  				  default: {
  				    callback(user, row, interactionCallback, component);
  				  }
	  			}

          (component as MessageSelectMenu).setOptions(reoption());
          this.builder.updateComponents(component).rerender();
			  }  
      },
      options: {
        placeholder: placeholder ?? "select...",
        options: reoption()
      }
    });

    return this;
  }

  public override start() {
    const data = this.toActionData();
    this.builder.addComponents(data.actions).addTriggers(data.triggers)
    return super.start();
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

  protected toActionData(): {actions: MessageActionRow[], triggers: ITrigger<MessageActionRowComponent>[]} {
    const actions: MessageActionRow[] = [];
    const triggers: ITrigger<MessageActionRowComponent>[] = [];

    this.selections.forEach((e, i)=>{
      if(e.length == 0) return;
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