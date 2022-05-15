import { CommandInteraction } from "discord.js";

import { BaseEmbed } from "@RTTRPG/modules";
import { findMessage, User } from '@RTTRPG/game';

/**
 * 모든 이벤트들의 기반 관리 클래스
 */
export default class BaseManager {
  protected readonly user: User;
  protected readonly interaction: CommandInteraction;
  protected readonly builder: BaseEmbed;
	protected readonly locale: string;

  public constructor(user: User, interaction: CommandInteraction, builder = findMessage(interaction.id).builder as BaseEmbed) {
    this.user = user;
    this.interaction = interaction;
		this.builder = builder;
		this.locale = interaction.locale;
    if(new.target === BaseManager) this.init();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected init() {}

  public start() {
    this.builder.build();
  }

  public static newErrorEmbed(user: User, interaction: CommandInteraction, description: string) {
    new BaseManager(user, interaction, new BaseEmbed(interaction).setTitle("ERROR").setDescription(description)).start();
  }

  public static newTextEmbed(user: User, interaction: CommandInteraction, description: string, title = "") {
    new BaseManager(user, interaction, new BaseEmbed(interaction, false).setTitle(title).setDescription(description)).start();
  }
}