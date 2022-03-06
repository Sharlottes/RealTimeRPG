import { Durable, Heathy, ItemData } from "@뇌절봇/@type";
import Assets from "@뇌절봇/assets";
import { User } from "@뇌절봇/modules";
import { Utils } from "@뇌절봇/util";
import { Item } from "./Item";

const Bundle = Assets.bundle;

export class Weapon extends Item implements Durable {
	readonly damage: number;
	readonly cooldown: number;
	readonly critical_ratio: number;
	readonly critical_chance: number;
  readonly durability: number;

	constructor(data: ItemData & Durable & {
    damage: number,
		cooldown: number,
		critical_ratio: number,
		critical_chance: number
  }) {
		super(data);
		this.damage = data.damage;
		this.cooldown = data.cooldown;
		this.critical_chance = data.critical_chance;
		this.critical_ratio = data.critical_ratio;
		this.durability = data.durability;
	}

	attack(user: User, target: Heathy) {
		const critical = Utils.Mathf.randbool(this.critical_chance);

		return Bundle.format(user.lang, 'battle.hit',
			critical ? Bundle.find(user.lang, 'battle.critical') : '',
			this.localName(user),
			(this.damage + (critical ? this.critical_ratio * this.damage : 0)).toFixed(2),
			target.health.toFixed(2),
			(target.health -= this.damage + (critical ? this.critical_ratio * this.damage : 0)).toFixed(2)
		);
	}

	attackEntity(user: User) {
		const critical = Utils.Mathf.randbool(this.critical_chance);

		return Bundle.format(user.lang, 'battle.entityHit',
			critical ? Bundle.find(user.lang, 'battle.critical') : '',
			this.localName(user),
			(this.damage + (critical ? this.critical_ratio * this.damage : 0)).toFixed(2),
			user.id,
			user.stats.health.toFixed(2),
			(user.stats.health -= this.damage + (critical ? this.critical_ratio * this.damage : 0)).toFixed(2),
		);
	}
}