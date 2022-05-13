
import { Consumable, Dropable, Durable, ItemData, Rationess, Stat, UnitData, Inventory } from '@RTTRPG/@type';
import { ItemStack, UnitEntity, User } from '@RTTRPG/game';
import { Utils } from '@RTTRPG/util';
import { bundle } from '@RTTRPG/assets';

export class Content {
	readonly name: string;
	readonly localName: (user: User)=>string;
	readonly description: (user: User)=>string;
	readonly details: (user: User)=>string;

	constructor(name: string, type = 'other') {
		this.name = name;
		this.localName = (user: User)=>bundle.find(user.locale, `content.${type}.${name}.name`);
		this.description = (user: User)=>bundle.find(user.locale, `content.${type}.${name}.description`);
		this.details = (user: User)=>bundle.find(user.locale, `content.${type}.${name}.details`);
	}
}

export class Item extends Content implements Dropable, Rationess {
	readonly ratio: number;
	readonly id: number;
	readonly dropOnWalk: boolean;
	readonly dropOnBattle: boolean;
	readonly dropOnShop: boolean;

	constructor(data: ItemData) {
		super(data.name, 'item');
		this.ratio = data.ratio;
		this.id = Items.items.length;
		this.dropOnBattle = data.dropOnBattle??true;
		this.dropOnShop = data.dropOnShop??true;
		this.dropOnWalk = data.dropOnWalk??true;
	}
}

export class Weapon extends Item implements Durable {
	readonly damage: number;
	readonly cooldown: number;
	readonly critical_ratio: number;
	readonly critical_chance: number;
  readonly durability: number;

	constructor(data: ItemData & Durable & {
    damage: number,
		cooldown: number,
		critical_ratio: number,
		critical_chance: number
  }) {
		super(data);
		this.damage = data.damage;
		this.cooldown = data.cooldown;
		this.critical_chance = data.critical_chance;
		this.critical_ratio = data.critical_ratio;
		this.durability = data.durability;
	}

	attack(user: User, target?: UnitEntity) { //non-target means user is attacked
		const critical = Utils.Mathf.randbool(this.critical_chance);
		const stat = target?target.stats:user.stats;
		const damage = this.damage + (critical ? this.critical_ratio * this.damage : 0);
		const locale = user.locale;
		
		return bundle.format(locale, 'battle.hit',
			critical ? bundle.find(locale, 'battle.critical') : '',
			target ? Units.find(target.id).localName(user) : user.user.username, //target's
			damage.toFixed(2), //damaged
			this.localName(user), //by weapon
			stat.health.toFixed(2), //before hp
			(stat.health -= this.damage).toFixed(2) //after hp
		);
	}
}

export class Unit extends Content implements Rationess {
  readonly level: number;
	readonly ratio: number;
	readonly id: number;
	readonly inventory: Inventory;
	readonly stats: Stat;

	constructor(data: UnitData) {
		super(data.name, 'unit');
		this.level = data.level;
		this.ratio = data.ratio;
		this.inventory = data.inventory || {
        items: [],
        weapon: new ItemStack(5)
    } as Inventory;
		this.stats = data.stats;
		this.id = Units.units.length;
	}
}

export class Buff {
	readonly value: number;
	readonly localName: (user: User) => string;
	readonly callback: (user: User, amount: number, buff: Buff) => string;

	constructor(
		value: number,
		name: string,
		callback: (user: User, amount: number, buff: Buff) => string
	) {
		this.value = value;
		
		this.localName = (user: User)=>bundle.find(user.locale, `buff.${name}.name`);
		this.callback = callback;
	}

	buff(user: User, amount: number) {
		return this.callback(user, amount, this);
	}
}

export class Potion extends Item implements Consumable {
	readonly buffes: Buff[];

	constructor(data: ItemData, buffes: Buff[]) {
		super(data);
		this.buffes = buffes;
	}

	consume(user: User, amount = 1) {
		return bundle.format(user.locale, 'consume', this.localName(user), amount, this.buffes.map((b) => b.buff(user, amount)).join('\n  '));
	}
}

export class Items {
	static readonly items: Item[] = [];

	static init() {
		this.items.push(new Weapon({ name: 'stone', ratio: 0.3, damage: 1.5, cooldown: 0.3, critical_ratio: 1.2, critical_chance: 0.2, durability: 1 }));
		this.items.push(new Item({ name: 'fragment', ratio: 0.4 }));
		this.items.push(new Potion({ name: 'energy_bar', ratio: 0.2 }, [
			new Buff(10, 'energy', (user: User, amount: number, buff: Buff) => {
				user.stats.energy += amount * buff.value;
				if(user.stats.energy > user.stats.energy_max) {
					user.stats.energy = user.stats.energy_max;
					user.giveItem(this.items[2], amount - Math.floor((user.stats.energy-user.stats.energy_max)/buff.value));
					
					return `* ${buff.localName(user)} +${amount * buff.value-(user.stats.energy-user.stats.energy_max)}`;
				}
				return `* ${buff.localName(user)} +${amount * buff.value}`;
			})
		]));

		this.items.push(new Weapon({ 
			name: 'aluminum_sword', 
			ratio: 0.1, 
			damage: 1.5, 
			cooldown: 1, 
			critical_ratio: 1.15, 
			critical_chance: 0.25, 
			durability: 10,
			dropOnWalk: false,
			dropOnBattle: false
		}));

		this.items.push(new Weapon({ 
			name: 'wooden_sword', 
			ratio: 0.15, 
			damage: 1.25, 
			cooldown: 1.5, 
			critical_ratio: 1.1, 
			critical_chance: 0.15, 
			durability: 25, 
			dropOnWalk: false,
			dropOnBattle: false
		}));

		this.items.push(new Weapon({ 
			name: 'punch', 
			ratio: -1, 
			damage: 1, 
			cooldown: 1, 
			critical_ratio: 1.1, 
			critical_chance: 0.1, 
			durability: -1, 
			dropOnWalk: false,
			dropOnBattle: false,
			dropOnShop: false
		}));

		this.items.push(new Potion({ name: 'experience_bottle', ratio: 0.1, dropOnWalk: false }, [
			new Buff(10, 'exp', (user: User, amount: number, buff: Buff) => {
				user.exp += amount * buff.value;
				return `* ${buff.localName(user)} +${amount * buff.value}`;
			})
		]));
		this.items.push(new Potion({ name: 'mochi-cookie', ratio: 0.15 }, [
			new Buff(10, 'health', (user: User, amount: number, buff: Buff) => {
				user.stats.health += amount * buff.value;
				if(user.stats.health > user.stats.health_max) {
					user.stats.health = user.stats.health_max;
					user.giveItem(this.items[7], amount - Math.floor((user.stats.health-user.stats.health_max)/buff.value));
					
					return `* ${buff.localName(user)} +${amount * buff.value-(user.stats.health-user.stats.health_max)}`;
				}
				return `* ${buff.localName(user)} +${amount * buff.value}`;
			})
		]));
		this.items.push(new Item({ name: 'cix_bottle', ratio: 0.05 }));
		this.items.push(new Potion({ name: 'cat_meet', ratio: 0.005 }, [
			new Buff(4, 'health', (user: User, amount: number, buff: Buff) => {
				user.stats.health += amount * buff.value;
				if(user.stats.health > user.stats.health_max) {
					user.stats.health = user.stats.health_max;
					user.giveItem(this.items[2], amount - Math.floor((user.stats.health-user.stats.health_max)/buff.value));
					
					return `* ${buff.localName(user)} +${amount * buff.value-(user.stats.health-user.stats.health_max)}`;
				}
				return `* ${buff.localName(user)} +${amount * buff.value}`;
			})
		]));

		this.items.push(new Weapon({ //ID: 9
			name: 'none', 
			ratio: 0, 
			damage: 0, 
			cooldown: 0, 
			critical_ratio: 0, 
			critical_chance: 0, 
			durability: 0, 
			dropOnWalk: false,
			dropOnBattle: false,
			dropOnShop: false
		}));
	}

	static find<T extends Item>(id: number | ((item: Item)=> boolean)): T {
		if(typeof id === 'number') return this.items[id] as T;
		
		const item = this.items.find(id) as T;
		if(!item) throw new Error("that item is not exist!");
		else return item;
	}
}


export class Units {
	static readonly units: Unit[] = [];

	static init() {
		this.units.push(new Unit({
			name: 'obstruction',
			level: 1,
			stats: {
				strength: 0,
				defense: 0,
				health: 5,
				health_max: 5,
				health_regen: 0,
				energy: 0,
				energy_max: 0,
				energy_regen: 0
			},
			ratio: 0.1
		}));
		this.units.push(new Unit({
			name: 'goblin',
			level: 1,
			stats: {
				strength: 0,
				defense: 0,
				health: 2,
				health_max: 5,
				health_regen: 0,
				energy: 0,
				energy_max: 0,
				energy_regen: 0
			},
			ratio: 0.3
		}));
	}

	static find<T extends Unit>(id: number): T {
		return this.units[id] as T;
	}
}