import Discord, {
  Message,
  CacheType,
  ActionRowBuilder,
  MessageComponentInteraction,
  ActionRowBuilderComponent,
} from "discord.js";

import { StatusEntity, User, Inventory } from "game";
import StatusEffect from "game/contents/StatusEffect";
import { WeaponEntity } from "game/Inventory";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_TOKEN: string;
    }
  }
}

export interface Heathy {
  health: number;
  health_max: number;
}

export interface Energy {
  energy: number;
  energy_max: number;
}

export interface Durable {
  durability: number;
}

export type Stat = {
  strength: number;
  defense: number;
} & Heathy &
  Energy;

export type Message = {
  interaction: Discord.ChatInputCommandInteraction<CacheType>;
  sender: User;
};

export type CommandInfo = {
  id: string;
  application_id: string;
  version: string;
  default_permissions: null;
  type: number;
  name: string;
  description: string;
  guild_id: string;
};

export type ContentData = {
  name: string;
  description: string;
  details: string;
};

export interface Dropable {
  dropOnWalk?: boolean;
  dropOnShop?: boolean;
  dropOnBattle?: boolean;
}

export interface Rationess {
  ratio: number;
}

export type ItemData = Rationess & Dropable;

export type UnitData = {
  name: string;
  level: number;
  inventory?: Inventory;
  stats: Stat;
} & Rationess;

export type InventoryJSONdata = {
  items: {
    type: string;
    item: number;
    durability?: number;
    cooldown?: number;
    amount?: number;
    ammos?: number[];
  }[];
  equipments: {
    weapon?: {
      type: string;
      item: number;
      durability: number;
      cooldown: number;
      ammos?: number[];
    };
    shield?: {
      type: string;
      item: number;
      durability: number;
    };
  };
};

export type EventTrigger = (
  user: User,
  components: ActionRowBuilder[],
  interactionCallback: MessageComponentInteraction,
  currentRow: ActionRowBuilderComponent
) => void;

export type EventSelection = {
  readonly name: string;
  readonly type: "button" | "select";
  readonly callback: EventTrigger;
  readonly options?: InteractionButtonOptions | MessageSelectMenuOptions;
};

export type CommandCategory = "guild" | "global";

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
