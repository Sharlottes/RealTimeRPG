import { bundle } from "@RTTRPG/assets";
import Random from "random";
import { getOne } from "..";
import EncounterManager from "../managers/EncounterManager";
import UnitEntity from "../UnitEntity";
import Items from "./Items";
import Units from "./Units";
import Event from './types/BaseEvent';

export default class Events {
    static readonly events: Event[] = [];
    
	public static init() {
        this.events.length = 0;

        this.events.push(new Event(15, (user, interaction) => {
			const money = 2 + Math.floor(Math.random() * 10);
			user.money += money;
			interaction.followUp(bundle.format(user.locale, 'event.money', money));
		}));

		this.events.push(new Event(10, (user, interaction) => {
			const item = getOne(Items.items.filter((i) => i.dropOnWalk));
			user.giveItem(item);
			interaction.followUp(`${bundle.format(user.locale, 'event.item', item.localName(user))}`);
		}));

		this.events.push(new Event(12225, (user, interaction) => {
			EncounterManager.start<typeof EncounterManager>({
				user: user,
				interaction: interaction, 
				target: new UnitEntity(Units.find(Random.int(0, Units.units.length - 1))),
				update: true
			});
		}));
    }
}