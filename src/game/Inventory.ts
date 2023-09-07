import { Item, Items } from "./contents";
import { predicateOf } from "@/utils/predicateOf";

export default class Inventory {
  public items: ItemStorable[] = [];
  public readonly equipments: Equipments = {
    weapon: new WeaponEntity(Items.find(5)),
  };

  public setWeapon(entity: WeaponEntity): this {
    this.equipments.weapon = entity;
    return this;
  }

  public add(item: Item, amount = 1): void {
    if (this.isStorable(item)) {
      const stack = this.items.find(
        predicateOf<ItemStack>()(
          (store) => store instanceof ItemStack && store.item == item,
        ),
      );
      if (stack) stack.apply(amount);
      else this.items.push(new ItemStack(item, amount));
    } else {
      for (let i = 0; i < amount; i++) {
        if (item.hasSlotWeapon()) this.items.push(new SlotWeaponEntity(item));
        else if (item.hasWeapon()) this.items.push(new WeaponEntity(item));
        else this.items.push(new ItemEntity(item));
      }
    }
  }

  public remove(item: Item, amount = 1): void {
    if (this.isStorable(item)) {
      const stack = this.items.find(
        predicateOf<ItemStack>()(
          (store) => store instanceof ItemStack && store.item == item,
        ),
      );
      if (stack) {
        stack.amount -= amount;
        if (stack.amount <= 0)
          this.items.splice(
            this.items.findIndex((store) => store.item.id == item.id),
            1,
          );
      }
    } else {
      this.items = this.items.filter((store) => store.item.id != item.id);
    }
  }

  public isStorable(item: Item): boolean {
    return !item.hasWeapon();
  }

  public toJSON(): InventoryJSONdata {
    const data: InventoryJSONdata = {
      items: [],
      equipments: {},
    };
    // 과연 방금의 optional 변경사항으로 인해 어떤 영향이 생겼을지 아주 흥미롭네요 어차피 상태로 돌려쓸것도 아니고 내보낼 데이터니깐 상관없...을겁니다
    if (this.equipments.weapon instanceof SlotWeaponEntity) {
      data.equipments.weapon = {
        type: "SlotWeaponEntity",
        item: this.equipments.weapon.item.id,
        durability: this.equipments.weapon.durability,
        cooldown: this.equipments.weapon.cooldown,
        ammos: this.equipments.weapon.ammos.map((item) => item.id),
      };
    } else {
      data.equipments.weapon = {
        type: "WeaponEntity",
        item: this.equipments.weapon.item.id,
        durability: this.equipments.weapon.durability,
        cooldown: this.equipments.weapon.cooldown,
      };
    }
    if (this.equipments.shield) {
      data.equipments.shield = {
        type: "ShieldEntity",
        item: this.equipments.shield.item.id,
        durability: this.equipments.shield.durability,
      };
    }

    this.items.forEach((store) => {
      // item: store.item.id
      if (store instanceof ShieldEntity)
        data.items.push({
          type: "ShieldEntity",
          item: store.item.id,
          durability: store.durability,
        });
      else if (store instanceof SlotWeaponEntity)
        data.items.push({
          type: "SlotWeaponEntity",
          item: store.item.id,
          durability: store.durability,
          cooldown: store.cooldown,
          ammos: store.ammos.map((item) => item.id),
        });
      else if (store instanceof WeaponEntity)
        data.items.push({
          type: "WeaponEntity",
          item: store.item.id,
          durability: store.durability,
          cooldown: store.cooldown,
        });
      else if (store instanceof ItemEntity)
        data.items.push({ type: "ItemEntity", item: store.item.id });
      else if (store instanceof ItemStack)
        data.items.push({
          type: "ItemStack",
          item: store.item.id,
          amount: store.amount,
        });
    });
    return data;
  }

  public fromJSON(data: InventoryJSONdata): void {
    data.items.forEach((store) => {
      const item = Items.find(store.item);
      switch (store.type) {
        case "ItemStack": {
          this.items.push(new ItemStack(item, store.amount));
          break;
        }
        case "ItemEntity": {
          this.items.push(new ItemEntity(item));
          break;
        }
        case "WeaponEntity": {
          if (!item.hasWeapon())
            throw "got crashed during loading user inventory";
          const entity = new WeaponEntity(item);
          entity.durability = store.durability!;
          entity.cooldown = store.cooldown!;
          this.items.push(entity);
          break;
        }
        case "DurableItemEntity": {
          const entity = new DurableItemEntity(item, store.durability!);
          this.items.push(entity);
          break;
        }
        case "SlotWeaponEntity": {
          if (!item.hasSlotWeapon())
            throw "got crashed during loading user inventory";
          const entity = new SlotWeaponEntity(item);
          store.ammos?.forEach((ammo) => entity.ammos.push(Items.find(ammo)));
          entity.durability = store.durability!;
          entity.cooldown = store.cooldown!;
          this.items.push(entity);
          break;
        }
        case "ShieldEntity": {
          if (!item.hasShield())
            throw "got crashed during loading user inventory";
          const entity = new ShieldEntity(item);
          entity.durability = store.durability!;
          this.items.push(entity);
          break;
        }
      }
    });

    const equippedWeapon = data.equipments.weapon;
    if (equippedWeapon) {
      switch (equippedWeapon.type) {
        case "WeaponEntity": {
          if (!Items.find(equippedWeapon.item).hasWeapon())
            throw "got crashed during loading user inventory";
          const entity = new WeaponEntity(Items.find(equippedWeapon.item));
          entity.durability = equippedWeapon.durability;
          entity.cooldown = equippedWeapon.cooldown;
          this.equipments.weapon = entity;
          break;
        }
        case "SlotWeaponEntity": {
          if (!Items.find(equippedWeapon.item).hasSlotWeapon())
            throw "got crashed during loading user inventory";
          const entity = new SlotWeaponEntity(Items.find(equippedWeapon.item));
          equippedWeapon.ammos?.forEach((ammo) =>
            entity.ammos.push(Items.find(ammo)),
          );
          entity.durability = equippedWeapon.durability;
          entity.cooldown = equippedWeapon.cooldown;
          this.equipments.weapon = entity;
          break;
        }
      }
    }

    if (data.equipments.shield) {
      const entity = new ShieldEntity(Items.find(data.equipments.shield.item));
      entity.durability = data.equipments.shield.durability;
      this.equipments.shield = entity;
    }
  }
}

export type Equipments = {
  weapon: WeaponEntity;
  shield?: ShieldEntity;
};

export interface ItemStorable {
  item: Item;
  toStateString(find: (key: string) => string): string;
}

export class ItemEntity implements ItemStorable {
  constructor(public item: Item) {}

  toStateString(find: (key: string) => string): string {
    return "";
  }
}

export class DurableItemEntity implements ItemStorable, Durable {
  constructor(
    public item: Item,
    public durability: number,
  ) {}

  toStateString(find: (key: string) => string): string {
    return `${this.durability} ${find("durability")}`;
  }
}

export class ShieldEntity extends DurableItemEntity {
  constructor(public item: Item) {
    super(item, item.getShield().durability);
  }
}

export class WeaponEntity extends DurableItemEntity {
  public cooldown: number;

  constructor(public item: Item) {
    const { cooldown, durability } = item.getWeapon();
    super(item, durability);
    this.cooldown = cooldown;
  }

  toStateString(find: (key: string) => string): string {
    return `${this.cooldown} ${find("cooldown")}, ${super.toStateString(find)}`;
  }
}

export class SlotWeaponEntity extends WeaponEntity {
  public ammos: Item[] = [];

  constructor(public item: Item) {
    super(item);
  }

  toStateString(find: (key: string) => string): string {
    return `${super.toStateString(find)} ${this.ammos.length} ${find(
      "unit.item",
    )} ${find("ammo")}`;
  }
}

export class ItemStack implements ItemStorable {
  constructor(
    public item: Item,
    public amount: number = 1,
  ) {}

  toStateString(find: (key: string) => string): string {
    return `${this.amount} ${find("unit.item")}`;
  }

  apply(amount = 1) {
    this.amount += amount;
  }
}
