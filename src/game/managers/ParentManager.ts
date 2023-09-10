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
      () => {
        this.collector?.stop();
        this.parentManager.update();
      },
      { style: ButtonStyle.Secondary },
    );

    return this;
  }

  /**
   * @param {boolean} updateParent 자신이 아니라 부모를 업데이트합니다.
   */
  public override async update(
    { updateParent = false, ...option }: { updateParent?: boolean } & Discord.BaseMessageOptions = {
      updateParent: false,
    },
  ): Promise<Discord.Message> {
    if (updateParent) {
      return this.parentManager.update({
        content: this.content,
        embeds: this.embeds,
        components: this.components,
        files: this.files,
      });
    } else return super.update(option);
  }

  public override async endManager(): Promise<void> {
    this.collector?.stop();
    await this.parentManager.update();
  }
}
