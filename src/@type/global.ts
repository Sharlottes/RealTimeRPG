interface Heathy {
  health: number;
  health_max: number;
}

interface Energy {
  energy: number;
  energy_max: number;
}

interface Durable {
  durability: number;
}

interface Rationess {
  ratio: number;
}

interface Dropable {
  dropOnWalk?: boolean;
  dropOnShop?: boolean;
  dropOnBattle?: boolean;
}

interface ContentData {
  name: string;
  description: string;
  details: string;
}

type Stat = {
  strength: number;
  defense: number;
} & Heathy &
  Energy;

type ItemData = Rationess & Dropable;

type CommandInfo = {
  id: string;
  application_id: string;
  version: string;
  default_permissions: null;
  type: number;
  name: string;
  description: string;
  guild_id: string;
};

type InventoryJSONdata = {
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

type CommandCategory = "guild" | "global";
type Message = {
  interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>;
  sender: Discord.User;
};
