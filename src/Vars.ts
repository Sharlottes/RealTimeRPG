import { User } from './modules';
import { LatestMsg } from '@뇌절봇/@type';
import { Utils } from './util';
import { UserSave } from './@type/index';

namespace Vars {
  export const prefix = '/';
  export const users: User[] = Utils.Database.readObject<UserSave[]>('./Database/user_data').map(User.with);
  export const latestMsgs: LatestMsg[] = [];
}

export default Vars;