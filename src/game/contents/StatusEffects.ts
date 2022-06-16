import { Weapon, StatusEffect } from '.';

export default class StatusEffects {
	static readonly statuses: StatusEffect[] = [];

  static init() {
    this.statuses.push(new StatusEffect('heal', 3, 1, (unit, status)=>{
      unit.stats.health += Math.min(unit.stats.health_max-unit.stats.health, status.power/status.status.duration) * 100 / 1000;
    }));
    this.statuses.push(new StatusEffect('poison', 2, 2, (unit, status)=>{
      unit.stats.health -= Math.min(unit.stats.health_max-unit.stats.health, status.power/status.status.duration) * 100 / 1000;
    }));
    this.statuses.push(new StatusEffect('mana', 3, 1, (unit, status)=>{
      unit.stats.energy += Math.min(unit.stats.energy_max-unit.stats.energy, status.power/status.status.duration) * 100 / 1000;
    }));
    this.statuses.push(new StatusEffect('weakness', 3, 1, (unit, status)=>{
      unit.inventory.equipments.weapon.durability -= status.power/status.status.duration * 100 / 1000;
      if(unit.inventory.equipments.weapon.durability <= 0) return unit.removeStatus(status.status);
    }));
  }

	static find<T extends StatusEffect>(id: number): T {
		return this.statuses[id] as T;
	}
}