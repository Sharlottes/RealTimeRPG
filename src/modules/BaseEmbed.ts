import { CommandInteraction, MessageActionRow, MessageButton } from 'discord.js';
import { PagesBuilder } from 'discord.js-pages';
import Assets from '../assets';

const Bundle = Assets.bundle;

export class BaseEmbed extends PagesBuilder {
  constructor(interaction: CommandInteraction) {
    super(interaction);

    //remove useless buttons
    this.setDefaultButtons([]);
    this.addComponents(new MessageActionRow().addComponents([
      new MessageButton().setCustomId('remove_embed').setLabel('Cancel').setStyle('SECONDARY')
    ])).addTriggers({ 
      name: 'remove_embed',
      callback: (inter, componenets) => {
        setTimeout(()=>interaction.deleteReply().catch(e=>interaction.followUp(Bundle.format(interaction.locale, 'error.delete_message', e))), 1000);
      }
    }) 
  }
}