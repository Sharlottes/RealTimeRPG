import { User } from "@RTTRPG/game";
import { Item, Potion, Weapon, Buff, StatusEffects } from "@RTTRPG/game/contents";
import { EntityI } from '../../@type/index';


export default class Items {
	static readonly items: Item[] = [];
	public static punch: Weapon;
	public static none: Weapon;

	static init() {
		this.items.push(new Weapon({ name: 'stone', ratio: 0.3, damage: 1.5, cooldown: 0.3, critical_ratio: 1.2, critical_chance: 0.2, durability: 1 }));
		this.items.push(new Item({ name: 'fragment', ratio: 0.4 }));
		this.items.push(new Potion({ name: 'energy_bar', ratio: 0.2 }, [
			new Buff(10, 'energy', (owner: EntityI, amount: number, buff: Buff) => {
				owner.stats.energy += amount * buff.value;
				;
			}, (owner: EntityI, amount: number, buff: Buff, locale: string) => `* ${buff.localName(locale)} +${amount * buff.value}`)
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

		this.items.push(this.punch = new Weapon({ 
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

		//TODO: 문자열 반환은 매우 비직관적
		this.items.push(new Potion({ name: 'experience_bottle', ratio: 0.1, dropOnWalk: false }, [
			new Buff(10, 'exp', (owner: EntityI, amount: number, buff: Buff) => {
				owner.exp += amount * buff.value;
			}, (owner: EntityI, amount: number, buff: Buff, locale: string) => `* ${buff.localName(locale)} +${amount * buff.value}`)
		])); 
		this.items.push(new Potion({ name: 'mochi-cookie', ratio: 0.15 }, [
			new Buff(10, 'health', (owner: EntityI, amount: number, buff: Buff) => {
				owner.stats.health += amount * buff.value;
			}, (owner: EntityI, amount: number, buff: Buff, locale: string) => `* ${buff.localName(locale)} +${amount * buff.value}`)
		]));
		this.items.push(new Item({ name: 'cix_bottle', ratio: 0.05 }));
		this.items.push(new Potion({ name: 'cat_meet', ratio: 0.005 }, [
			new Buff(4, 'health', (owner: EntityI, amount: number, buff: Buff) => {
				owner.stats.health += amount * buff.value;
			}, (owner: EntityI, amount: number, buff: Buff, locale: string) => `* ${buff.localName(locale)} +${amount * buff.value}`)
		]));

		this.items.push(this.none = new Weapon({ //ID: 9
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
		
		this.items.push(new Weapon({ 
			name: 'poison_sword', 
			ratio: 0.75, 
			damage: 0.75, 
			cooldown: 2, 
			critical_ratio: 1.2, 
			critical_chance: 0.2, 
			durability: 10, 
			dropOnWalk: false,
			dropOnBattle: false,
			status: StatusEffects.find(1)
		}));

	}

	static find<T extends Item>(id: number | ((item: Item)=> boolean)): T {
		if(typeof id === 'number') return this.items[id] as T;
		
		const item = this.items.find(id) as T;
		if(!item) throw new Error("that item is not exist!");
		else return item;
	}
}

