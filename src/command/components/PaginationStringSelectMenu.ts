import InteractionEvent from "@/core/interactionEvent";
import { StringSelectMenuBuilder } from "discord.js";
import { functionOrNot } from "@/utils/functions";

export type PaginationStringSelectMenuOptions<T> = {
  list: MaybeFunction<T[]>;
  reducer?: (elem: T, index: number) => Discord.APISelectMenuOption;
  placeholder?: string;
};

export default class PaginationStringSelectMenu<T>
  extends StringSelectMenuBuilder
  implements Interactive<Discord.ComponentType.StringSelect>
{
  private currentPage = 0;
  private list: MaybeFunction<T[]>;
  private reducer: (elem: T, index: number) => Discord.APISelectMenuOption;

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
    this.refresh();
  }

  /**
   * refresh select menu options
   */
  public refresh() {
    const currentList = functionOrNot(this.list);
    if (currentList.length == 0) {
      this.setOptions([{ label: "empty", value: "-10" }]);
      return;
    }

    const options = currentList
      .filter((_, index) => index < this.currentPage * 8 || index > (this.currentPage + 1) * 8)
      .map(this.reducer);

    if (this.currentPage !== 0) {
      options.unshift({
        label: `<-- ${this.currentPage}/${Math.floor(currentList.length / 8) + 1}`,
        value: "-1",
      });
    }

    if (this.currentPage == Math.floor(currentList.length / 8)) {
      options.push({
        label: `${this.currentPage + 1}/${Math.floor(currentList.length / 8) + 1} -->`,
        value: "-2",
      });
    }

    this.setOptions(options);
  }

  public handleInteraction(interaction: Discord.StringSelectMenuInteraction) {
    const id = interaction.values[0];
    const list = functionOrNot(this.list);

    switch (id) {
      case "-1":
        if (this.currentPage !== 0) {
          this.currentPage--;
        }
        break;
      case "-2":
        if (this.currentPage + 1 <= Math.floor(list.length / 8)) {
          this.currentPage++;
        }
        break;
      case "-10":
        break;
      default:
        this.callback(interaction, list[Number(id)]);
    }

    this.refresh();
  }
}
