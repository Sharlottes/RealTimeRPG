import Manager, { ManagerConstructOptions } from "@/game/managers/Manager";
import { getOne, ignoreInteraction } from "@/utils/functions";
import { codeBlock } from "@discordjs/builders";
import { EmbedBuilder } from "discord.js";
import { EntityI } from "@/@type/types";
import bundle from "@/assets/Bundle";

import { ItemStack, ItemStorable } from "../Inventory";
import ItemSelectManager from "./ItemSelectManager";
import BattleManager from "./BattleManager";
import ParentManager from "./ParentManager";
import Item from "../contents/types/Item";
import UnitEntity from "../UnitEntity";
import Items from "../contents/Items";
import User from "../User";

export default class ExchangeManager extends ParentManager {
  private readonly user: User;
  private readonly target: UnitEntity;
  private readonly mainEmbed: EmbedBuilder;

  public constructor(parentManager: Manager, options: ManagerConstructOptions & { target: UnitEntity; user: User }) {
    super(parentManager, options);
    this.user = options.user;
    this.target = options.target;
    this.mainEmbed = new EmbedBuilder().setFields([
      {
        name: this.user.user.username,
        value: this.user.money + bundle.find(this.locale, "unit.money"),
        inline: true,
      },
      {
        name: this.target.type.localName(this.locale),
        value: this.target.money + bundle.find(this.locale, "unit.money"),
        inline: true,
      },
    ]);
    this.setEmbeds(this.mainEmbed);

    //고블린 인벤토리 생성
    for (let i = 0; i < 20; i++) {
      const item = getOne(Items.items.filter((i) => i.dropOnShop && i.id !== 5 && typeof i));
      const exist = this.target.inventory.items.find<ItemStack>(
        (store): store is ItemStack => store instanceof ItemStack && store.item == item,
      );
      if (exist) exist.amount++;
      else this.target.inventory.items.push(new ItemStack(item));
    }

    this.addButtonSelection("back", 0, async (interaction) => {
      ignoreInteraction(interaction);
      this.setContent(bundle.find(this.locale, "shop.end"));
      await this.endManager();
    }).addButtonSelection("battle", 0, async (interaction) => {
      ignoreInteraction(interaction);
      await new BattleManager(this, {
        user: this.user,
        interaction: this.interaction,
        enemy: this.target,
      }).update();
    });

    this.addMenuSelection(
      "buy",
      async (interaction, store) => {
        ignoreInteraction(interaction);
        if (store instanceof ItemStack && store.amount > 1) {
          new ItemSelectManager(this, {
            interaction: this.interaction,
            item: store,
            callback: async (amount) => {
              await this.deal(this.target, this.user, store, amount);
              await this.update();
            },
          }).send();
        } else {
          await this.deal(this.target, this.user, store, 1);
          await this.update();
        }
      },
      {
        list: () => this.target.inventory.items,
        reducer: (store, index) => ({
          label:
            store.item.localName(this.locale) +
            ` ${store instanceof ItemStack ? store.amount : 1} ${bundle.find(
              this.locale,
              "unit.item",
            )}, ${this.calPrice(store.item)} ${bundle.find(this.locale, "unit.money")}`,
          value: index.toString(),
        }),
        placeholder: "select item to buy ...",
      },
    );

    this.addMenuSelection(
      "sell",
      async (interaction, store) => {
        ignoreInteraction(interaction);
        if (store instanceof ItemStack && store.amount > 1) {
          new ItemSelectManager(this, {
            interaction: this.interaction,
            item: store,
            callback: async (amount) => {
              await this.deal(this.user, this.target, store, amount);
              await this.update();
            },
          }).send();
        } else {
          await this.deal(this.user, this.target, store, 1);
          await this.update();
        }
      },
      {
        list: () => this.user.inventory.items,
        reducer: (store, index) => ({
          label:
            store.item.localName(this.locale) +
            ` ${store instanceof ItemStack ? store.amount : 1} ${bundle.find(
              this.locale,
              "unit.item",
            )}, ${this.calPrice(store.item)} ${bundle.find(this.locale, "unit.money")}`,
          value: index.toString(),
        }),
        placeholder: "select item to sell ...",
      },
    );
  }

  private calPrice(item: Item) {
    return Math.round((100 - item.ratio) * 3); //WTF??
  }

  private async updateEmbed() {
    this.mainEmbed.setFields([
      {
        name: this.user.user.username,
        value: this.user.money + bundle.find(this.locale, "unit.money"),
        inline: true,
      },
      {
        name: this.target.type.localName(this.locale),
        value: this.target.money + bundle.find(this.locale, "unit.money"),
        inline: true,
      },
    ]);
    await this.update();
  }

  private async deal<T extends ItemStorable>(owner: EntityI, visitor: EntityI, store: T, amount: number) {
    const max = store instanceof ItemStack ? store.amount : 1;
    const item = store.item;
    const money = this.calPrice(item);

    if (amount > max) {
      this.addContent(
        codeBlock(
          "diff",
          "- " + bundle.format(this.locale, "shop.notEnough_item", item.localName(this.locale), amount, max),
        ),
      );
    } else if (visitor.money < amount * money) {
      this.addContent(
        codeBlock("diff", "- " + bundle.format(this.locale, "shop.notEnough_money", amount * money, visitor.money)),
      );
    } else {
      this.addContent(
        codeBlock(
          "diff",
          "+ " +
            bundle.format(
              this.locale,
              owner == this.user ? "shop.sold" : "shop.buyed",
              item.localName(this.locale),
              amount,
              owner.money,
              owner.money + money * amount,
            ),
        ),
      );

      visitor.money -= money * amount;
      visitor.inventory.add(item, amount);
      owner.money += money * amount;
      owner.inventory.remove(item, amount);
    }

    await this.updateEmbed();
  }
}
