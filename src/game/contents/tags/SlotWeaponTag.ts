import { Durable, EntityI, ItemData } from "@RTTRPG/@type";
import { bundle } from "@RTTRPG/assets";
import { SlotWeaponEntity } from "@RTTRPG/game/Inventory";
import { Item } from "..";
import StatusEffect from "../StatusEffect";
import WeaponTag from "./WeaponTag";

export default class SlotWeaponTag extends WeaponTag {
  constructor(item: Item, data: Durable & {
    damage: number,
		cooldown: number,
		critical_ratio: number,
		critical_chance: number,
		status?: StatusEffect
  }) {
    super(item, data);
  }
  
	public override attack(target: EntityI, entity: SlotWeaponEntity, locale: string) {
		if(!entity.ammos.length) return bundle.find(locale, "error.ammo_out");
		entity.ammos.pop()
		//?.tags.find<AmmoTag>((tag): tag is AmmoTag => tag instanceof AmmoTag).callback(); //do something later
    return super.attack(target, entity, locale);
	}
}