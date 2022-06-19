import { Item, Buff, StatusEffects } from "@RTTRPG/game/contents";
import { EntityI } from '../../@type/index';
import { AmmoTag, ConsumeTag, SlotWeaponTag, WeaponTag } from "./tags";


export default class Items {
	static readonly items: Item[] = [];
	public static punch: Item;
	public static none: Item;

	public static init() {
		this.items.push(new Item('stone', { ratio: 0.3 }));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([
				new WeaponTag(item, {damage: 1.5, cooldown: 0.3, critical_ratio: 1.2, critical_chance: 0.2, durability: 1 }), 
				new AmmoTag(item)
			]);
		})();
	  
		this.items.push(new Item('fragment', { ratio: 0.4 }));		
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([
				new AmmoTag(item)
			]);
		})();
		this.items.push(new Item('energy_bar', { ratio: 0.2 }));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([
				new ConsumeTag(item, [
					new Buff(10, 'energy', (owner: EntityI, amount: number, buff: Buff) => {
						owner.stats.energy += amount * buff.value;
					}, (owner: EntityI, amount: number, buff: Buff, locale: string) => `* ${buff.localName(locale)} +${amount * buff.value}`)
				])
			]);
		})();

		this.items.push(new Item('aluminum_sword', {
			ratio: 0.1, 
			dropOnWalk: false,
			dropOnBattle: false
		}));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([new WeaponTag(item, { damage: 1.5, cooldown: 1, critical_ratio: 1.15, critical_chance: 0.25, durability: 10 })]);
		})();

		this.items.push(new Item('wooden_sword', { 
			ratio: 0.15,
			dropOnWalk: false,
			dropOnBattle: false
		}));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([new WeaponTag(item, { damage: 1.25, cooldown: 1.5, critical_ratio: 1.1, critical_chance: 0.15, durability: 25 })]);
		})();

		this.items.push(this.punch = new Item('punch', {
			ratio: -1,
			dropOnWalk: false,
			dropOnBattle: false,
			dropOnShop: false
		}));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([new WeaponTag(item, { damage: 1, cooldown: 1, critical_ratio: 1.1, critical_chance: 0.1, durability: -1 })]);
		})();


		this.items.push(new Item('experience_bottle', { ratio: 0.1, dropOnWalk: false }));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([
				new ConsumeTag(item, [
					new Buff(10, 'exp', (owner: EntityI, amount: number, buff: Buff) => {
						owner.exp += amount * buff.value;
					}, (owner: EntityI, amount: number, buff: Buff, locale: string) => `* ${buff.localName(locale)} +${amount * buff.value}`)
				])
			]);
		})();

		this.items.push(new Item('mochi-cookie', { ratio: 0.15 }));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([
				new ConsumeTag(item, [
					new Buff(10, 'health', (owner: EntityI, amount: number, buff: Buff) => {
						owner.stats.health += amount * buff.value;
					}, (owner: EntityI, amount: number, buff: Buff, locale: string) => `* ${buff.localName(locale)} +${amount * buff.value}`)
				])
			]);
		})();

		this.items.push(new Item('cix_bottle', { ratio: 0.05 }));

		this.items.push(new Item('cat_meet', { ratio: 0.005 }));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([
				new ConsumeTag(item, [
					new Buff(10, 'health', (owner: EntityI, amount: number, buff: Buff) => {
						owner.stats.health += amount * buff.value;
					}, (owner: EntityI, amount: number, buff: Buff, locale: string) => `* ${buff.localName(locale)} +${amount * buff.value}`)
				])
			]);
		})();

		this.items.push(this.none = new Item('none', { //ID: 9
			ratio: 0,
			dropOnWalk: false,
			dropOnBattle: false,
			dropOnShop: false
		}));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([new WeaponTag(item, { damage: 0, cooldown: 0, critical_ratio: 0,critical_chance: 0, durability: 0 })]);
		})();
		
		this.items.push(new Item('poison_sword', {
			ratio: 0.75,
			dropOnWalk: false,
			dropOnBattle: false,
		}));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([new WeaponTag(item, { damage: 0.75, cooldown: 2, critical_ratio: 1.2, critical_chance: 0.2, durability: 10, status: StatusEffects.find(1) })]);
		})();

		this.items.push(new Item('cross_bow', {
			ratio: 0.25,
			dropOnWalk: false,
			dropOnBattle: true,
			dropOnShop: false
		}));
		(()=>{
			const item = this.items[this.items.length-1];
			item.addTags([new SlotWeaponTag(item, { damage: 3.5, cooldown: 2,critical_ratio: 1.5,critical_chance: 0.75,durability: 20 })]);
		})();
	}

	static find<T extends Item>(id: number | ((item: Item)=> boolean)): T {
		if(typeof id === 'number') return this.items[id] as T;
		
		const item = this.items.find(id) as T;
		if(!item) throw new Error("that item is not exist!");
		else return item;
	}
}