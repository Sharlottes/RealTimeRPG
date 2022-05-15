import { ItemStack } from "@RTTRPG/game";
import { Item, Unit, Units } from "@RTTRPG/game/contents";
import { Inventory, Stat } from '@RTTRPG/@type';

export class UnitEntity {
  id: number;
  money = 1000;
  inventory: Inventory;
  stats: Stat;

  constructor(unit: Unit) {
    this.id = unit.id;
    this.stats = Object.assign({}, unit.stats);
    this.inventory = Object.assign({}, unit.inventory);
  }

  setWeapon(weapon: ItemStack) {
    this.inventory.weapon = weapon;
    return this;
  }

  giveItem(item: Item, amount: number) { 
    const stack = this.inventory.items.find((i) => i.id == item.id);
    if (stack) {
      stack.add(amount);
    } else this.inventory.items.push(new ItemStack(item.id, amount));
  }

	getUnit<T extends Unit>(): T {
		return Units.find<T>(this.id);
	}
}