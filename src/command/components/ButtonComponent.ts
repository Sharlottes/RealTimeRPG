import { ButtonBuilder, ButtonStyle } from "discord.js";
import Bundle from "@/assets/Bundle";

export default class ButtonComponent extends ButtonBuilder implements Interactive<Discord.ComponentType.Button> {
  private readonly onClick: (interaction: Discord.ButtonInteraction) => unknown;

  constructor(
    data: Partial<Discord.InteractionButtonComponentData> & {
      onClick: (interaction: Discord.ButtonInteraction) => unknown;
      customId: string;
    },
  ) {
    super({ ...data });
    this.onClick = data.onClick;
  }

  public handleInteraction(interaction: Discord.ButtonInteraction) {
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
