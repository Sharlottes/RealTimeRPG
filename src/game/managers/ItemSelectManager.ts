import { ItemStack } from "..";
import Manager, { ManagerConstructOptions } from "./Manager";
import bundle from "@/assets/Bundle";
import { Item } from "../contents";
import { ButtonStyle, EmbedBuilder } from "discord.js";
import ParentManager from "./ParentManager";

export default class ItemSelectManager extends ParentManager {
  private amount = 0;
  private readonly mainEmbed: EmbedBuilder;
  private readonly stack: ItemStack;
  private readonly callback: (amount: number) => void;

  public constructor(
    parentManager: Manager,
    options: ManagerConstructOptions & {
      item: Item | ItemStack;
      callback: (amount: number) => void;
    },
  ) {
    super(parentManager, options);
    this.stack = options.item instanceof ItemStack ? options.item : new ItemStack(options.item);
    this.callback = options.callback;
    this.mainEmbed = new EmbedBuilder().setTitle("ItemPad").setFields([
      {
        name: `Item (${this.stack.amount})`,
        value: this.stack.item.localName(this.locale),
      },
      { name: "Amount", value: this.amount.toString() },
    ]);
    this.setEmbeds(this.mainEmbed);

    for (let i = 1; i <= 9; i++) {
      this.addButtonSelection(i.toString(), Math.floor((i - 1) / 3), () => {
        this.amount *= 10;
        this.amount += i;
        this.updateEmbed();
      });
    }
    this.addButtonSelection("0", 3, () => {
      this.amount *= 10;
      this.updateEmbed();
    })
      .addButtonSelection(
        "del",
        3,
        () => {
          this.amount = Math.floor(this.amount / 10);
          this.updateEmbed();
        },
        { style: ButtonStyle.Danger },
      )
      .addButtonSelection(
        "done",
        3,
        () => {
          if (this.amount > this.stack.amount) {
            Manager.newErrorEmbed(
              this.interaction,
              bundle.format(
                this.locale,
                "shop.notEnough_item",
                this.stack.item.localName(this.locale),
                this.amount,
                this.stack.amount,
              ),
            );
          } else {
            this.callback(this.amount);
            this.remove();
          }
        },
        { style: ButtonStyle.Success },
      )
      .addButtonSelection(
        "cancel",
        4,
        () => {
          this.remove();
        },
        { style: ButtonStyle.Secondary },
      )
      .addButtonSelection(
        "reset",
        4,
        () => {
          this.amount = 0;
          this.updateEmbed();
        },
        { style: ButtonStyle.Secondary },
      )
      .addButtonSelection(
        "max",
        4,
        () => {
          this.amount = this.stack.amount;
          this.updateEmbed();
        },
        { style: ButtonStyle.Secondary },
      );
  }

  private async updateEmbed() {
    this.mainEmbed.setFields([
      {
        name: `Item (${this.stack.amount})`,
        value: this.stack.item.localName(this.locale),
      },
      {
        name: "Amount",
        value: this.amount.toString(),
      },
    ]);
    this.components[3].components[2].setDisabled(this.amount > this.stack.amount);
    await this.update();
  }
}
