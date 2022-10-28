export { default as UnitEntity } from "./UnitEntity";
export { default as StatusEntity } from "./StatusEntity";
export { default as BaseEvent } from "./contents/types/BaseEvent";
export { default as User } from "./User";
export { default as Inventory } from "./Inventory";
export * from "./Inventory";

import { Rationess, Message, UserSave } from '@type';
import CommandManager from 'game/managers/CommandManager';
import { Items, Units, StatusEffects } from "game/contents";
import { Database } from 'utils';
import Vars from "Vars";
import Events from "./contents/Events";

export function init() {
	StatusEffects.init();
	Items.init();
	Units.init();
	Events.init();
	CommandManager.init();
}

/**
 * @param arr 값을 뽑을 배열
 * @returns arr 배열에서 특정 비율 기반의 랜덤으로 인수 하나를 뽑아 반환
 */
export function getOne<T extends Rationess>(arr: T[]): T {
	let random = Math.random();
	const total = arr.reduce((a, e) => a + e.ratio, 0);
	for (const i in arr) {
		random -= arr[i].ratio / total;
		if (random < 0) {
			return arr[i];
		}
	}
	return arr[0];
}

//autosave
setInterval(() => {
	const saves: UserSave[] = [];
	for (let i = 0; i < Vars.users.length; i++) {
		const user = Vars.users[i];
		if (user.exp >= user.level ** 2 * 50) {
			user.levelup();
		}

		saves.push(user.save());
	}

	Database.writeObject('./Database/user_data', saves);
}, 1000);