import { InteractionButtonOptions, MessageActionRow, MessageButton, MessageSelectMenu, MessageSelectMenuOptions, MessageSelectOptionData } from 'discord.js';
import { ComponentTrigger, type ManagerConstructOptions } from "@RTTRPG/@type";

import { User } from '@RTTRPG/game';
import { EventSelection } from '@RTTRPG/@type';
import { bundle } from '@RTTRPG/assets';
import Manager from './Manager';

type MenuSelectOptions<T> = {
  customId: string;
  row: number;
  callback: ComponentTrigger;
  list: T[];
  reducer?: (elem: T, index: number) => MessageSelectOptionData;
  placeholder?: string
}

export default class SelectManager extends Manager {
  protected readonly last?: SelectManager;

  public constructor(options: ManagerConstructOptions & { user: User, last?: SelectManager }) {
    super(options);
    this.last = options.last;
  }

  public init() {
    if(this.last) {
      this.addButtonSelection('back_select', 0, (user) => {
        if(!this.last) return;
        this.changeManager(this.last);
      }, { style: 'SECONDARY' });
    }
  }

  public addButtonSelection(name: string, row: number, callback: ComponentTrigger, option: Omit<InteractionButtonOptions, 'customId'> = {style: 'PRIMARY'}) {
    this.resizeSelection(row);

    this.components[row].addComponents(new MessageButton().setLabel(bundle.find(this.locale, `select.${name}`)).setCustomId(name).setStyle(option.style));
    this.setTriggers(name, callback);

    return this;
  }  
  
  /**
   * 
   * @param customId - 컴포넌트의 customId
   * @param list - 선택할 아이템 리스트
   * @param placeholder - 선택 전 힌트
   * @param reducer - 아이템과 인덱스를 받아 재처리하는 함수
   * @param row - 추가할 열
   * @param callback - 선택 완료 콜백함수
   */
  public addMenuSelection<T>({ customId, list, placeholder = "select...", reducer, row, callback }: MenuSelectOptions<T>): this {
    this.resizeSelection(row);

    let page = 0;
    const reoption = () => list.reduce<MessageSelectOptionData[]>((acc, elem, index) => {
      if(index < page * 8 || index > (page + 1) * 8) return acc;
      return [...acc, reducer ? reducer(elem, index) : { label: `#${index} item`, value: index.toString() }];
    }, page == 0 ? [] : [{ label: `<-- ${page}/${Math.floor(list.length/8)+1}`, value: '-1' }]).concat({label: `${page + 2}/${Math.floor(list.length/8)+1} -->`, value: '-2'});
     
    this.components[row].addComponents(
      new MessageSelectMenu()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .setOptions(reoption())
    );

    this.setTriggers(customId, (interaction, manager) => {
      if (!(interaction.isSelectMenu() && interaction.component instanceof MessageSelectMenu)) return;
      const id = interaction.values[0];

      switch(id) {
        case '-1': {
          if(page == 0) 
            Manager.newErrorEmbed(this.interaction, bundle.find(this.locale, "error.first_page"));
          else page--;
          break;
        }
        case '-2': {
          if(page + 1 > Math.floor(list.length/8)) 
            Manager.newErrorEmbed(this.interaction, bundle.find(this.locale, "error.last_page"));
          else page++;
          break;
        }
        default: {
          callback(interaction, manager);
        }
      }

      interaction.component.setOptions(reoption());
      this.send();
    })

    return this;
  }

  private resizeSelection(index: number) {
    while(this.components.length <= index) {
      this.components.push(new MessageActionRow());
    }
  }

  protected changeManager<T extends SelectManager>(target: T) {
    target.init();
    this.components = target.components;
    this.send();
  }
}