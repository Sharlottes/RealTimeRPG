import { ButtonBuilder } from "discord.js";
import { client } from "@/index";

export default class ButtonComponent extends ButtonBuilder {
  private readonly onClick?: (interaction: Discord.ButtonInteraction) => unknown;
  private readonly customId: string;

  constructor(
    data: Partial<Discord.InteractionButtonComponentData> & {
      onClick?: (interaction: Discord.ButtonInteraction) => unknown;
      customId: string;
    },
  ) {
    super({ ...data });
    this.onClick = data.onClick;
    this.customId = data.customId;

    client.interactionEvent.on((interaction) => this.handleClick(interaction));
  }

  private handleClick(interaction: Discord.BaseInteraction) {
    if (!this.onClick) return;
    if (!(interaction.isButton() && interaction.customId === this.customId)) return;

    this.onClick(interaction);
  }
}
