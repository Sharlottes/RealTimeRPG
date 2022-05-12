import { Message, UserSave } from '@RTTRPG/@type';
import { User } from '@RTTRPG/game';
import { Utils } from '@RTTRPG/util';

namespace Vars {
  export const prefix = '/';
  export let users: User[] = [];
  export const latestMsg: Map<User, Message> = new Map();

  export function init() {
    users = Utils.Database.readObject<UserSave[]>('./Database/user_data').map(User.with);
  }
}

export default Vars; 