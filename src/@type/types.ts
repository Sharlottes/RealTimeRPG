import { WeaponEntity } from "game/Inventory";
import { StatusEntity, User, Inventory } from "game";
import StatusEffect from "game/contents/types/StatusEffect";

export type EventTrigger = (
  user: User,
  components: Discord.ActionRowBuilder[],
  interactionCallback: Discord.MessageComponentInteraction,
  currentRow: ActionRowBuilderComponent
) => void;

export type EventSelection = {
  readonly name: string;
  readonly type: "button" | "select";
  readonly callback: EventTrigger;
  readonly options?: InteractionButtonOptions | MessageSelectMenuOptions;
};

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
