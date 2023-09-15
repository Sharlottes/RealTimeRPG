import { ActionRowBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import ButtonComponent from "@/command/components/ButtonComponent";
import { ignoreInteraction } from "@/utils/functions";
import bundle from "@/assets/Bundle";

import Manager, { ManagerConstructOptions } from "./Manager";
import ParentManager from "./ParentManager";
import Item from "../contents/types/Item";
import { ItemStack } from "../Inventory";

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

    for (let i = 0; i < 3; i++) {
      const row = new ActionRowBuilder<ButtonComponent>();
      for (let j = 0; j < 3; j++) {
        row.addComponents(
          ButtonComponent.createByInteraction(this.interaction, (j + 1).toString(), (interaction) => {
            ignoreInteraction(interaction);
            this.amount = this.amount * 10 + j + 1;
            this.updateEmbed();
          }),
        );
      }
      this.addComponents(row);
    }

    this.addComponents(
      new ActionRowBuilder<ButtonComponent>().addComponents(
        ButtonComponent.createByInteraction(this.interaction, "0", () => {
          this.amount *= 10;
          this.updateEmbed();
        }),
        ButtonComponent.createByInteraction(
          this.interaction,
          "del",
          (interaction) => {
            ignoreInteraction(interaction);
            this.amount = Math.floor(this.amount / 10);
            this.updateEmbed();
          },
          { style: ButtonStyle.Danger },
        ),
        ButtonComponent.createByInteraction(
          this.interaction,
          "done",
          (interaction) => {
            ignoreInteraction(interaction);
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
        ),
      ),
      new ActionRowBuilder<ButtonComponent>().addComponents(
        ButtonComponent.createByInteraction(
          this.interaction,
          "cancel",
          (interaction) => {
            ignoreInteraction(interaction);
            this.remove();
          },
          { style: ButtonStyle.Secondary },
        ),
        ButtonComponent.createByInteraction(
          this.interaction,
          "reset",
          (interaction) => {
            ignoreInteraction(interaction);
            this.amount = 0;
            this.updateEmbed();
          },
          { style: ButtonStyle.Secondary },
        ),
        ButtonComponent.createByInteraction(
          this.interaction,
          "max",
          (interaction) => {
            ignoreInteraction(interaction);
            this.amount = this.stack.amount;
            this.updateEmbed();
          },
          { style: ButtonStyle.Secondary },
        ),
      ),
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
