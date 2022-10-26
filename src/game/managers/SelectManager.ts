import { InteractionButtonOptions, MessageActionRow, MessageButton, MessageSelectMenu, MessageSelectOptionData } from 'discord.js';
import { ComponentTrigger, type SelectManagerConstructOptions } from "@RTTRPG/@type";

import { bundle } from '@RTTRPG/assets';
import Manager from './Manager';
import User from '../User';

type MenuSelectOptions<T> = {
  customId: string;
  row: number;
  callback: ComponentTrigger;
  list: T[];
  reducer?: (elem: T, index: number) => MessageSelectOptionData;
  placeholder?: string;
}

export default class SelectManager extends Manager {
  public readonly user: User;
  protected readonly last?: SelectManager;

  public constructor(options: SelectManagerConstructOptions) {
    super(options);
    this.user = options.user;
    this.last = options.last;
  }

  public init() {
    super.init();

    if (this.last) {
      this.addButtonSelection('back_select', 0, () => {
        if (!this.last) return;
        this.last.init();
        this.last.update();
      }, { style: 'SECONDARY' });
    }
  }

  public addButtonSelection(name: string, row: number, callback: ComponentTrigger, option: Omit<InteractionButtonOptions, 'customId'> = { style: 'PRIMARY' }) {
    this.resizeSelection(row);

    this.components[row].addComponents(new MessageButton().setLabel(bundle.find(this.locale, `select.${name}`)).setCustomId(name).setStyle(option.style));
    this.setTriggers(name, callback);

    return this;
  }

  /**
   * @param customId - 컴포넌트의 customId
   * @param list - 선택할 아이템 리스트
   * @param placeholder - 선택 전 힌트
   * @param reducer - 아이템과 인덱스를 받아 재처리하는 함수
   * @param row - 추가할 열
   * @param callback - 선택 완료 콜백함수
   */
  public addMenuSelection<T>({ customId, list, placeholder = "select...", reducer, row, callback }: MenuSelectOptions<T>) {
    this.resizeSelection(row);

    let page = 0;
    const reoption = () => list.reduce<MessageSelectOptionData[]>((acc, elem, index) => {
      if (index < page * 8 || index > (page + 1) * 8) return acc;
      return [...acc, reducer ? reducer(elem, index) : { label: `#${index} item`, value: index.toString() }];
    }, page == 0 ? [] : [{ label: `<-- ${page}/${Math.floor(list.length / 8) + 1}`, value: '-1' }]).concat({ label: `${page + 2}/${Math.floor(list.length / 8) + 1} -->`, value: '-2' });

    this.components[row].addComponents(
      new MessageSelectMenu()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .setOptions(reoption())
    );

    this.setTriggers(customId, (interaction, manager) => {
      if (!(interaction.isSelectMenu() && interaction.component instanceof MessageSelectMenu)) return;
      const id = interaction.values[0];

      switch (id) {
        case '-1': {
          if (page == 0)
            Manager.newErrorEmbed(this.interaction, bundle.find(this.locale, "error.first_page"));
          else page--;
          break;
        }
        case '-2': {
          if (page + 1 > Math.floor(list.length / 8))
            Manager.newErrorEmbed(this.interaction, bundle.find(this.locale, "error.last_page"));
          else page++;
          break;
        }
        default: {
          callback(interaction, manager);
        }
      }

      interaction.component.setOptions(reoption());
      this.update();
    })

    return async () => {
      (this.components[row]?.components[0] as MessageSelectMenu).setOptions(reoption());
      await this.update();
    };
  }

  private resizeSelection(index: number) {
    while (this.components.length <= index) {
      this.components.push(new MessageActionRow());
    }
  }

  /**
   * 이 메시지와의 상호작용을 종료합니다.   
   * 모든 버튼이 사라지고 삭제 버튼이 생성됩니다. 메시지는 5초 후 자동 삭제됩니다.   
   * 이전 매니저가 존재할 경우 이 매니저를 팝업으로 판단하고 이전 매니저로 전환합니다.   
   * 이전 매니저가 존재하지 않을 경우 이 매니저를 메인으로 판단하고 이벤트를 종료하고 계속 진행합니다.   
   */
  public async endManager(timeout = 5000): Promise<void> {
    if (this.last) {
      this.last.init();
      await this.last.update();
    } else {
      this.user.gameManager.endEvent();
      await super.endManager(timeout);
    }
  }
}