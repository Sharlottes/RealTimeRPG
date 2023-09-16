import Manager, { ManagerConstructOptions } from "@/game/managers/Manager";
import ButtonComponent from "@/command/components/ButtonComponent";
import ExchangeManager from "@/game/managers/ExchangeManager";
import { EmbedBuilder, ActionRowBuilder } from "discord.js";
import BattleManager from "@/game/managers/BattleManager";
import { ignoreInteraction } from "@/utils/functions";
import bundle from "@/assets/Bundle";
import Mathf from "@/utils/Mathf";
import Random from "random";

import ParentManager from "./ParentManager";
import UnitEntity from "../UnitEntity";
import User from "../User";

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
    this.mainEmbed = new EmbedBuilder({ title: bundle.find(this.locale, `event.${this.target.type.name}`) });
    this.updateMessageData({
      embeds: [this.mainEmbed],
      components: [
        new ActionRowBuilder<ButtonComponent>().setComponents(
          ButtonComponent.createByInteraction(this.interaction, "battle", (interaction) => {
            ignoreInteraction(interaction);
            this.remove();
            new BattleManager(this, {
              user: this.user,
              interaction: this.interaction,
              enemy: this.target,
            }).send(this.user.gameManager?.gameThread);
          }),
          ButtonComponent.createByInteraction(this.interaction, "battle", (interaction) => {
            ignoreInteraction(interaction);
            this.remove();
            new BattleManager(this, {
              user: this.user,
              interaction: this.interaction,
              enemy: this.target,
            }).send(this.user.gameManager?.gameThread);
          }),
          ButtonComponent.createByInteraction(this.interaction, "run", async (interaction) => {
            ignoreInteraction(interaction);
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
            await this.update();
            this.endManager();
          }),

          ...(this.target.id == 1
            ? [
                ButtonComponent.createByInteraction(this.interaction, "talking", async (interaction) => {
                  ignoreInteraction(interaction);
                  const money = Math.floor(Mathf.range(2, 5));
                  this.user.money -= money;
                  this.mainEmbed.addFields({
                    name: "Result:",
                    value: "```\n" + bundle.format(this.user.locale, "event.goblin_talking", money) + "\n```",
                  });
                  await this.update();
                  this.endManager();
                }),
                ButtonComponent.createByInteraction(this.interaction, "exchange", async (interaction) => {
                  ignoreInteraction(interaction);
                  await new ExchangeManager(this, {
                    user: this.user,
                    interaction: this.interaction,
                    target: this.target,
                  }).send(this.user.gameManager?.gameThread);
                }),
              ]
            : []),
        ),
      ],
    });
  }
}
