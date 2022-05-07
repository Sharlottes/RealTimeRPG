import { defaultInven } from "../modules";
import { ItemStack } from "../game";
import { Durable, Inventory } from '../@type';
import { Item, Unit } from "./contents";
import { Stat } from '../@type/index';

export class UnitEntity {
  id: number;
  cooldown = 0;
  money = 1000;
  inventory: Inventory;
  stats: Stat;
  battleInterval?: NodeJS.Timeout;

  constructor(unit: Unit) {
    this.id = unit.id;
    this.stats = Object.assign({}, unit.stats);
    this.inventory = defaultInven;
  }

  setWeapon(weapon: ItemStack) {
    this.inventory.weapon = weapon;
    return this;
  }

  giveItem(item: Item, amount: number) { 
    const exist = this.inventory.items.find((i) => ItemStack.equals(i, item));
    if (exist) exist.amount += amount;
    else this.inventory.items.push(new ItemStack(item.id, amount, (item as unknown as Durable).durability));
  }
}