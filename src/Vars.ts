import type User from "@/game/User";

export default class Vars {
  public static userRegistry: Record<string | Discord.Snowflake, User> = {};
}
