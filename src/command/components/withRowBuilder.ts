import { ActionRowBuilder } from "discord.js";

function withRowBuilder<T extends Discord.MessageActionRowComponentBuilder>(
  component: T,
): T & { Row: Discord.ActionRowBuilder<T> } {
  return Object.assign(component, {
    Row: new ActionRowBuilder<T>().addComponents(component),
  });
}

export default withRowBuilder;
