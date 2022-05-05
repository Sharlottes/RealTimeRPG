import { CommandInteraction, MessageActionRow, MessageButton } from 'discord.js';
import { PagesBuilder } from 'discord.js-pages';

export class BaseEmbed extends PagesBuilder {
    constructor(interaction: CommandInteraction) {
      super(interaction);

      //remove useless buttons
      this.setDefaultButtons([]);
      this.addComponents(new MessageActionRow().addComponents([
        new MessageButton().setCustomId('remove_embed').setLabel('Cancel').setStyle('SECONDARY')
      ])).addTriggers({
        name: 'remove_embed',
        callback: (interaction, componenets) => {
          this.interaction.deleteReply().catch(() => null);
        }
      })
    }
}