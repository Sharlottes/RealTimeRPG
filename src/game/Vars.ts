import { User } from '../modules';
import { LatestMsg } from '@뇌절봇/@type';
import { read } from './rpg_';

namespace Vars {
  export const prefix = '/';
  export const users: User[] = read();
  export const latestMsgs: LatestMsg[] = [];
}
//smthsmthsdsadsdasdasdasdsadasdasd
export default Vars;