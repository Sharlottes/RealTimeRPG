import { ClassMethodDecorator, GuardFunction } from "discordx";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string;
      OWNER_ID: string;
    }
  }
}

declare module "discordx" {
  export function Guard(...fns: GuardFunction[]): ClassMethodDecorator;
}

export {};
