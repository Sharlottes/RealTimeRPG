import bundle from "@/assets/Bundle";
import { BaseInteraction, ButtonStyle, codeBlock, EmbedBuilder } from "discord.js";
import User from "../User";
import Manager, { ManagerConstructOptions } from "@/game/managers/Manager";
import { getOne } from "@/utils/getOne";
import Events from "@/game/contents/Events";
import { Canvas } from "@/utils";
import ParentManager from "./ParentManager";

/**
 * 이벤트 관리 클래스, user에 종속됨
 */
export default class GameManager extends Manager {
  public readonly mainEmbed: EmbedBuilder;

  constructor(
    public readonly user: User,
    public readonly gameThread: Discord.PublicThreadChannel,
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
        getOne(Events.events).start(this, interaction);
      })
      .addButtonSelection(
        "exit",
        0,
        () => {
          this.remove();
          this.gameThread.delete();
        },
        { style: ButtonStyle.Secondary },
      );
  }

  /**
   * user가 없을 때 manager 참조 노드를 거슬러 올라가 gameManager를 찾습니다.
   *
   * **확실할 때 쓰세요**
   *
   * @return {GameManager} 터질지 안터질지 모르는 GameManager
   */
  public static findGameManager(manager: ParentManager): GameManager {
    if (manager instanceof GameManager) return manager;
    else if ("user" in manager && manager.user instanceof User) {
      if (manager.user.gameManager) return manager.user.gameManager;
      else throw new Error("user doesn't have gameManager");
    } else if (manager.parentManager instanceof ParentManager) return this.findGameManager(manager.parentManager);
    else throw new Error("your manager doesn't have either parent or game manager");
  }
}
