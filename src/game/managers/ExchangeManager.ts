import { EmbedBuilder } from "discord.js";

import { getOne } from "utils/getOne";
import { ItemStack, ItemStorable, UnitEntity, User } from "game";
import Manager, { ManagerConstructOptions } from "game/managers/Manager";
import { Item, Items } from "game/contents";
import { bundle } from "assets";
import ItemSelectManager from "./ItemSelectManager";
import { EntityI } from "@type";
import BattleManager from "./BattleManager";
import { codeBlock } from "@discordjs/builders";

export default class ExchangeManager extends Manager {
  private readonly user: User;
  private readonly target: UnitEntity;
  private readonly mainEmbed: EmbedBuilder;

  public constructor(
    options: ManagerConstructOptions & { target: UnitEntity; user: User }
  ) {
    super(options);
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
      const item = getOne(
        Items.items.filter((i) => i.dropOnShop && i.id !== 5 && typeof i)
      );
      const exist = this.target.inventory.items.find<ItemStack>(
        (store): store is ItemStack =>
          store instanceof ItemStack && store.item == item
      );
      if (exist) exist.amount++;
      else this.target.inventory.items.push(new ItemStack(item));
    }

    this.addButtonSelection("back", 0, async () => {
      this.setContent(bundle.find(this.locale, "shop.end"));
      await this.endManager();
    }).addButtonSelection("battle", 0, async () => {
      await new BattleManager({
        user: this.user,
        interaction: this.interaction,
        enemy: this.target,
      }).update();
    });

    const buyRefresher = this.addMenuSelection(
      "buy",
      1,
      async (_, __, store) => {
        if (store instanceof ItemStack && store.amount > 1) {
          new ItemSelectManager({
            interaction: this.interaction,
            item: store,
            callback: async (amount) => {
              await this.deal(this.target, this.user, store, amount);
              await buyRefresher().update();
            },
          }).send();
        } else {
          await this.deal(this.target, this.user, store, 1);
          await buyRefresher().update();
        }
      },
      {
        list: () => this.target.inventory.items,
        reducer: (store, index) => ({
          label:
            store.item.localName(this.locale) +
            ` ${store instanceof ItemStack ? store.amount : 1} ${bundle.find(
              this.locale,
              "unit.item"
            )}, ${this.calPrice(store.item)} ${bundle.find(
              this.locale,
              "unit.money"
            )}`,
          value: index.toString(),
        }),
        placeholder: "select item to buy ...",
      }
    );

    const sellRefresher = this.addMenuSelection(
      "sell",
      2,
      async (_, __, store) => {
        if (store instanceof ItemStack && store.amount > 1) {
          new ItemSelectManager({
            interaction: this.interaction,
            item: store,
            callback: async (amount) => {
              await this.deal(this.user, this.target, store, amount);
              await sellRefresher().update();
            },
          }).send();
        } else {
          await this.deal(this.user, this.target, store, 1);
          await sellRefresher().update();
        }
      },
      {
        list: () => this.user.inventory.items,
        reducer: (store, index) => ({
          label:
            store.item.localName(this.locale) +
            ` ${store instanceof ItemStack ? store.amount : 1} ${bundle.find(
              this.locale,
              "unit.item"
            )}, ${this.calPrice(store.item)} ${bundle.find(
              this.locale,
              "unit.money"
            )}`,
          value: index.toString(),
        }),
        placeholder: "select item to sell ...",
      }
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

  private async deal<T extends ItemStorable>(
    owner: EntityI,
    visitor: EntityI,
    store: T,
    amount: number
  ) {
    const max = store instanceof ItemStack ? store.amount : 1;
    const item = store.item;
    const money = this.calPrice(item);

    if (amount > max) {
      this.addContent(
        codeBlock(
          "diff",
          "- " +
            bundle.format(
              this.locale,
              "shop.notEnough_item",
              item.localName(this.locale),
              amount,
              max
            )
        )
      );
    } else if (visitor.money < amount * money) {
      this.addContent(
        codeBlock(
          "diff",
          "- " +
            bundle.format(
              this.locale,
              "shop.notEnough_money",
              amount * money,
              visitor.money
            )
        )
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
              owner.money + money * amount
            )
        )
      );

      visitor.money -= money * amount;
      visitor.inventory.add(item, amount);
      owner.money += money * amount;
      owner.inventory.remove(item, amount);
    }

    await this.updateEmbed();
  }
}
