import { Durable, EntityI } from "@RTTRPG/@type";
import { bundle } from "@RTTRPG/assets";
import { WeaponEntity } from "@RTTRPG/game/Inventory";
import { BaseEmbed } from "@RTTRPG/modules";
import { CommandInteraction } from "discord.js";
import Random from "random";
import { ItemTag } from ".";
import { Item } from "..";
import StatusEffect from "../StatusEffect";

export default class WeaponTag extends ItemTag {
	readonly damage: number;
	readonly cooldown: number;
	readonly critical_ratio: number;
	readonly critical_chance: number;
  readonly durability: number;
	readonly status?: StatusEffect;

	constructor(item: Item, data: Durable & {
    damage: number,
		cooldown: number,
		critical_ratio: number,
		critical_chance: number,
		status?: StatusEffect
  }) {
		super(item);
		this.damage = data.damage;
		this.cooldown = data.cooldown;
		this.critical_chance = data.critical_chance;
		this.critical_ratio = data.critical_ratio;
		this.durability = data.durability;
		this.status = data.status;
	}
  
	public attack(target: EntityI, entity: WeaponEntity, locale: string) {
		const critical = Random.float(0, 1) < this.critical_chance;
		const stat = target.stats;
		const damage = this.damage + (critical ? this.critical_ratio * this.damage : 0);

		if(this.status) target.applyStatus(this.status);
		
		return bundle.format(locale, 'battle.hit',
			critical ? bundle.find(locale, 'battle.critical') : '',
			typeof target.name !== 'string'?target.name(locale):target.name, //target's
			damage, //damaged
			this.item.localName(locale), //by weapon
			stat.health, //before hp
			(stat.health -= damage) //after hp
		);
	}

  
	public async showInfo(interaction: CommandInteraction) {
		await new BaseEmbed(interaction)
			.setTitle(this.item.localName(interaction.locale))
			.setAuthor({name: interaction.user.username, iconURL: interaction.user.displayAvatarURL(), url: interaction.user.displayAvatarURL()})
			.addFields( 
				{ name: 'critical', value: `${(this.critical_ratio * 100)}% damages in ${(this.critical_chance * 100)} chance`},
				{ name: 'damage', value: this.damage.toString(), inline: true},
				{ name: 'cooldown', value: this.cooldown.toString(), inline: true},
			)
			.build();
	}
}