import { Item, Unit, StatusEffect } from "@/game/contents";
import { StatusEntity } from "@/game";
import Entity from "./Entity";

export default class UnitEntity extends Entity {
  public readonly id: number;
  public readonly type: Unit;
  public readonly stats: Stat;
  public statuses: StatusEntity[] = [];
  public exp = 0;
  public level: number;
  public name: (locale: string) => string;
  public money = 1000;

  constructor(unit: Unit) {
    super();
    this.type = unit;
    this.id = unit.id;
    this.stats = Object.assign({}, unit.stats);
    this.inventory.items.push(...unit.inventory.items);
    this.inventory.equipments.weapon = unit.inventory.equipments.weapon;
    this.statuses = [];
    this.level = unit.level;
    this.name = (locale: string) => unit.localName(locale);
  }

  public applyStatus(status: StatusEffect) {
    const exist = this.statuses.find((s) => s.status.id == status.id);
    if (exist) exist.duration += status.duration;
    else this.statuses.push(new StatusEntity(status));
  }

  public removeStatus(status: StatusEffect) {
    this.statuses.splice(
      this.statuses.findIndex((entity) => entity.status.id == status.id),
      1,
    );
  }

  public update() {
    if (!this.statuses) this.statuses = [];
    this.statuses.forEach((entity, index) => {
      if (entity.duration <= 0) return this.statuses.splice(index, 1);

      entity.duration -= 100 / 1000;
      entity.status.callback(this, entity);
    });
  }

  public giveItem(item: Item, amount = 1) {
    this.inventory.add(item, amount);
  }
}
