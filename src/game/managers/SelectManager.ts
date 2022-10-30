import {
  ActionRowBuilder,
  ButtonBuilder,
  SelectMenuBuilder,
  ButtonStyle,
  APIButtonComponent,
  ComponentType,
  APISelectMenuOption,
  MessageComponentInteraction,
} from 'discord.js';
import { ComponentTrigger, SelectManagerConstructOptions } from "@type";

import { bundle } from 'assets';
import Manager from './Manager';
import User from '../User';

type MenuSelectOptions<T> = {
  list: T[] | (() => T[]);
  reducer?: (elem: T, index: number) => APISelectMenuOption;
  placeholder?: string;
}

export default class SelectManager extends Manager {
  public readonly user: User;
  protected readonly last?: SelectManager;

  public constructor(options: SelectManagerConstructOptions) {
    super(options);
    this.user = options.user;
    this.last = options.last;

    if (this.last) {
      this.addButtonSelection('back_select', 0, () => {
        this.collector?.stop();
        this.last?.update();
      }, { style: ButtonStyle.Secondary });
    }
  }

  /**
   * 버튼 컴포넌트를 추가합니다.
   * 
   * @param name - 컴포넌트 이름
   * @param row - 컴포넌트 열 (0~4)
   * @param callback - 선택 콜백함수
   */
  public addButtonSelection(
    name: string,
    row: number,
    callback: ComponentTrigger,
    option: Partial<Omit<APIButtonComponent, 'label' | 'customId'>> = { style: ButtonStyle.Primary }
  ) {
    this.resizeSelection(row);

    this.components[row].addComponents(
      new ButtonBuilder(option)
        .setLabel(bundle.find(this.locale, `select.${name}`))
        .setCustomId(name)
    );
    this.setTriggers(name, callback);

    return this;
  }

  /**
   * 선택메뉴 컴포넌트를 추가합니다.
   * 
   * @param name - 컴포넌트 이름
   * @param row - 컴포넌트 열 (0~4)
   * @param callback - 선택 콜백함수
   * @param list - 아이템 리스트
   * @param reducer - 아이템 리스트 매퍼
   * @param placeholder - 선택 전 힌트
   */
  public addMenuSelection<T>(
    name: string,
    row: number,
    callback: (interaction: MessageComponentInteraction, manager: Manager, item: T) => void,
    { list, reducer, placeholder = "select..." }: MenuSelectOptions<T>) {
    this.resizeSelection(row);

    const getList = () => typeof list === 'function' ? list() : list;
    let currentPage = 0;
    const reoption = () => {
      const currentList = getList();
      const options = currentList.reduce<APISelectMenuOption[]>(
        (acc, elem, index) =>
          index < currentPage * 8 || index > (currentPage + 1) * 8
            ? acc
            : [...acc, reducer ? reducer(elem, index)
              : {
                label: `#${index} item`,
                value: index.toString()
              }
            ]
        , currentPage == 0
          ? []
          : [{
            label: `<-- ${currentPage}/${Math.floor(currentList.length / 8) + 1}`,
            value: '-1'
          }]
      )
        .concat(currentPage == Math.floor(currentList.length / 8)
          ? []
          : [{
            label: `${currentPage + 1}/${Math.floor(currentList.length / 8) + 1} -->`,
            value: '-2'
          }]
        );


      return options.length === 0 ? [{ label: 'empty', value: '-10' }] : options;
    }

    const refreshOptions = async () => {
      (this.components[row]?.components[0] as SelectMenuBuilder).setOptions(reoption());
      await this.update();
    };

    this.components[row].addComponents(
      new SelectMenuBuilder()
        .setCustomId(name)
        .setPlaceholder(placeholder)
        .setOptions(reoption())
    );

    this.setTriggers(name, async (interaction, manager) => {
      if (!(interaction.isSelectMenu() && interaction.component.type == ComponentType.SelectMenu)) return;
      const id = interaction.values[0];
      const list = getList();

      switch (id) {
        case '-1':
          if (currentPage == 0)
            Manager.newErrorEmbed(this.interaction, bundle.find(this.locale, "error.first_page"));
          else currentPage--;
          break;
        case '-2':
          if (currentPage + 1 > Math.floor(list.length / 8))
            Manager.newErrorEmbed(this.interaction, bundle.find(this.locale, "error.last_page"));
          else currentPage++;
          break;
        case '-10': break;
        default:
          callback(interaction, manager, list[Number(id)]);
      }

      await refreshOptions();
    })
    return refreshOptions;
  }

  private resizeSelection(index: number) {
    while (this.components.length <= index) {
      this.components.push(new ActionRowBuilder({ components: [] }));
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
      this.collector?.stop();
      await this.last.update();
    } else {
      this.user.gameManager.endEvent();
      await super.endManager(timeout);
    }
  }
}