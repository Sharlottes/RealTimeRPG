import { Item, Unit, Units, StatusEffect } from "@RTTRPG/game/contents";
import { Inventory, Stat } from '@RTTRPG/@type';
import { ItemStack, StatusEntity } from "@RTTRPG/game";

export default class UnitEntity {
  public readonly id: number;
  public readonly inventory: Inventory;
  public readonly stats: Stat;
  public statuses: StatusEntity[] = [];
  public money = 1000;

  constructor(unit: Unit) {
    this.id = unit.id;
    this.stats = Object.assign({}, unit.stats);
    this.inventory = Object.assign({}, unit.inventory);
    this.statuses = [];
  }

  public applyStatus(status: StatusEffect) {
    this.statuses.push(new StatusEntity(status));
  }

  public removeStatus(status: StatusEffect) {
    this.statuses.splice(this.statuses.findIndex(entity=>entity.status.id==status.id), 1);
  }

  public update() {
    if(!this.statuses) this.statuses = [];
    this.statuses.forEach((entity, index) => {
      if(entity.duration <= 0) return this.statuses?.splice(index, 1);

      entity.duration -= 100 / 1000;
      entity.status.callback(this, entity);
    })  
  }

  public setWeapon(weapon: ItemStack) {
    this.inventory.weapon = weapon;
    return this;
  }

  public giveItem(item: Item, amount: number) { 
    const stack = this.inventory.items.find((i) => i.id == item.id);
    if (stack) {
      stack.add(amount);
    } else this.inventory.items.push(new ItemStack(item.id, amount));
  }

	public getUnit<T extends Unit>(): T {
		return Units.find<T>(this.id);
	}
}