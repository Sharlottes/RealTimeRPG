import { ignoreInteraction } from "@/utils/functions";
import { ButtonStyle } from "discord.js";

import Manager, { ManagerConstructOptions } from "./Manager";

export default class ParentManager extends Manager {
  constructor(
    public readonly parentManager: Manager,
    params: ManagerConstructOptions,
  ) {
    super(params);
  }

  public addBackButton(): this {
    this.addButtonSelection(
      "back_select",
      0,
      (interaction) => {
        ignoreInteraction(interaction);
        this.collector?.stop();
        this.parentManager.update();
      },
      { style: ButtonStyle.Secondary },
    );

    return this;
  }
}
