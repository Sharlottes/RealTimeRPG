import { CloseButtonComponent } from "@/command/components/GeneralComponents";
import { ignoreInteraction } from "@/utils/functions";
import Vars from "@/Vars";

import User from "../User";

export type ManagerConstructOptions = {
  content?: string;
  embeds?: Discord.EmbedBuilder[];
  components?: Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder | Discord.ButtonBuilder>[];
  files?: Exclude<Discord.BaseMessageOptions["files"], undefined>;
  interaction: Discord.BaseInteraction;
};

/**
 * 임베드와 컴포넌트의 생성, 통신, 상호작용을 총괄함
 */
class Manager {
  public readonly messageData: Pick<ManagerConstructOptions, "content"> &
    Required<Omit<ManagerConstructOptions, "interaction" | "content">>;
  public readonly interaction: Discord.BaseInteraction;
  public message?: Discord.Message | undefined;

  public constructor({ content, embeds = [], components = [], files = [], interaction }: ManagerConstructOptions) {
    this.messageData = { components, content, embeds, files };
    this.interaction = interaction;
  }

  get locale() {
    return this.interaction.locale;
  }

  public updateMessageData(data: Partial<typeof this.messageData>) {
    Object.assign(this.messageData, data);
  }

  /**
   * 현재 데이터를 갱신합니다.
   *
   * 메시지가 있다면 그 메시지로, 없다면 상호작용의 메시지를 수정 / 답신하고, **못한다면 그냥 던집니다.**
   *
   * 메시지를 새롭게 보내고 싶다면 `send`를 고려하세요
   */
  public async update(): Promise<Discord.Message> {
    this.messageData.components.forEach((component) => {
      if ("refresh" in component && typeof component.refresh === "function") {
        component.refresh();
      }
    });
    const sent = await (() => {
      if (this.message && this.message.editable) return this.message.edit(this.messageData);
      else if (this.interaction.isRepliable()) {
        if (this.interaction.replied || this.interaction.deferred) {
          return this.interaction.editReply(this.messageData);
        } else {
          return this.interaction.reply(this.messageData).then((response) => response.fetch());
        }
      } else {
        throw new Error(
          "this manager doesn't have editable message or repliable interaction.\nconsider using `send(channel)` instead.",
        );
      }
    })();
    this.message = sent;
    return sent;
  }

  /**
   * 현재 데이터를 송신하고 message를 갱신합니다.
   * @param channel 송신할 채널 (기본값: 출생지)
   */
  public async send(
    channel: Discord.TextBasedChannel = User.findUserByInteraction(this.interaction).gameManager?.gameThread ??
      this.interaction.channel!,
  ): Promise<Discord.Message> {
    ignoreInteraction(this.interaction);
    const sent = await channel?.send(this.messageData);
    this.message = sent;
    return sent;
  }

  public async endManager(): Promise<void> {
    //this.user.gameManager.endEvent();
    this.messageData.components = [CloseButtonComponent.Row];
    await this.update();
  }

  /**
   * 이 메니저의 메시지를 삭제합니다.
   */
  public async remove(): Promise<void> {
    if (!this.message) throw new Error("message is empty");
    else await this.message.delete();
  }
}

export default Manager;
