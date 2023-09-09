import Discord from "discord.js";
import * as Discordx from "discordx";

@Discordx.Discord()
export default class GeneralComponents {
  @Discordx.ButtonComponent({ id: "closebutton" })
  handler(interaction: Discord.ButtonInteraction) {
    interaction.message.delete();
  }
}

export const CloseButtonComponent = withRowBuilder(
  new Discord.ButtonBuilder({
    custom_id: "closebutton",
    label: "Close",
    style: Discord.ButtonStyle.Danger,
  }),
);

function withRowBuilder<T extends Discord.MessageActionRowComponentBuilder>(
  component: T,
): T & { Row: Discord.ActionRowBuilder<T> } {
  return Object.assign(component, {
    Row: new Discord.ActionRowBuilder<T>().addComponents(component),
  });
}
