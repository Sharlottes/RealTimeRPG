import { bundle } from "assets";
import { User } from "..";

export default class Content {
	readonly name: string;
	readonly localName: (user: User|string)=>string;
	readonly description: (user: User|string)=>string;
	readonly details: (user: User|string)=>string;

	constructor(name: string, type = 'other') {
		this.name = name;
		this.localName = (user: User|string)=>bundle.find(typeof user === 'string' ? user : user.locale, `content.${type}.${name}.name`);
		this.description = (user: User|string)=>bundle.find(typeof user === 'string' ? user : user.locale, `content.${type}.${name}.description`);
		this.details = (user: User|string)=>bundle.find(typeof user === 'string' ? user : user.locale, `content.${type}.${name}.details`);
	}
}