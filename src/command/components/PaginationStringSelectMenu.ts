import AlertManager from "@/game/managers/AlertManager";
import { StringSelectMenuBuilder } from "discord.js";
import { functionOrNot } from "@/utils/functions";
import Manager from "@/game/managers/Manager";
import bundle from "@/assets/Bundle";
import { client } from "@/index";

export type PaginationStringSelectMenuOptions<T> = {
  list: MaybeFunction<T[]>;
  reducer?: (elem: T, index: number) => Discord.APISelectMenuOption;
  placeholder?: string;
};

export default class PaginationStringSelectMenu<T> extends StringSelectMenuBuilder {
  private currentPage = 0;
  list: MaybeFunction<T[]>;
  reducer: (elem: T, index: number) => Discord.APISelectMenuOption;
  placeholder: string;

  constructor(
    private readonly customId: string,
    private readonly callback: (interaction: Discord.StringSelectMenuInteraction, item: T) => void,
    {
      list,
      reducer = (_, index) => ({
        label: `#${index} item`,
        value: index.toString(),
      }),
      placeholder = "select...",
    }: PaginationStringSelectMenuOptions<T>,
  ) {
    super({
      customId,
      placeholder,
    });
    this.list = list;
    this.reducer = reducer;
    this.placeholder = placeholder;
    this.reoption();
    client.interactionEvent.on((interaction) => this.handleSelectMenu(interaction));
  }

  /**
   * refresh select menu options
   */
  public reoption() {
    const currentList = functionOrNot(this.list);
    const options = currentList
      .reduce<Discord.APISelectMenuOption[]>(
        (acc, elem, index) =>
          index < this.currentPage * 8 || index > (this.currentPage + 1) * 8
            ? acc
            : [...acc, this.reducer(elem, index)],
        this.currentPage == 0
          ? []
          : [
              {
                label: `<-- ${this.currentPage}/${Math.floor(currentList.length / 8) + 1}`,
                value: "-1",
              },
            ],
      )
      .concat(
        this.currentPage == Math.floor(currentList.length / 8)
          ? []
          : [
              {
                label: `${this.currentPage + 1}/${Math.floor(currentList.length / 8) + 1} -->`,
                value: "-2",
              },
            ],
      );

    this.setOptions(options.length === 0 ? [{ label: "empty", value: "-10" }] : options);
  }

  private handleSelectMenu(interaction: Discord.BaseInteraction) {
    if (!interaction.isStringSelectMenu() || interaction.customId !== this.customId) return;

    const id = interaction.values[0];
    const list = functionOrNot(this.list);

    switch (id) {
      case "-1":
        if (this.currentPage == 0)
          new AlertManager(interaction, "ERROR", bundle.find(interaction.locale, "error.first_page")).send();
        else this.currentPage--;
        break;
      case "-2":
        if (this.currentPage + 1 > Math.floor(list.length / 8))
          new AlertManager(interaction, "ERROR", bundle.find(interaction.locale, "error.last_page")).send();
        else this.currentPage++;
        break;
      case "-10":
        break;
      default:
        this.callback(interaction, list[Number(id)]);
    }

    this.reoption();
  }
}
