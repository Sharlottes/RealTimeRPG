import { SlotWeaponEntity } from "@/game/Inventory";
import { EmbedBuilder } from "discord.js";
import { EntityI } from "@/@type/types";
import bundle from "@/assets/Bundle";

import StatusEffect from "../types/StatusEffect";
import WeaponTag from "./WeaponTag";
import Item from "../types/Item";

export default class SlotWeaponTag extends WeaponTag {
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
    super(item, data);
    this.name = "SlotWeapon";
  }

  public override attack(target: EntityI, entity: SlotWeaponEntity, locale: string) {
    if (!entity.ammos.length) return bundle.find(locale, "error.ammo_out");
    entity.ammos.pop();
    //?.tags.find<AmmoTag>((tag): tag is AmmoTag => tag instanceof AmmoTag).callback(); //do something later
    return super.attack(target, entity, locale);
  }

  public buildInfo(embed: EmbedBuilder, entity?: SlotWeaponEntity): EmbedBuilder {
    super.buildInfo(embed, entity);
    if (entity)
      embed.addFields({
        name: "ammos",
        value: entity.ammos.length.toString(),
      });
    return embed;
  }
}
