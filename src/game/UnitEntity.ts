import { Item, Unit, Units, StatusEffect, Weapon } from "@RTTRPG/game/contents";
import { EntityI, Inventory, Stat } from '@RTTRPG/@type';
import { ItemStack, StatusEntity } from "@RTTRPG/game";

export default class UnitEntity implements EntityI {
  public readonly id: number;
  public readonly stats: Stat;
  public readonly inventory: Inventory;
  public statuses: StatusEntity[] = [];
  public exp = 0;
  public level: number;
  public name: (locale: string)=>string;
  public money = 1000;

  constructor(unit: Unit) {
    this.id = unit.id;
    this.stats = Object.assign({}, unit.stats);
    this.inventory = Object.assign({}, unit.inventory);
    this.statuses = [];
    this.level = unit.level;
    this.name = (locale: string)=>unit.localName(locale);
  }


  public applyStatus(status: StatusEffect) {
    const exist = this.statuses.find(s => s.status.id == status.id);
    if(exist) exist.duration += status.duration;
    else this.statuses.push(new StatusEntity(status)); 
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

  public giveItem(item: Item, amount = 1) { 
    const stack = this.inventory.items.find((i) => i.id == item.id);
    if (stack) {
      stack.add(amount);
    } else this.inventory.items.push(new ItemStack(item.id, amount));
  }

	public getUnit<T extends Unit>(): T {
		return Units.find<T>(this.id);
	}

  public switchWeapon(weapon: Weapon, targetEntity: ItemStack) {
    targetEntity.remove();
    if (targetEntity.amount <= 0) this.inventory.items.splice(this.inventory.items.indexOf(targetEntity), 1);

    this.giveItem(this.inventory.weapon.getItem());
    this.inventory.weapon = new ItemStack(weapon.id);
  }

}