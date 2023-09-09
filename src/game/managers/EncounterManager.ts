import Random from "random";

import BattleManager from "@/game/managers/BattleManager";
import ExchangeManager from "@/game/managers/ExchangeManager";
import Manager, { ManagerConstructOptions } from "@/game/managers/Manager";
import { UnitEntity, User } from "@/game";
import bundle from "@/assets/Bundle";
import { Mathf } from "@/utils";
import { EmbedBuilder } from "discord.js";
import ParentManager from "./ParentManager";

export default class EncounterManager extends ParentManager {
  private readonly user: User;
  private readonly target: UnitEntity;
  private readonly mainEmbed: EmbedBuilder;

  public constructor(
    parentManager: Manager,
    { target, user, ...options }: ManagerConstructOptions & { target: UnitEntity; user: User },
  ) {
    super(parentManager, options);
    this.user = user;
    this.target = target;
    this.mainEmbed = new EmbedBuilder().setTitle(bundle.find(this.locale, `event.${this.target.type.name}`));

    this.setEmbeds(this.mainEmbed)
      .addButtonSelection("battle", 0, () =>
        new BattleManager(this, {
          user: this.user,
          interaction: this.interaction,
          enemy: this.target,
          // EncounterManager의 interaction은 playground인 thread가 아님
        }).update({ updateParent: true }),
      )
      .addButtonSelection("run", 0, () => {
        if (Random.boolean()) {
          const money = Math.floor(Mathf.range(2, 10));
          this.user.money -= money;
          this.mainEmbed.addFields({
            name: "Result:",
            value: "```\n" + bundle.format(this.user.locale, "event.goblin_run_failed", money) + "\n```",
          });
        } else {
          this.mainEmbed.addFields({
            name: "Result:",
            value: "```\n" + bundle.find(this.user.locale, "event.goblin_run_success") + "\n```",
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
          value: "```\n" + bundle.format(this.user.locale, "event.goblin_talking", money) + "\n```",
        });
        this.endManager();
      }).addButtonSelection("exchange", 0, async () => {
        await new ExchangeManager(this, {
          user: this.user,
          interaction: this.interaction,
          target: this.target,
        }).update();
      });
    }
  }
}
