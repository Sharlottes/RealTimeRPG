import { Weapon, Items, Potion, Item } from "@RTTRPG/game/contents";
import { User, ItemEntity } from "@RTTRPG/game";

export class ItemStack {
	public readonly id: number;
	public readonly items: ItemEntity[] = [];
	private stackable = true;

	public constructor(id: number, amount = 1, items?: ItemEntity[]) {
		this.id = id;
		if(items) this.items = items;
		this.add(amount);
		if(this.getItem() instanceof Weapon) this.stackable = false;
	}

	public consume(user: User, amount = 1) {
		const item = Items.find(this.id);
		if (item && item instanceof Potion) {
			this.remove(amount);
			return item.consume(user, amount);
		}
		return 'this is not a potion';
	}

	public add(stack: number|ItemEntity[] = 1) {
		if(this.stackable) {
			for(let i = 0, m = typeof stack === 'number' ? stack : stack.length; i < m; i++) {
				this.items.push(this.makeEntity(typeof stack === 'number' ? undefined : stack[i]));
			}
		}
		else this.items[0] = this.makeEntity(typeof stack === 'number' ? undefined : stack[0]);
	}

	public remove(amount = 1) {
		if(this.stackable) {
			for(let i = 0; i < amount; i++) {
				this.items.pop();
			}
		}
		else this.items.pop();
	}

  private	makeEntity(entity?: ItemEntity): ItemEntity {
		if(entity) return entity;
		const item = this.getItem();
		const durability = (item instanceof Weapon ? item.durability : undefined);
		const cooldown = (item instanceof Weapon ? item.cooldown : undefined);
		return new ItemEntity(durability || durability == -1 ? undefined : durability, cooldown);
	}

	getItem<T extends Item>(): T {
		return Items.find<T>(this.id);
	}

	get amount() {
		return Array.isArray(this.items) ? this.items.length : 1;
	}
}
