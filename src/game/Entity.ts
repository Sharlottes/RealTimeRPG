import { defaultInven } from "../modules";
import { ItemStack } from "../game";
import { Heathy, Inventory } from '../@type';
import { Unit } from "./contents";
import { Stat } from '../@type/index';

export class UnitEntity {
  id: number;
  items: Inventory;
  cooldown = 0;
  stats: Stat;

  constructor(unit: Unit) {
    this.id = unit.id;
    this.stats = unit.stats;
    this.items = defaultInven;
  }

  setWeapon(weapon: ItemStack) {
    this.items.weapon = weapon;
    return this;
  }
}