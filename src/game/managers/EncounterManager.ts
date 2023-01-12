import Random from "random";

import BattleManager from "game/managers/BattleManager";
import ExchangeManager from "game/managers/ExchangeManager";
import Manager, { ManagerConstructOptions } from "game/managers/Manager";
import { UnitEntity, User } from "game";
import { bundle } from "assets";
import { Mathf } from "utils";
import { EmbedBuilder } from "discord.js";

export default class EncounterManager extends Manager {
  private readonly user: User;
  private readonly target: UnitEntity;
  private readonly mainEmbed: EmbedBuilder;

  public constructor(
    options: ManagerConstructOptions & { target: UnitEntity; user: User }
  ) {
    super(options);
    this.user = options.user;
    this.target = options.target;
    this.mainEmbed = new EmbedBuilder().setTitle(
      bundle.find(this.locale, `event.${this.target.type.name}`)
    );

    this.setEmbeds(this.mainEmbed)
      .addButtonSelection("battle", 0, () =>
        new BattleManager({
          user: this.user,
          interaction: this.interaction,
          enemy: this.target,
        }).update()
      )
      .addButtonSelection("run", 0, () => {
        if (Random.boolean()) {
          const money = Math.floor(Mathf.range(2, 10));
          this.user.money -= money;
          this.mainEmbed.addFields({
            name: "Result:",
            value:
              "```\n" +
              bundle.format(
                this.user.locale,
                "event.goblin_run_failed",
                money
              ) +
              "\n```",
          });
        } else {
          this.mainEmbed.addFields({
            name: "Result:",
            value:
              "```\n" +
              bundle.find(this.user.locale, "event.goblin_run_success") +
              "\n```",
          });
        }
        this.endManager();
      });

    if (this.target.id == 1) {
      this.addButtonSelection("talking", 0, () => {
        const money = Math.floor(Mathf.range(2, 5));
        this.user.money -= money;
        this.mainEmbed.addFields({
          name: "Result:",
          value:
            "```\n" +
            bundle.format(this.user.locale, "event.goblin_talking", money) +
            "\n```",
        });
        this.endManager();
      }).addButtonSelection("exchange", 0, async () => {
        await new ExchangeManager({
          user: this.user,
          interaction: this.interaction,
          target: this.target,
        }).update();
      });
    }
  }
}
