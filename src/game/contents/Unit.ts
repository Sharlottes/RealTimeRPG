import { Heathy } from "@뇌절봇/@type";
import { Content, ItemStack, Units } from "./Content";

export class Unit extends Content implements Heathy {
	level: number;
	rare: number;
	readonly items: ItemStack[] = [];
	id: number;
	health: number;
	healthRegen: number;

	constructor(
		name: string,
		health: number,
		healthRegen: number,
		level: number,
		rare: number,
		items: ItemStack[]
	) {
		super(name, 'unit');

		this.health = health;
		this.healthRegen = healthRegen;
		this.level = level;
		this.rare = rare;
		this.items = items;
		this.id = Units.units.length;
	}
}