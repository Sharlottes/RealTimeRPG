import { User } from './modules';
import { LatestMsg } from '@뇌절봇/@type';
import { Utils } from './util';

namespace Vars {
  export const prefix = '/';
  export const users: User[] = Utils.Database.readObject<Array<User>>('./Database/user_data').map(u=>Object.assign(new User(u), u));
  export const latestMsgs: LatestMsg[] = [];
}

export default Vars;