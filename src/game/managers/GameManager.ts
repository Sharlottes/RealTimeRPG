import Manager, { ManagerConstructOptions } from "@/game/managers/Manager";
import { ActionRowBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import ButtonComponent from "@/command/components/ButtonComponent";
import { ignoreInteraction } from "@/utils/functions";
import Events from "@/game/contents/Events";
import bundle from "@/assets/Bundle";
import Canvas from "@/utils/Canvas";

import ParentManager from "./ParentManager";
import User from "../User";

/**
 * 이벤트 관리 클래스
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
    this.mainEmbed = new EmbedBuilder().setTitle(this.user.name).setFields({
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
    });

    this.setEmbeds(this.mainEmbed);

    this.addComponents(
      new ActionRowBuilder<ButtonComponent>().setComponents(
        ButtonComponent.createByInteraction(this.interaction, "walk", (interaction) => {
          Events.events[1].start(this, interaction);
          // getOne(Events.events).start(this, interaction);
        }),
        ButtonComponent.createByInteraction(
          this.interaction,
          "exit",
          (interaction) => {
            ignoreInteraction(interaction);
            this.remove();
            this.gameThread.delete();
          },
          { style: ButtonStyle.Secondary },
        ),
      ),
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
