import { Item, Items, StatusEffect } from 'game/contents';
import { EntityI, Stat, UserSave } from '@type';
import { ItemStack, StatusEntity, Inventory, WeaponEntity } from "game";
import { bundle } from 'assets';
import { Canvas } from "utils";
import { app } from 'index';
import { filledBar } from 'string-progressbar';
import { SlotWeaponEntity } from './Inventory';
import Manager from './managers/Manager';
import GameManager from './managers/GameManager';
import { predicateOf } from 'utils/predicateOf';

export default abstract class Entity implements EntityI {
  public abstract readonly id: string | number;
  public abstract readonly stats: Stat;
  public abstract readonly name: string | ((locale: string) => string);
  public abstract exp: number;
  public abstract level: number;
  public abstract money: number;
  public readonly inventory = new Inventory();
  public abstract readonly statuses: StatusEntity[];
  public abstract applyStatus(status: StatusEffect): void;
  public abstract removeStatus(status: StatusEffect): void;
  public switchWeapon(weapon: Item) {
    const { equipments, items } = this.inventory;
    // 																								주의할 점: 제네릭때문에 호출 2번 해야 함
    const entity = items.find(predicateOf<WeaponEntity>()((store) =>
      store instanceof WeaponEntity && store.item == weapon
    ));
    if (!entity) return; //이거 여기 뭐 있지 않았나요
    // ㄴㄴ 그거는 자식클래스에서 해서 일부러 이렇게 해놧죠
    const equippedWeapon = equipments.weapon;
    const isEquippedWeaponSwitchable = equippedWeapon.item !== Items.none && equippedWeapon.item !== Items.punch;
    if (isEquippedWeaponSwitchable) [items[items.indexOf(entity)], equipments.weapon] = [equipments.weapon, entity];
    else {
      equipments.weapon = entity;
      items.splice(items.indexOf(entity), 1);
    }
  }
}
