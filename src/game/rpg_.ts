import { User } from '../modules';
import { Utils } from '../util';
import { Items, Units, Vars } from '.';
import { LatestMsg, Rationess, Message } from '@뇌절봇/@type';
import CommandManager from './CommandManager';

const { Database } = Utils;

/**
 * init the game. called once when discord bot is rebooted
 */
export function init() {
	Vars.users.forEach(u=>u.init());
	Items.init();
	Units.init();
	CommandManager.init();

	console.log('init done');
}

/**
 * @param {array} arr 값을 뽑을 배열
 * @returns arr 배열에서 특정 비율 기반의 랜덤으로 인수 하나를 뽑아 반환
 */
export function getOne<T extends Rationess>(arr: T[]): T {
	let random = Math.random();
	const total = arr.reduce((a, e) => a + e.getRatio(), 0);
	for (const i in arr) {
		random -= arr[i].getRatio() / total;
		if (random < 0) return arr[i];
	}
	return arr[0];
}

/**
 * latestMsgs 배열에서 특정 조건에 부합하는 메시지를 찾습니다. 
 * 검색 인자에 적합한 객체가 없을 경우 undefined를 반환합니다. 있을 경우 메시지를 반환합니다.
 * @param {User | string | (value: LatestMsg, index: number, obj: LatestMsg[])=>boolean} predicate 최근 메시지 배열에서 메시지를 찾을 기준
 * @returns {Message} 조건에 부합하는 가장 최근의 메시지 객체를 반환합니다.
 */
export function findMessage(predicate: (User | string | ((value: LatestMsg, index: number, obj: LatestMsg[])=>boolean))): Message | undefined {
	if(typeof(predicate) === "string") return Vars.latestMsgs.find((u) => u.user.id == predicate)?.msg;
	if(typeof(predicate) === "function") return Vars.latestMsgs.find(predicate)?.msg;
	else return Vars.latestMsgs.find(u=>u.user==predicate)?.msg;
}

export function read() {
	return Database.readObject<Array<User>>('./Database/user_data');
}

export function save() {
	Vars.users.forEach((user) => {
		if (user.exp >= user.level ** 2 * 50) {
			user.levelup();
		}
	});

	Database.writeObject('./Database/user_data', Vars.users.map(user=>{
		user.battleInterval = undefined;
		return user;
	}));
}

setInterval(() => {
	Vars.users.forEach(u => u.update());
}, 10);