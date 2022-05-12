import { BaseEmbed } from "@RTTRPG/modules";
import { findMessage, User } from '@RTTRPG/game';

/**
 * 모든 이벤트들의 기반 관리 클래스
 */
export default class EventManager {
  protected readonly builder: BaseEmbed;
	protected readonly locale: string;

  public constructor(user: User, builder = findMessage(user).builder as BaseEmbed) {
		this.locale = user.getLocale();
		this.builder = builder;
    findMessage(user).builder = builder;
    if(new.target === EventManager) this.init();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected init() {}

  public start() {
    this.builder.build();
  }

  public static newErrorEmbed(user: User, description: string, interaction = findMessage(user).interaction) {
    new EventManager(user, new BaseEmbed(interaction).setTitle("ERROR").setDescription(description)).start();
  }

  public static newTextEmbed(user: User, description: string, title = "", interaction = findMessage(user).interaction) {
    new EventManager(user, new BaseEmbed(interaction).setTitle(title).setDescription(description)).start();
  }
}