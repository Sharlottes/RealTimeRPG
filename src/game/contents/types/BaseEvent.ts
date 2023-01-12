import { BaseInteraction } from "discord.js";

import { Rationess } from "@type";
import { User } from "game";

//이딴게 이벤트?
export default class BaseEvent implements Rationess {
  public only = false;

  constructor(
    public ratio: number,
    public start: (user: User, interaction: BaseInteraction) => void
  ) {}

  public setOnly(only: boolean): this {
    this.only = only;
    return this;
  }
}
