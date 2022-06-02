import { Message, UserSave } from '@RTTRPG/@type';
import { User } from '@RTTRPG/game';
import { Database } from '@RTTRPG/util';
import { Snowflake } from 'discord-api-types';

export default class Vars {
  public static users: User[] = [];
  public static messageCache: Map<Snowflake, Message> = new Map();

  public static init(): void {
    Vars.users = Database.readObject<UserSave[]>('./Database/user_data').map(data=>new User(data));
  }
}