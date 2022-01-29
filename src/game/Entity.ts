import { UserSecure } from "../modules";
import { Contents } from "../game";

namespace Entity {
  export class UnitEntity {
    id: number;
    health: number;
    items: UserSecure.Inventory;
    cooldown: number = 0;
    constructor(unit: Contents.Unit) {
      this.id = unit.id;
      this.health = unit.health;
      this.items = UserSecure.defaultInven;
    }

    setWeapon(weapon: Contents.ItemStack) {
      this.items.weapon = weapon;
      return this;
    }
  }
}

export default Entity;