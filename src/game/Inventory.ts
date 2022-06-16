import { Durable, InventoryJSONdata } from "@RTTRPG/@type";
import { Item, Items, Weapon } from "./contents";

export default class Inventory {
  public readonly items: ItemStorable[] = [];
  public readonly equipments: Equipments = {weapon: new WeaponEntity(Items.find(5))};

  public setWeapon(entity: WeaponEntity): this {
    this.equipments.weapon = entity;
    return this;
  }

  public addItems(items: ItemStorable[]): this {
    items.forEach(store => this.items.push(store));
    return this;
  }

  public add(item: Item, amount = 1): void {
    if(this.isStorable(item)) {
      const stack: ItemStack | undefined = this.items.find<ItemStack>((store): store is ItemStack => store instanceof ItemStack && store.item == item);
      if(stack) stack.apply(amount);
      else this.items.push(new ItemStack(item, amount));
    }
    else {
      for(let i = 0; i < amount; i++) {
        if(item instanceof Weapon) this.items.push(new WeaponEntity(item));
        else this.items.push(new ItemEntity(item));
      }
    }
  }

  public remove(item: Item, amount = 1): void {
    if(this.isStorable(item)) {
      const stack: ItemStack | undefined = this.items.find<ItemStack>((store): store is ItemStack => store instanceof ItemStack && store.item == item);
      if(stack) {
        stack.amount -= amount;
        if(stack.amount <= 0) this.items.splice(this.items.findIndex((store => store.item.id == item.id)), 1);
      }
    }
    else {
      for(let i = 0, j = 0; i < this.items.length && j < amount; i++) {
        this.items.splice(this.items.findIndex((store => store.item.id == item.id)), 1);
      }
    }
  }

  public isStorable(item: Item): boolean {
    return !(item instanceof Weapon);
  }

  public toJSON(): InventoryJSONdata {
    const data: InventoryJSONdata = {
      items: [],
      equipments: {
        weapon: {
          type: "WeaponEntity",
          item: this.equipments.weapon.item.id,
          durability: this.equipments.weapon.durability,
          cooldown: this.equipments.weapon.cooldown
        }
      }
    } as unknown as InventoryJSONdata;

    this.items.forEach(store => {
      if(store instanceof WeaponEntity) data.items.push({type: "WeaponEntity", item: store.item.id, durability: store.durability, cooldown: store.cooldown});
      else if(store instanceof ItemEntity) data.items.push({type: "ItemEntity", item: store.item.id});
      else if(store instanceof ItemStack) data.items.push({type: "ItemStack", item: store.item.id, amount: store.amount});
    });

    return data;
  }

  public fromJSON(data: InventoryJSONdata): void {
    data.items.forEach(store => {
      const item = Items.find(store.item);
      switch(store.type) {
        case "ItemStack" : {
          this.items.push(new ItemStack(item, store.amount));
          break;
        }
        case "ItemEntity" : {
          this.items.push(new ItemEntity(item));
          break;
        }
        case "WeaponEntity" : {
          const entity = new WeaponEntity(item as Weapon);
          entity.durability = store.durability as number;
          entity.cooldown = store.cooldown as number;
          this.items.push(entity);
          break;
        }
        
      }
    });
    if(data.equipments.weapon) {
      this.equipments.weapon = new WeaponEntity(Items.find(data.equipments.weapon.item));
      this.equipments.weapon.durability = data.equipments.weapon.durability;
      this.equipments.weapon.cooldown = data.equipments.weapon.cooldown;
    }
  } 
}

export type Equipments = {
  weapon: WeaponEntity
}

export interface ItemStorable {
  item: Item;
}

export class ItemEntity implements ItemStorable {
  item: Item;

  constructor(item: Item) {
    this.item = item;
  }
}

export class WeaponEntity implements ItemStorable, Durable {
  public item: Weapon;
  public cooldown: number;
  public durability: number;

  constructor(weapon: Weapon) {
    this.item = weapon;
    this.cooldown = weapon.cooldown;
    this.durability = weapon.durability;
  }
}

export class ItemStack implements ItemStorable {
  item: Item;
  amount: number;

  constructor(item: Item, amount = 1) {
    this.item = item;
    this.amount = amount;
  }

  apply(amount = 1) {
    this.amount += amount;
  }
}