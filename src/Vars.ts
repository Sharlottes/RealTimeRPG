import { User } from './modules';
import { LatestMsg } from '@뇌절봇/@type';
import { Utils } from './util';
import { UserSave } from './@type/index';

namespace Vars {
  export const prefix = '/';
  export let users: User[] = [];
  export const latestMsgs: LatestMsg[] = [];

  export function init() {
    users = Utils.Database.readObject<UserSave[]>('./Database/user_data').map(User.with);
  }
}

export default Vars; 