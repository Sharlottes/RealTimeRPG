import { User } from '@뇌절봇/modules';
import Assets from '@뇌절봇/assets';
import { Consumable, ItemData, Rationess } from '@뇌절봇/@type';
import { Item } from './Item';
import { Unit } from './Unit';
import { Weapon } from './Weapon';

const Bundle = Assets.bundle;

export class Content {
	readonly name: string;
	readonly localName: (user?: User)=>string;
	readonly description: (user?: User)=>string;
	readonly details: (user?: User)=>string;

	constructor(name: string, type = 'other') {
		this.name = name;
		this.localName = (user?: User)=>Bundle.find(user?user.lang:'en', `content.${type}.${name}.name`);
		this.description = (user?: User)=>Bundle.find(user?user.lang:'en', `content.${type}.${name}.description`);
		this.details = (user?: User)=>Bundle.find(user?user.lang:'en', `content.${type}.${name}.details`);
	}
}


export class Buff {
	readonly value: number;
	readonly localName: (user: User)=>string;
	readonly callback: (user: User, amount: number, buff: Buff) => string;

	constructor(
		value: number,
		name: string,
		callback: (user: User, amount: number, buff: Buff) => string
	) {
		this.value = value;
		
		this.localName = (user: User)=>Bundle.find(user.lang, `buff.${name}.name`);
		this.callback = callback;
	}

	buff(user: User, amount: number) {
		return this.callback(user, amount, this);
	}
}

export class Potion extends Item implements Consumable, Rationess {
	private readonly buffes: Buff[];

	constructor(data: ItemData, buffes: Buff[]) {
		super(data);
		this.buffes = buffes;
	}

	consume(user: User, amount = 1) {
		return Bundle.format(user.lang, 'consume', this.localName(user), amount, this.buffes.map((b) => b.buff(user, amount)).join('\n  '));
	}

	getRatio() {
		return this.rare;
	}
}


export class ItemStack {
	id: number;
	amount: number;
	durability: number | undefined;

	constructor(id: number, amount=1, durability?: number) {
		this.id = id;
		this.amount = amount;
		this.durability = durability;
	}

	static equals(stack: ItemStack, item: Item, amount?: number) {
		return stack.id == item.id && (!amount || stack.amount == amount);
	}

	static consume(stack: ItemStack, user: User, amount = 1) {
		const item = Items.find(stack.id);
		if (item) {
			stack.amount--;
			if(stack.amount <= 0) user.inventory.items.splice(user.inventory.items.indexOf(stack), 1);
			return (item as unknown as Consumable).consume?.call(item, user, amount);
		}
	}

	static getItem<T extends Item>(stack: ItemStack): T {
		return Items.find(stack.id);
	}
}

export class Items {
	static readonly items: Item[] = [];

	static init() {
		this.items.push(new Weapon({ name: 'stone', rare: 0.3, damage: 1.5, cooldown: 0.3, critical_ratio: 1.2, critical_chance: 0.2, durability: 1 }));
		this.items.push(new Item({ name: 'fragment', rare: 0.4 }));
		this.items.push(new Potion({ name: 'energy_bar', rare: 0.2 }, [
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
			rare: 0.1, 
			damage: 1.5, 
			cooldown: 1, 
			critical_ratio: 1.15, 
			critical_chance: 0.25, 
			durability: 10, 
			drop: { 
				dropOnWalk: false,
				dropOnBattle: false
			} 
		}));

		this.items.push(new Weapon({ 
			name: 'wooden_sword', 
			rare: 0.15, 
			damage: 1.25, 
			cooldown: 1.5, 
			critical_ratio: 1.1, 
			critical_chance: 0.15, 
			durability: 25, 
			drop: { 
				dropOnWalk: false,
				dropOnBattle: false
			} 
		}));

		this.items.push(new Weapon({ 
			name: 'punch', 
			rare: -1, 
			damage: 1, 
			cooldown: 1, 
			critical_ratio: 1.1, 
			critical_chance: 0.1, 
			durability: -1, 
			drop: { 
				dropOnWalk: false,
				dropOnBattle: false,
				dropOnShop: false
			} 
		}));
		
		this.items.push(new Potion({ name: 'experience_bottle', rare: 0.1, drop: {dropOnWalk: false} }, [
			new Buff(10, 'exp', (user: User, amount: number, buff: Buff) => {
				user.exp += amount * buff.value;
				return `* ${buff.localName(user)} +${amount * buff.value}`;
			})
		]));
		this.items.push(new Potion({ name: 'mochi-cookie', rare: 0.15 }, [
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
		this.items.push(new Item({ name: 'cix_bottle', rare: 0.05 }));
	}

	static find<T extends Item>(id: number): T {
		return this.items[id] as T;
	}
}


export class Units {
	static readonly units: Unit[] = [];

	static init() {
		this.units.push(new Unit('obstruction', 5, 0, 1, 0.1, []));
		this.units.push(new Unit('goblin', 2, 0, 1, 0.3, []));
	}

	static find<T extends Unit>(id: number): T {
		return this.units[id] as T;
	}
}