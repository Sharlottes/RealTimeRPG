import { Inventory, defaultInven } from "../modules";
import { Unit, ItemStack } from "../game";
import { Heathy } from '../@type';

namespace Entity {
  export class UnitEntity implements Heathy {
    id: number;
    items: Inventory;
    cooldown = 0;
    health: number;
    healthMax: number;
    healthRegen: number;

    constructor(unit: Unit) {
      this.id = unit.id;
      this.health = unit.health;
      this.healthMax = unit.health;
      this.healthRegen = unit.healthRegen;
      this.items = defaultInven;
    }

    setWeapon(weapon: ItemStack) {
      this.items.weapon = weapon;
      return this;
    }
  }
}

export default Entity;