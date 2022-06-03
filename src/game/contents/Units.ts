import { Unit } from ".";
import { ItemStack } from "@RTTRPG/game";

export default class Units {
	static readonly units: Unit[] = [];
	public static goblin: Unit;

	static init() {
		this.units.push(new Unit({
			name: 'obstruction',
			level: 1,
			stats: {
				strength: 0,
				defense: 0,
				health: 20,
				health_max: 20,
				health_regen: 1,
				energy: 200,
				energy_max: 0,
				energy_regen: 0
			},
			ratio: 0.2,
			inventory:  {
        items: [],
        weapon: new ItemStack(9)
			}
		}));
		this.units.push(this.goblin = new Unit({
			name: 'goblin',
			level: 1,
			stats: {
				strength: 0,
				defense: 0,
				health: 5,
				health_max: 5,
				health_regen: 0,
				energy: 100,
				energy_max: 0,
				energy_regen: 0
			},
			ratio: 0.1
		}));
	}

	static find<T extends Unit>(id: number): T {
		return this.units[id] as T;
	}
}