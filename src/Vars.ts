import { UserSave } from "@type";
import { User } from "game";
import { Database } from "utils";

export default class Vars {
  public static users: User[] = [];

  public static init(): void {
    Vars.users = (
      Database.readObject<UserSave[]>("./Database/user_data") || []
    ).map((data) => new User(data));
  }
}
