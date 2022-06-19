import { Durable, InventoryJSONdata } from "@RTTRPG/@type";
import { Item, Items } from "./contents";

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
        if(item.hasWeapon()) this.items.push(new WeaponEntity(item));
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
    return !item.hasWeapon();
  }

  public toJSON(): InventoryJSONdata {
    const data: InventoryJSONdata = {
      items: [],
      equipments: {}
    } as unknown as InventoryJSONdata;

    if(this.equipments.weapon instanceof SlotWeaponEntity) data.equipments.weapon = {type: "SlotWeaponEntity", item: this.equipments.weapon.item.id, durability: this.equipments.weapon.durability, cooldown: this.equipments.weapon.cooldown, ammos: this.equipments.weapon.ammos.map(item => item.id)};
    else data.equipments.weapon = {type: "WeaponEntity", item: this.equipments.weapon.item.id, durability: this.equipments.weapon.durability, cooldown: this.equipments.weapon.cooldown};
      
    this.items.forEach(store => {
      if(store instanceof SlotWeaponEntity) data.items.push({type: "SlotWeaponEntity", item: store.item.id, durability: store.durability, cooldown: store.cooldown, ammos: store.ammos.map(item => item.id)});
      else if(store instanceof WeaponEntity) data.items.push({type: "WeaponEntity", item: store.item.id, durability: store.durability, cooldown: store.cooldown});
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
          if(!item.hasWeapon()) throw "got crashed during loading user inventory";
          const entity = new WeaponEntity(item);
          entity.durability = store.durability as number;
          entity.cooldown = store.cooldown as number;
          this.items.push(entity);
          break;
        }
        case "SlotWeaponEntity": {
          if(!item.hasSlotWeapon()) throw "got crashed during loading user inventory";
          const entity = new SlotWeaponEntity(item);
          store.ammos?.forEach(ammo => entity.ammos.push(Items.find(ammo)));
          entity.durability = store.durability as number;
          entity.cooldown = store.cooldown as number;
          this.items.push(entity);
          break;
        }
      }
    });
    switch(data.equipments.weapon.type) {
      case "WeaponEntity" : {
        if(!Items.find(data.equipments.weapon.item).hasWeapon()) throw "got crashed during loading user inventory";
        const entity = new WeaponEntity(Items.find(data.equipments.weapon.item));
        entity.durability = data.equipments.weapon.durability as number;
        entity.cooldown = data.equipments.weapon.cooldown as number;
        this.equipments.weapon = entity;
        break;
      }
      case "SlotWeaponEntity": {
        if(!Items.find(data.equipments.weapon.item).hasSlotWeapon()) throw "got crashed during loading user inventory";
        const entity = new SlotWeaponEntity(Items.find(data.equipments.weapon.item));
        data.equipments.weapon.ammos?.forEach(ammo => entity.ammos.push(Items.find(ammo)));
        entity.durability = data.equipments.weapon.durability as number;
        entity.cooldown = data.equipments.weapon.cooldown as number;
        this.equipments.weapon = entity;
        break;
      }
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
  public item: Item;
  public cooldown: number;
  public durability: number;

  constructor(weapon: Item) {
    this.item = weapon;
    const tag = weapon.getWeapon();
    this.cooldown = tag.cooldown;
    this.durability = tag.durability;
  }
}

export class SlotWeaponEntity extends WeaponEntity {
  public ammos: Item[] = [];

  constructor(weapon: Item) {
    super(weapon);
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