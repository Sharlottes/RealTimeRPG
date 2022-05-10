export * from "./contents/Content";
export * from "./UnitEntity";
export * from "./ItemEntity";
export * from "./ItemStack";
export { default as Vars } from "../Vars";
export { default as ExchangeManager } from "./ExchangeManager";
export { default as BattleManager } from "./BattleManager";
export { default as CommandManager } from "./CommandManager";

import { Items, Units, Vars, CommandManager } from '.';
import { User } from '../modules';
import { Utils } from '../util';
import { Rationess, Message, UserSave } from '../@type';


const { Database } = Utils;

/**
 * init the game. called once when discord bot is rebooted
 */
export function init() {
	Vars.users.forEach(u=>u.init());
	Items.init();
	Units.init();
	CommandManager.init();
}

/**
 * @param {array} arr 값을 뽑을 배열
 * @returns {T} arr 배열에서 특정 비율 기반의 랜덤으로 인수 하나를 뽑아 반환
 */
export function getOne<T extends Rationess>(arr: T[], callback?: (arg: T, index: number)=>void): T {
	let random = Math.random();
	const total = arr.reduce((a, e) => a + e.ratio, 0);
	for (const i in arr) {
		random -= arr[i].ratio / total;
		if (random < 0) {
			if(callback) callback(arr[i], parseInt(i));
			return arr[i];
		}
	}
	if(callback) callback(arr[0], 0);
	return arr[0];
}

/**
 * latestMsgs 배열에서 해당 유저의 최근 메시지를 찾습니다.
 * @param {User} user 최근 메시지를 보낸 유저
 * @returns {Message} 해당 유저의 최근 메시지
 */
export function findMessage(user: User): Message {
	const msg = Vars.latestMsg.get(user);
	if(msg) return msg;
	throw new Error('message is undefined');
}

export function save() {
	const saves: UserSave[] = [];
	Vars.users.forEach((user) => {
		if (user.exp >= user.level ** 2 * 50) {
			user.levelup();
		}

		saves.push(user.save());
	});

	Database.writeObject('./Database/user_data', saves);
}

//update
setInterval(() => {
	Vars.users.forEach(u => u.update());
}, 10);

//autosave
setInterval(save, 1000);