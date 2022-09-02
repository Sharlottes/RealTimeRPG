import { ManagerConstructOptions } from "@RTTRPG/@type";
import { bundle } from "@RTTRPG/assets";
import { MessageEmbed, MessageActionRow, MessageButton } from "discord.js";
import Manager from "./Manager";

export default class ActionQueueManager extends Manager {
	private readonly actionQueue: BaseAction[] = [];
    constructor(options: ManagerConstructOptions) {
        super(options);

        this.embeds = [
					new MessageEmbed()
						.setTitle('Action Queue')
						.setDescription("Empty")
				]
        this.components = [
					new MessageActionRow()
						.addComponents([
							new MessageButton()
									.setCustomId('remove')
									.setLabel(bundle.find(this.locale, 'select.undo'))
									.setStyle('DANGER')
									.setDisabled(true)
							])
				]
        this.triggers.set('remove', (interaction, manager) => {
            this.actionQueue.pop()?.undo();
            if (this.actionQueue.length == 0 && interaction.component.type == "BUTTON") interaction.component.setDisabled(true);
            this.embeds[0].setDescription(this.actionQueue.map<string>(a => a.description()).join('```\n```\n'));
            this.send();
        });
    }
}