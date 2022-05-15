import { bundle } from "@RTTRPG/assets";
import { User } from "..";


export default class Buff {
	readonly value: number;
	readonly localName: (user: User) => string;
	readonly callback: (user: User, amount: number, buff: Buff) => string;

	constructor(
		value: number,
		name: string,
		callback: (user: User, amount: number, buff: Buff) => string
	) {
		this.value = value;
		
		this.localName = (user: User)=>bundle.find(user.locale, `buff.${name}.name`);
		this.callback = callback;
	}

	buff(user: User, amount: number) {
		return this.callback(user, amount, this);
	}
}