import { bundle } from "@/assets";
import { BaseInteraction, ButtonStyle, codeBlock, EmbedBuilder, TextBasedChannel } from "discord.js";
import BaseEvent from "../contents/types/BaseEvent";
import User from "../User";
import Manager, { ManagerConstructOptions } from "@/game/managers/Manager";
import { getOne } from "@/utils/getOne";
import Events from "@/game/contents/Events";
import { Canvas } from "@/utils";

/**
 * 이벤트 관리 클래스, user에 종속됨
 */
export default class GameManager extends Manager {
  private readonly mainEmbed: EmbedBuilder;

  constructor(
    private readonly user: User,
    public readonly targetChannel: TextBasedChannel,
    options: ManagerConstructOptions,
  ) {
    super(options);
    this.user = user;
    this.mainEmbed = new EmbedBuilder()
      .setTitle(this.user.name)
      .setFields({
        name: this.user.name,
        value:
          `${bundle.find(this.locale, "health")}: ${Canvas.unicodeProgressBar(
            this.user.stats.health,
            this.user.stats.health_max,
            { showValue: true },
          )}\n` +
          `${bundle.find(this.locale, "energy")}: ${Canvas.unicodeProgressBar(
            this.user.stats.energy,
            this.user.stats.energy_max,
            { showValue: true },
          )}\n`,
      })
      .setDescription(this.user.alerts.map((alert) => `${codeBlock(alert.content)}`).join("\n") || null);

    this.user.on("alert", async (alert) => {
      this.mainEmbed.setDescription(this.user.alerts.map((alert) => `${codeBlock(alert.content)}`).join("\n"));
      if (alert.lifetime !== -1 && this.message) {
        const {
          embeds: [{ description: cache }],
        } = this.message;

        setTimeout(async () => {
          this.mainEmbed.setDescription(cache);
          await this.update();
        }, alert.lifetime);
      }
      await this.update();
    });

    this.setEmbeds(this.mainEmbed)
      .addButtonSelection("walk", 0, (interaction) => {
        user.gameManager?.startEvent(getOne(Events.events), interaction);
      })
      .addButtonSelection(
        "exit",
        0,
        () => {
          this.remove();
          this.targetChannel.delete();
          this.user.gameManager = undefined;
        },
        { style: ButtonStyle.Secondary },
      );
  }

  startEvent(event: BaseEvent, interaction: BaseInteraction) {
    event.start(this.user, interaction);
  }
}
