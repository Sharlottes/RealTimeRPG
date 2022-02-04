import { Inventory, defaultInven } from "../modules";
import { Unit, ItemStack } from "../game";
import { Heathy } from '../@type';
import { Units } from './contents/Content';

namespace Entity {
  export class UnitEntity implements Heathy {
    id: number;
    items: Inventory;
    cooldown = 0;
    constructor(unit: Unit) {
      this.id = unit.id;
      this.health = unit.health;
      this.healthMax = unit.health;
      this.healthRegen = unit.healthRegen;
      this.items = defaultInven;
    }
    
    get health() {
      return this.health;
    }

    set health(health: number) {
      this.health = health;
    }

    get healthMax() {
      return this.health;
    }

    set healthMax(max: number) {
      this.health = max;
    }

    get healthRegen() {
      return this.healthRegen;
    }

    set healthRegen(regen: number) {
      this.healthRegen = regen;
    }

    setWeapon(weapon: ItemStack) {
      this.items.weapon = weapon;
      return this;
    }
  }
}

export default Entity;