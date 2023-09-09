import GameManager from "@/game/managers/GameManager";
import { ClassMethodDecorator, GuardFunction } from "discordx";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string;
      OWNER_ID: string;
      TEST_GUILD_ID: string;
    }
  }

  interface GameEvent {
    start: (gameManager: GameManager, interaction: Discord.BaseInteraction) => void;
    ratio: number;
    only?: boolean;
  }
}

declare module "discordx" {
  export function Guard(...fns: GuardFunction[]): ClassMethodDecorator;
}

export {};
