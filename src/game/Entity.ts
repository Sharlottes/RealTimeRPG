import { Inventory, defaultInven } from "../modules";
import { Unit, ItemStack } from "../game";
import { Heathy } from '../@type';
import { Units } from './contents/Content';

namespace Entity {
  export class UnitEntity implements Heathy {
    id: number;
    health: number;
    maxHealth: number;
    healthRegen: number;
    items: Inventory;
    cooldown = 0;
    constructor(unit: Unit) {
      this.id = unit.id;
      this.health = unit.health;
      this.maxHealth = unit.health;
      this.healthRegen = unit.healthRegen;
      this.items = defaultInven;
    }
    getHealth(): number {
      return this.health;
    }
    setHealth(health: number): number {
      return this.health = health;
    }
    getMaxHealth(): number {
      return this.maxHealth;
    }
    setMaxHealth(max: number): number {
      return this.maxHealth = max;
    }
    getHealthRegen(): number {
      return this.healthRegen;
    }
    setHealthRegen(regen: number): number {
      return this.healthRegen = regen;
    }

    setWeapon(weapon: ItemStack) {
      this.items.weapon = weapon;
      return this;
    }
  }
}

export default Entity;