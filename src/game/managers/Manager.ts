import { type ManagerConstructOptions, type ComponentTrigger } from "@type";
import {
    BaseInteraction,
    type BaseMessageOptions,
    type MessageCreateOptions,
    type MessageEditOptions,
    type CacheType,
    type Constructable,
    Message,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    TextBasedChannel,
    InteractionCollector,
    ButtonInteraction,
    SelectMenuInteraction,
    codeBlock,
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
    private message?: Message | undefined;
    private collector?: InteractionCollector<SelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>>;

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

    public static async start<T extends Constructable<any> = typeof this>(options: ConstructorParameters<T>[0] & { channel?: TextBasedChannel, update?: boolean }) {
        const manager = new this(options);

        manager.init();
        await manager.send(options.channel);
        manager.updateCollector();

        return manager as InstanceType<T>;
    }

    public updateCollector() {
        this.collector ??= this.message?.createMessageComponentCollector().on('collect', async (interaction) => {
            const trigger = this.triggers.get(interaction.customId);
            if (trigger) { //나는 뒤다
                // 자
                (async () => {
                    if (!interaction.deferred) {
                        const sent = await interaction.deferUpdate({ fetchReply: true })
                        this.message = sent;
                    }
                    trigger(interaction, this);
                })();
            }
        });
    }

    public init(): void { }

    /**
     * 보냈을 때 업데이트한 메시지를 삭제합니다.
     */
    public async remove(): Promise<void> {
        this.collector?.stop();

        if (!this.message) console.log('message is empty');
        else await this.message.delete();
    }

    /**
     * 현재 데이터를 갱신합니다.   
     * 메시지가 있다면 그 메시지로, 없다면 상호작용의 메시지를 수정하여 갱신합니다.   
     * @param createNewIfDoesNotExist - 갱신할 메시지가 없다면 새로 만들어 송신합니다. 
     * @param channel - 송신할 채널
     */
    public async update(createNewIfDoesNotExist: boolean, channel?: TextBasedChannel | null): Promise<void>;
    public async update(): Promise<void>;
    public async update(createNewIfDoesNotExist = false, channel: TextBasedChannel | null = this.interaction.channel): Promise<void> {
        const options: MessageEditOptions = {
            content: this.content,
            embeds: this.embeds,
            components: this.components,
            files: this.files
        };

        const sent = await (() => {
            if (this.message?.editable) return this.message.edit(options);
            else if (this.interaction.isRepliable()) return this.interaction.editReply(options); //잠시 라면좀 빨고오겠
            else if (createNewIfDoesNotExist) return this.send(channel ?? this.interaction.channel);
            else throw new Error('cannot send message');
        })()
        this.message = sent;
    }
    /**   
     * 현재 데이터를 송신하고 message를 갱신합니다.
     * @param channel - 송신할 채널  
     */
    public async send(channel: TextBasedChannel | null = this.interaction.channel): Promise<Message<boolean> | undefined> {
        const options: MessageCreateOptions = {
            content: this.content,
            embeds: this.embeds,
            components: this.components,
            files: this.files
        };
        this.updateCollector();
        if (channel) {
            const sent = await channel.send(options)
            this.message = sent;
            return sent;
        }
    }

    /**
     * 메시지에 문자열을 추가합니다.
     * @param content - 추가할 문자열
     * @param type - 코드블록 언어, 빈 문자열은 하이라이트 X
     */
    public addContent(content: string, type?: string): void {
        this.content += type === undefined ? content : codeBlock(type, content);
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
        this.setTriggers('remove_embed', () => {
            clearTimeout(id);
            this.remove();
        });
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

    public setTriggers(customId: string, trigger: ComponentTrigger): this {
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


    public static async newErrorEmbed(interaction: BaseInteraction, description: string) {
        const manager = new Manager({
            interaction,
            embeds: [
                new EmbedBuilder()
                    .setTitle("ERROR")
                    .setDescription(description)
            ]
        });
        manager.addRemoveButton()
        await manager.send(interaction.channel);
        return manager;
    }

    public static async newTextEmbed(interaction: BaseInteraction, description: string, title = "") {
        const manager = new Manager({
            interaction,
            embeds: [
                new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
            ]
        });
        manager.addRemoveButton()
        await manager.send(interaction.channel);
        return manager;
    }
}

export default Manager;