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