import { ButtonBuilder, ButtonStyle } from "discord.js";
import Bundle from "@/assets/Bundle";
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

  public static createByInteraction(
    interaction: Discord.BaseInteraction,
    name: string,
    callback: (interaction: Discord.ButtonInteraction) => unknown,
    options: Partial<Omit<ConstructorParameters<typeof ButtonComponent>[0], "label" | "customId">> = {
      style: ButtonStyle.Primary,
    },
  ) {
    return new ButtonComponent({
      onClick: callback,
      customId: name + interaction.id,
      label: Bundle.find(interaction.locale, `select.${name}`),
      ...options,
    });
  }
}
