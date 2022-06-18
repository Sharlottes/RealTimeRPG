import { ItemData, Durable, EntityI } from '@RTTRPG/@type';
import { SlotWeaponEntity } from '..';
import StatusEffect from './StatusEffect';
import Weapon from './Weapon';
import { bundle } from '@RTTRPG/assets';

export default class SlotWeapon extends Weapon {
  constructor(data: ItemData & Durable & {
    damage: number,
		cooldown: number,
		critical_ratio: number,
		critical_chance: number,
		status?: StatusEffect
  }) {
		super(data);
	}

	public override attack(target: EntityI, entity: SlotWeaponEntity, locale: string) {
		if(!entity.ammos.length) return bundle.find(locale, "error.ammo_out");
		entity.ammos.pop()
		//?.tags.find<AmmoItemTag>((tag): tag is AmmoItemTag => tag instanceof AmmoItemTag).callback(); //do something later
    return super.attack(target, entity, locale);
	}
}