import type { PaginationStringSelectMenuOptions } from "@/command/components/PaginationStringSelectMenu";
import PaginationStringSelectMenu from "@/command/components/PaginationStringSelectMenu";
import { CloseButtonComponent } from "@/command/components/GeneralComponents";
import { ActionRowBuilder, EmbedBuilder, ButtonStyle } from "discord.js";
import ButtonComponent from "@/command/components/ButtonComponent";
import withRowBuilder from "@/command/components/withRowBuilder";
import bundle from "@/assets/Bundle";

type Files = Exclude<Discord.BaseMessageOptions["files"], undefined>;

export type ManagerConstructOptions = {
  content?: string;
  embeds?: Discord.EmbedBuilder[];
  components?: ActionRowBuilder<Discord.StringSelectMenuBuilder | Discord.ButtonBuilder>[];
  files?: Exclude<Discord.BaseMessageOptions["files"], undefined>;
  interaction: Discord.BaseInteraction;
};

/**
 * 임베드와 컴포넌트의 생성, 통신, 상호작용을 총괄함
 */
class Manager {
  public content?: string;
  public embeds: Discord.EmbedBuilder[] = [];
  public components: Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder | Discord.ButtonBuilder>[] = [];
  public files: Files = [];
  public readonly locale: string;
  public readonly interaction: Discord.BaseInteraction;
  public message?: Discord.Message | undefined;
  public collector?: Discord.InteractionCollector<
    Discord.StringSelectMenuInteraction<Discord.CacheType> | Discord.ButtonInteraction<Discord.CacheType>
  >;

  public constructor({ content, embeds = [], components = [], files = [], interaction }: ManagerConstructOptions) {
    this.components = components;
    this.embeds = embeds;
    this.files = files;
    this.content = content;

    this.interaction = interaction;
    this.locale = interaction.locale;
  }

  /**
   * 현재 데이터를 갱신합니다.
   *
   * 메시지가 있다면 그 메시지로, 없다면 상호작용의 메시지를 수정 / 답신하고, **못한다면 그냥 던집니다.**
   *
   * 메시지를 새롭게 보내고 싶다면 `send`를 고려하세요
   */
  public async update(
    options: Discord.BaseMessageOptions = {
      content: this.content,
      embeds: this.embeds,
      components: this.components,
      files: this.files,
    },
  ): Promise<Discord.Message> {
    this.components.forEach((component) => {
      if (component instanceof PaginationStringSelectMenu) {
        component.reoption();
      }
    });
    const sent = await (() => {
      if (this.message && this.message.editable) return this.message.edit(options);
      else if (this.interaction.isRepliable()) {
        if (this.interaction.replied || this.interaction.deferred) {
          return this.interaction.editReply(options);
        } else {
          return this.interaction.reply(options).then((response) => response.fetch());
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
  public async send(channel: Discord.TextBasedChannel | null = this.interaction.channel): Promise<Discord.Message> {
    if (!channel) throw new Error("channel does not exist");

    const options: Discord.MessageCreateOptions = {
      content: this.content,
      embeds: this.embeds,
      components: this.components,
      files: this.files,
    };
    const sent = await channel.send(options);
    this.message = sent;
    return sent;
  }

  /**
   * 이 메시지와의 상호작용을 종료합니다.
   *이벤트가 종료되고 삭제 버튼이 생성됩니다.
   */
  public async endManager(timeout = 5000): Promise<void> {
    //this.user.gameManager.endEvent();
    this.setComponents();
    this.addRemoveButton(timeout);
    await this.update();
  }

  /**
   * 보냈을 때 업데이트한 메시지를 삭제합니다.
   */
  public async remove(): Promise<void> {
    this.collector?.stop();

    if (!this.message) throw new Error("message is empty");
    else await this.message.delete();
  }

  /**
   * 버튼 컴포넌트를 추가합니다.
   *
   * @param name - 컴포넌트 이름
   * @param row - 컴포넌트 열 (0~4)
   * @param callback - 선택 콜백함수(버튼 interaction, 버튼 manager)
   */
  public addButtonSelection(
    name: string,
    row: number,
    callback: (interaction: Discord.ButtonInteraction) => unknown,
    option: Partial<Omit<Discord.InteractionButtonComponentData, "label" | "customId">> = {
      style: ButtonStyle.Primary,
    },
  ) {
    this.resizeSelection(row);

    this.components[row].addComponents(
      new ButtonComponent({
        onClick: callback,
        customId: name,
        label: bundle.find(this.locale, `select.${name}`),
        ...option,
      }),
    );

    return this;
  }

  /**
   * 선택메뉴 컴포넌트를 추가합니다.
   *
   * @param name - 컴포넌트 이름
   * @param callback - 선택 콜백함수
   * @param list - 아이템 리스트
   * @param reducer - 아이템 리스트 매퍼
   * @param placeholder - 선택 전 힌트
   */
  public addMenuSelection<T>(
    name: string,
    callback: (interaction: Discord.StringSelectMenuInteraction, item: T) => void,
    options: PaginationStringSelectMenuOptions<T>,
  ) {
    console.log(1);
    this.components.push(withRowBuilder(new PaginationStringSelectMenu(name, callback, options)).Row);

    return this;
  }

  /**
   * 최대 5 열까지 컴포넌트 열 컴포넌트를 추가합니다.
   * @param row 갱신할 열 길이
   */
  private resizeSelection(row: number) {
    if (row >= 5) throw new Error("component row cannot be more than 5!");
    while (this.components.length <= row) {
      this.components.push(new ActionRowBuilder({ components: [] }));
    }
  }

  public addRemoveButton(timeout = 5000): this {
    if (timeout > 0)
      setTimeout(() => {
        //TODO
        try {
          this.remove();
        } catch (e) {}
      }, timeout);

    this.addComponents(CloseButtonComponent.Row);
    return this;
  }

  public addContent(content: string): this {
    this.content += content;
    return this;
  }

  public setContent(content: string): this {
    this.content = content;
    return this;
  }

  public setEmbeds(...embeds: Discord.EmbedBuilder[]): this {
    this.embeds = embeds;
    return this;
  }

  public addEmbeds(...embeds: Discord.EmbedBuilder[]): this {
    this.embeds.push(...embeds);
    return this;
  }

  public setComponents(
    ...components: Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder | Discord.ButtonBuilder>[]
  ): this {
    this.components = components;
    return this;
  }

  public addComponents(
    ...components: Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder | Discord.ButtonBuilder>[]
  ): this {
    this.components.push(...components);
    return this;
  }

  public setFiles(...files: Files): this {
    this.files = files;
    return this;
  }

  public addFiles(...files: Files): this {
    this.files.push(...files);
    return this;
  }

  public static async newErrorEmbed(interaction: Discord.BaseInteraction, description: string) {
    const manager = new Manager({
      interaction,
      embeds: [new EmbedBuilder().setTitle("ERROR").setDescription(description)],
    });
    manager.addRemoveButton();
    await manager.send(interaction.channel);
    return manager;
  }

  public static async newTextEmbed(interaction: Discord.BaseInteraction, description: string, title = "") {
    const manager = new Manager({
      interaction,
      embeds: [new EmbedBuilder().setTitle(title).setDescription(description)],
    });
    manager.addRemoveButton();
    await manager.send(interaction.channel);
    return manager;
  }
}

export default Manager;
