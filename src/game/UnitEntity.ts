import { Item, Unit, Units, StatusEffect, Items } from "@RTTRPG/game/contents";
import { EntityI, Stat } from '@RTTRPG/@type';
import { Inventory, StatusEntity, WeaponEntity } from "@RTTRPG/game";

export default class UnitEntity implements EntityI {
  public readonly id: number;
  public readonly stats: Stat;
  public readonly inventory = new Inventory();
  public statuses: StatusEntity[] = [];
  public exp = 0;
  public level: number;
  public name: (locale: string)=>string;
  public money = 1000;

  constructor(unit: Unit) {
    this.id = unit.id;
    this.stats = Object.assign({}, unit.stats);
    unit.inventory.items.forEach(store => this.inventory.items.push(store));
    this.inventory.equipments.weapon = unit.inventory.equipments.weapon;
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
    this.statuses.splice(this.statuses.findIndex(entity => entity.status.id == status.id), 1);
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
    this.inventory.add(item, amount);
  }

	public getUnit<T extends Unit>(): T {
		return Units.find<T>(this.id);
	}

  public switchWeapon(weapon: Item) {
    const entity = this.inventory.items.find<WeaponEntity>((store): store is WeaponEntity => store instanceof WeaponEntity && store.item == weapon);
    if (!entity) return;
    if(this.inventory.equipments.weapon.item != Items.none && this.inventory.equipments.weapon.item != Items.punch) this.inventory.items.push(this.inventory.equipments.weapon);
    this.inventory.items.splice(this.inventory.items.indexOf(entity), 1);
    this.inventory.equipments.weapon = entity;
  }
}