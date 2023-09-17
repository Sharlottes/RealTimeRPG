import { CloseButtonComponent } from "@/command/components/GeneralComponents";
import { EmbedBuilder } from "discord.js";

import Manager from "./Manager";

export default class AlertManager extends Manager {
  constructor(interaction: Discord.BaseInteraction, title: string, description: string) {
    super({
      interaction,
      embeds: [new EmbedBuilder({ title, description })],
      components: [CloseButtonComponent.Row],
    });
  }
}
