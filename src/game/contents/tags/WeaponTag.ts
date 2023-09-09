import { WeaponEntity } from "@/game/Inventory";
import { EmbedBuilder } from "discord.js";
import { EntityI } from "@/@type/types";
import bundle from "@/assets/Bundle";
import Random from "random";

import StatusEffect from "../types/StatusEffect";
import Item from "../types/Item";
import ItemTag from "./ItemTag";

export default class WeaponTag extends ItemTag {
  public readonly damage: number;
  public readonly cooldown: number;
  public readonly critical_ratio: number;
  public readonly critical_chance: number;
  public readonly durability: number;
  public readonly status?: StatusEffect;
  public name = "Weapon";

  constructor(
    item: Item,
    data: Durable & {
      damage: number;
      cooldown: number;
      critical_ratio: number;
      critical_chance: number;
      status?: StatusEffect;
    },
  ) {
    super(item);
    this.damage = data.damage;
    this.cooldown = data.cooldown;
    this.critical_chance = data.critical_chance;
    this.critical_ratio = data.critical_ratio;
    this.durability = data.durability;
    this.status = data.status;
  }

  public attack(target: EntityI, entity: WeaponEntity, locale: string) {
    const critical = Random.float(0, 1) < this.critical_chance;
    const stat = target.stats;
    const damage = Math.round((this.damage + (critical ? this.critical_ratio * this.damage : 0)) * 100) / 100;

    if (this.status) target.applyStatus(this.status);

    return bundle.format(
      locale,
      "battle.hit",
      critical ? bundle.find(locale, "battle.critical") : "",
      typeof target.name !== "string" ? target.name(locale) : target.name, //target's
      damage.toFixed(2), //damaged
      this.item.localName(locale), //by weapon
      stat.health.toFixed(2), //before hp
      (stat.health -= damage).toFixed(2), //after hp
    );
  }

  public override buildInfo(embed: EmbedBuilder, entity?: WeaponEntity): EmbedBuilder {
    if (entity)
      embed.addFields(
        { name: "current cooldown", value: entity.cooldown.toString() },
        {
          name: "current durability",
          value: entity.durability.toString(),
          inline: true,
        },
      );
    return embed.addFields(
      {
        name: "critical",
        value: `${this.critical_ratio * 100}% damages in ${this.critical_chance * 100} chance`,
        inline: true,
      },
      { name: "damage", value: this.damage.toString(), inline: true },
      { name: "cooldown", value: this.cooldown.toString(), inline: true },
      { name: "durability", value: this.durability.toString(), inline: true },
    );
  }
}
