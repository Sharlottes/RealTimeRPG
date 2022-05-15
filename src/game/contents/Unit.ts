import { Rationess, Inventory, Stat, UnitData } from "@RTTRPG/@type";
import { ItemStack } from "..";
import { Content, Units } from ".";


export default class Unit extends Content implements Rationess {
  readonly level: number;
	readonly ratio: number;
	readonly id: number;
	readonly inventory: Inventory;
	readonly stats: Stat;

	constructor(data: UnitData) {
		super(data.name, 'unit');
		this.level = data.level;
		this.ratio = data.ratio;
		this.inventory = data.inventory || {
        items: [],
        weapon: new ItemStack(5)
    };
		this.stats = data.stats;
		this.id = Units.units.length;
	}
}