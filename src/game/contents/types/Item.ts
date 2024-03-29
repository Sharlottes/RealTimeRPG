import { ItemEntity } from "@/game/Inventory";
import { EmbedBuilder } from "discord.js";

import SlotWeaponTag from "../tags/SlotWeaponTag";
import Manager from "../../managers/Manager";
import ConsumeTag from "../tags/ConsumeTag";
import ShieldTag from "../tags/ShieldTag";
import WeaponTag from "../tags/WeaponTag";
import AmmoTag from "../tags/AmmoTag";
import ItemTag from "../tags/ItemTag";
import Content from "../Content";
import Items from "../Items";

export default class Item extends Content implements Dropable, Rationess {
  readonly ratio: number;
  readonly id: number;
  readonly dropOnWalk: boolean;
  readonly dropOnBattle: boolean;
  readonly dropOnShop: boolean;
  readonly tags: ItemTag[] = [];

  constructor(name: string, data: ItemData) {
    super(name, "item");
    this.ratio = data.ratio;
    this.id = Items.items.length;
    this.dropOnBattle = data.dropOnBattle ?? true;
    this.dropOnShop = data.dropOnShop ?? true;
    this.dropOnWalk = data.dropOnWalk ?? true;
  }

  public addTags(tags: ItemTag[]): this {
    tags.forEach((tag) => this.tags.push(tag));
    return this;
  }

  public async showInfo(interaction: Discord.BaseInteraction, entity?: ItemEntity) {
    const embed = new EmbedBuilder()
      .setTitle(this.localName(interaction.locale))
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
        url: interaction.user.displayAvatarURL(),
      })
      .addFields(
        {
          name: "Description",
          value: this.description(interaction.locale) || "empty",
        },
        { name: "Details", value: this.details(interaction.locale) || "empty" },
        {
          name: "Tags",
          value: this.tags.map((tag) => `\`${tag.name}\``).join("  "),
        },
      );

    this.tags.forEach((tag) => tag.buildInfo(embed, entity));
    new Manager({ interaction: interaction, embeds: [embed] }).send();
  }

  public hasAmmo(): boolean {
    return this.tags.some((tag) => tag instanceof AmmoTag);
  }
  public getAmmo(): AmmoTag {
    return this.tags.find<AmmoTag>((tag): tag is AmmoTag => tag instanceof AmmoTag) as AmmoTag;
  }

  public hasWeapon(): boolean {
    return this.tags.some((tag) => tag instanceof WeaponTag);
  }
  public getWeapon(): WeaponTag {
    return this.tags.find<WeaponTag>((tag): tag is WeaponTag => tag instanceof WeaponTag) as WeaponTag;
  }

  public hasSlotWeapon(): boolean {
    return this.tags.some((tag) => tag instanceof SlotWeaponTag);
  }
  public getSlotWeapon(): SlotWeaponTag {
    return this.tags.find<SlotWeaponTag>((tag): tag is SlotWeaponTag => tag instanceof SlotWeaponTag) as SlotWeaponTag;
  }

  public hasConsume(): boolean {
    return this.tags.some((tag) => tag instanceof ConsumeTag);
  }
  public getConsume(): ConsumeTag {
    return this.tags.find<ConsumeTag>((tag): tag is ConsumeTag => tag instanceof ConsumeTag) as ConsumeTag;
  }

  public hasShield(): boolean {
    return this.tags.some((tag) => tag instanceof ShieldTag);
  }
  public getShield(): ShieldTag {
    return this.tags.find<ShieldTag>((tag): tag is ShieldTag => tag instanceof ShieldTag) as ShieldTag;
  }
}
