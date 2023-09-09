import Discord from "discord.js";
import * as Discordx from "discordx";

@Discordx.Discord()
export default abstract class GeneralComponents {
  @Discordx.On({ event: "interactionCreate" })
  async handle([interaction]: Discordx.ArgsOf<"interactionCreate">) {
    if (interaction.isButton() && interaction.customId == "closebutton") {
      await interaction.message.delete();
    }
  }
}

export const CloseButtonComponent = withRowBuilder(
  new Discord.ButtonBuilder({
    custom_id: "closebutton",
    label: "Close",
    style: Discord.ButtonStyle.Danger,
  })
);

function withRowBuilder<T extends Discord.MessageActionRowComponentBuilder>(
  component: T
): T & { Row: Discord.ActionRowBuilder<T> } {
  return Object.assign(component, {
    Row: new Discord.ActionRowBuilder<T>().addComponents(component),
  });
}
