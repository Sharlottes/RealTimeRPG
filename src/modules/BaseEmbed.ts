import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { PagesBuilder } from 'discord.js-pages';

export class BaseEmbed extends PagesBuilder {
  constructor(interaction: CommandInteraction, removeable = true) {
    super(interaction);

    //remove useless buttons
    this.setPages(new MessageEmbed());
    this.setDefaultButtons([]);
    if(removeable) {
      this.addComponents(new MessageActionRow().addComponents([
        new MessageButton().setCustomId('remove_embed').setLabel('Cancel').setStyle('SECONDARY')
      ])).addTriggers({ 
        name: 'remove_embed',
        callback: ()=>this.remove()
      })
    }
  }
  
  public remove() {
    setTimeout(()=>(this['message'] as Message).delete().catch(console.log), 100);
  }

 
  public override setDescription(description: string, type = '', codeblock = true) {
    if(codeblock) description = "```"+type+"\n"+description+"\n```";
    return super.setDescription(description);
  }
  
  public addDescription(description: string, type = '', codeblock = true) {
    if(codeblock) description = "```"+type+"\n"+description+"\n```";
    super.setDescription(`${this.description}\n${description}`);
  }

  public getComponents(): MessageActionRow[] { 
    return this['components'];
  };
}
