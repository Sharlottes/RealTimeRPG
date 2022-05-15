import { Durable, ItemData } from "@RTTRPG/@type";
import { bundle } from "@RTTRPG/assets";
import Random from "random";
import { UnitEntity, User } from "@RTTRPG/game";
import { Item, Units, StatusEffect } from "@RTTRPG/game/contents";

export default class Weapon extends Item implements Durable {
	readonly damage: number;
	readonly cooldown: number;
	readonly critical_ratio: number;
	readonly critical_chance: number;
  readonly durability: number;
	readonly status?: StatusEffect;

	constructor(data: ItemData & Durable & {
    damage: number,
		cooldown: number,
		critical_ratio: number,
		critical_chance: number,
		status?: StatusEffect
  }) {
		super(data);
		this.damage = data.damage;
		this.cooldown = data.cooldown;
		this.critical_chance = data.critical_chance;
		this.critical_ratio = data.critical_ratio;
		this.durability = data.durability;
		this.status = data.status;
	}

	attack(user: User, target?: UnitEntity) { //non-target means user is attacked
		const critical = Random.float(0, 1) < this.critical_chance;
		const stat = target?target.stats:user.stats;
		const damage = this.damage + (critical ? this.critical_ratio * this.damage : 0);
		const locale = user.locale;

		if(this.status)	target?.applyStatus(this.status);
		
		return bundle.format(locale, 'battle.hit',
			critical ? bundle.find(locale, 'battle.critical') : '',
			target ? Units.find(target.id).localName(user) : user.user.username, //target's
			damage.toFixed(2), //damaged
			this.localName(user), //by weapon
			stat.health.toFixed(2), //before hp
			(stat.health -= this.damage).toFixed(2) //after hp
		);
	}
}