import { StatusEffect } from '.';

export default class StatusEffects {
	public static readonly statuses: StatusEffect[] = [];
  public static heal: StatusEffect;
  public static poison: StatusEffect;
  public static mana: StatusEffect;
  public static weakness: StatusEffect;
  public static annoyed: StatusEffect;

  static init() {
    this.heal = new StatusEffect('heal', 3, (unit, status) => {
      unit.stats.health += status.getValue(5);
    });

    this.poison = new StatusEffect('poison', 2, (unit, status) => {
      unit.stats.health -= status.getValue(6);
    });

    this.mana = new StatusEffect('mana', 3, (unit, status) => {
      unit.stats.energy += status.getValue(15);
    });

    this.weakness = new StatusEffect('weakness', 3, (unit, status) => {
      unit.inventory.equipments.weapon.durability -= status.getValue(3);
      if(unit.inventory.equipments.weapon.durability <= 0) return unit.removeStatus(status.status);
    });

    this.annoyed = new StatusEffect('annoyed', 1, (unit, status) => {
      unit.stats.health -= status.getValue(5);
      unit.inventory.equipments.weapon.durability -= status.getValue(1);
    });
  }
}