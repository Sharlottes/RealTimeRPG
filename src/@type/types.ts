import StatusEffect from "@/game/contents/types/StatusEffect";
import Inventory, { WeaponEntity } from "@/game/Inventory";
import StatusEntity from "@/game/StatusEntity";

export type UnitData = {
  name: string;
  level: number;
  inventory?: Inventory;
  stats: Stat;
} & Rationess;

export interface EntityI extends StatusI {
  readonly id: number | string;
  readonly stats: Stat;
  readonly inventory: Inventory;
  readonly name: string | ((locale: string) => string);
  exp: number;
  level: number;
  money: number;
  switchWeapon: (weapon: WeaponEntity) => void;
}

export interface StatusI {
  readonly statuses: Array<StatusEntity>;
  applyStatus: (status: StatusEffect) => void;
  removeStatus: (status: StatusEffect) => void;
}
