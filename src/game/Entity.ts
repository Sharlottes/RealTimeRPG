import Inventory, { WeaponEntity } from "@/game/Inventory";
import { EntityI } from "@/@type/types";

import StatusEffect from "./contents/types/StatusEffect";
import StatusEntity from "./StatusEntity";
import Items from "./contents/Items";

export default abstract class Entity implements EntityI {
  public abstract readonly id: string | number;
  public abstract readonly stats: Stat;
  public abstract readonly name: string | ((locale: string) => string);
  public abstract exp: number;
  public abstract level: number;
  public abstract money: number;
  public readonly inventory = new Inventory();
  public abstract readonly statuses: StatusEntity[];
  public abstract applyStatus(status: StatusEffect): void;
  public abstract removeStatus(status: StatusEffect): void;
  public switchWeapon(entity: WeaponEntity) {
    const { equipments, items } = this.inventory;
    const equippedWeapon = equipments.weapon;
    const isEquippedWeaponSwitchable = equippedWeapon.item !== Items.none && equippedWeapon.item !== Items.punch;
    if (isEquippedWeaponSwitchable) [items[items.indexOf(entity)], equipments.weapon] = [equipments.weapon, entity];
    else {
      equipments.weapon = entity;
      items.splice(items.indexOf(entity), 1);
    }
  }
}
