import { type ManagerConstructOptions, type ComponentTrigger } from "@type";
import {
    BaseInteraction,
    type BaseMessageOptions,
    type MessageCreateOptions,
    type MessageEditOptions,
    type CacheType,
    Message,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    TextBasedChannel,
    InteractionCollector,
    ButtonInteraction,
    SelectMenuInteraction,
    ButtonStyle,
    SelectMenuBuilder
} from "discord.js";
import { KotlinLike } from '../../utils'

type Files = Exclude<BaseMessageOptions['files'], undefined>;

/**
 * 임베드와 컴포넌트의 생성, 통신, 상호작용을 총괄함
 */
class Manager extends KotlinLike<Manager> {
    public content?: string;
    public embeds: EmbedBuilder[] = [];
    public components: ActionRowBuilder<SelectMenuBuilder | ButtonBuilder>[] = [];
    public triggers: Map<string, ComponentTrigger> = new Map();
    public files: Files = [];
    public readonly locale: string;
    public readonly interaction: BaseInteraction;
    protected message?: Message | undefined;
    protected collector?: InteractionCollector<SelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>>;

    public constructor({ content, embeds = [], components = [], files = [], interaction, triggers = new Map() }: ManagerConstructOptions) {
        super()
        this.components = components as ActionRowBuilder<SelectMenuBuilder | ButtonBuilder>[];
        this.triggers = triggers;
        this.embeds = embeds;
        this.files = files;
        this.content = content;

        this.interaction = interaction;
        this.locale = interaction.locale;
    }

    private updateCollector() {
        this.collector ??= this.message?.createMessageComponentCollector().on('collect', async (interaction) => {
            const trigger = this.triggers.get(interaction.customId);
            if (trigger) {
                if (!interaction.deferred) {
                    this.message = await interaction.deferUpdate({ fetchReply: true })
                }
                trigger(interaction, this);
            }
        });
    }

    /**
     * 현재 데이터를 갱신합니다.   
     * 메시지가 있다면 그 메시지로, 없다면 상호작용의 메시지를 수정하여 갱신합니다.   
     * @param channel - 송신할 채널
     */
    public async update(channel: TextBasedChannel | null = this.interaction.channel): Promise<Message> {
        if (!channel) throw new Error('channel does not exist');

        const options: MessageEditOptions = {
            content: this.content,
            embeds: this.embeds,
            components: this.components,
            files: this.files
        };
        const sent = await (() => {
            if (this.message?.editable) return this.message.edit(options);
            else if (this.interaction.isRepliable()) return this.interaction.editReply(options);
            else return this.send(channel);
        })()
        this.message = sent;
        this.updateCollector();
        return sent;
    }
    /**   
     * 현재 데이터를 송신하고 message를 갱신합니다.
     * @param channel - 송신할 채널  
     */
    public async send(channel: TextBasedChannel | null = this.interaction.channel): Promise<Message> {
        if (!channel) throw new Error('channel does not exist');

        const options: MessageCreateOptions = {
            content: this.content,
            embeds: this.embeds,
            components: this.components,
            files: this.files
        };
        const sent = await channel.send(options)
        this.message = sent;
        this.updateCollector();
        return sent;
    }

    /**
     * 이 메시지와의 상호작용을 종료합니다.   
     * 모든 버튼이 사라지고 삭제 버튼이 생성됩니다. 메시지는 기본 5초 후 자동 삭제됩니다.
     */
    public async endManager(timeout = 5000): Promise<void> {
        this.setComponents();
        this.addRemoveButton(timeout);
        await this.update();
    }

    /**
     * 보냈을 때 업데이트한 메시지를 삭제합니다.
     */
    public async remove(): Promise<void> {
        this.collector?.stop();

        if (!this.message) console.log('message is empty');
        else await this.message.delete();
    }

    public addRemoveButton(timeout = 5000): this {
        const id = setTimeout(() => timeout != -1 && this.remove(), timeout);

        this.addComponents(
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents([
                    new ButtonBuilder()
                        .setCustomId('remove_embed')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                ])
        )
        this.setTrigger('remove_embed', () => {
            clearTimeout(id);
            this.remove();
        });
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

    public setEmbeds(...embeds: EmbedBuilder[]): this {
        this.embeds = embeds;
        return this;
    }

    public addEmbeds(...embeds: EmbedBuilder[]): this {
        this.embeds.push(...embeds);
        return this;
    }

    public setComponents(...components: ActionRowBuilder<SelectMenuBuilder | ButtonBuilder>[]): this {
        this.components = components;
        return this;
    }

    public addComponents(...components: ActionRowBuilder<SelectMenuBuilder | ButtonBuilder>[]): this {
        this.components.push(...components);
        return this;
    }

    public setTrigger(customId: string, trigger: ComponentTrigger): this {
        this.triggers.set(customId, trigger);
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


    public static async newErrorEmbed(interaction: BaseInteraction, description: string, update: boolean = false) {
        const manager = new Manager({
            interaction,
            embeds: [
                new EmbedBuilder()
                    .setTitle("ERROR")
                    .setDescription(description)
            ]
        });
        manager.addRemoveButton()
        if (update) await manager.update(interaction.channel);
        else await manager.send(interaction.channel);
        return manager;
    }

    public static async newTextEmbed(interaction: BaseInteraction, description: string, title = "", update: boolean = false) {
        const manager = new Manager({
            interaction,
            embeds: [
                new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
            ]
        });
        manager.addRemoveButton()
        if (update) await manager.update(interaction.channel);
        else await manager.send(interaction.channel);
        return manager;
    }
}

export default Manager;