import { Message, UserSave } from '@RTTRPG/@type';
import { User } from '@RTTRPG/game';
import { Database } from '@RTTRPG/util';
import { Snowflake } from 'discord-api-types';

namespace Vars {
  export let users: User[] = [];
  export const messageCache: Map<Snowflake, Message> = new Map();

  export function init() {
    users = Database.readObject<UserSave[]>('./Database/user_data').map(User.with);
  }
}

export default Vars; 