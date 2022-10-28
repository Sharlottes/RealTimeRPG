import { bundle } from "assets";
import { User } from "..";
import { EntityI } from '../../@type/index';


export default class Buff {
	readonly value: number;
	readonly localName: (user: User|string) => string;
	readonly callback: (owner: EntityI, amount: number, buff: Buff) => void;
	readonly description: (owner: EntityI, amount: number, buff: Buff, locale: string) => string;

	constructor(
		value: number,
		name: string,
		callback: (owner: EntityI, amount: number, buff: Buff) => void,
		description: (owner: EntityI, amount: number, buff: Buff, locale: string) => string
	) {
		this.value = value;
		
		this.localName = (user: User|string) => bundle.find(typeof user === 'string' ? user : user.locale, `buff.${name}.name`);
		this.callback = callback;
		this.description = description;
	}

	buff(owner: EntityI, amount: number) {
		return this.callback(owner, amount, this);
	}
}