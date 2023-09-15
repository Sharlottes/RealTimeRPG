import ButtonComponent from "@/command/components/ButtonComponent";
import { ActionRowBuilder, ButtonStyle } from "discord.js";
import { ignoreInteraction } from "@/utils/functions";

import Manager, { ManagerConstructOptions } from "./Manager";

export default class ParentManager extends Manager {
  constructor(
    public readonly parentManager: Manager,
    params: ManagerConstructOptions,
  ) {
    super(params);
  }

  public addBackButton(): this {
    this.addComponents(
      new ActionRowBuilder<ButtonComponent>().addComponents(
        ButtonComponent.createByInteraction(
          this.interaction,
          "back_select",
          (interaction) => {
            ignoreInteraction(interaction);
            this.collector?.stop();
            this.parentManager.update();
          },
          { style: ButtonStyle.Secondary },
        ),
      ),
    );

    return this;
  }
}
