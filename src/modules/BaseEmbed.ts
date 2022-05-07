import { CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { PagesBuilder } from 'discord.js-pages';
import Assets from '../assets';

const Bundle = Assets.bundle;

export class BaseEmbed extends PagesBuilder {
  constructor(interaction: CommandInteraction) {
    super(interaction);

    //remove useless buttons
    this.setPages(new MessageEmbed());
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

  public addDescription(description: string, type = '', codeblock = true) {
    if(codeblock) description = "```"+type+"\n"+description+"\n```";
    this.setDescription(`${this.description}\n${description}`);
  }
}
