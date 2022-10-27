import { type ManagerConstructOptions, type ComponentTrigger } from "@type";
import { 
    BaseInteraction, 
    type BaseMessageOptions, 
    type CacheType, 
    Message, 
    ActionRowBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    TextBasedChannel, 
    InteractionCollector, 
    MessagePayload, 
    MessagePayloadOption, 
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
    private readonly collector?: InteractionCollector<SelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>>;

    public constructor({ content, embeds = [], components = [], files = [], interaction, triggers = new Map() }: ManagerConstructOptions) {
        super()
        this.components = components as ActionRowBuilder<SelectMenuBuilder | ButtonBuilder>[];
        this.triggers = triggers;
        this.embeds = embeds;
        this.files = files;
        this.content = content;

        this.interaction = interaction;
        this.locale = interaction.locale;

        this.collector = interaction.channel?.createMessageComponentCollector();
        this.collector?.on('collect', async (interaction) => {
            const trigger = this.triggers.get(interaction.customId);
            if (trigger) {
                interaction.deferUpdate({ fetchReply: true }).then(() => trigger(interaction, this));
            }
        });
    }

    public static start<T extends abstract new (...args: any) => any = typeof this>(options: ConstructorParameters<T>[0] & { channel?: TextBasedChannel, update?: boolean }) {
        const manager = new this(options);
        manager.init();
        if (options.update) manager.update();
        else manager.send(options.channel);
    }

    public init(): void {
        this.message = undefined;
        this.content = undefined;
        this.embeds = [];
        this.files = [];
        this.components = [];
        this.triggers.clear();
    }

    /**
     * 보냈을 때 업데이트한 메시지를 삭제합니다.
     */
    public remove(): void {
        if (this.message?.deletable) {
            this.collector?.stop();
            this.message.delete();
        } else console.warn("this manager doesn't have any way to remove message");
    }

    /**
     * 현재 데이터를 갱신합니다.   
     * 메시지가 있다면 그 메시지로, 없다면 상호작용의 메시지를 수정하여 갱신합니다.   
     * @param elseSend - 갱신할 메시지가 없다면 새로 만들어 송신합니다. 
     * @param channel - 송신할 체널
     */
    public async update(elseSend: boolean, channel?: TextBasedChannel | null): Promise<void>;
    public async update(): Promise<void>;
    public async update(elseSend = false, channel: TextBasedChannel | null = this.interaction.channel): Promise<void> {
        const options: MessagePayloadOption = { 
            content: this.content,
            embeds: this.embeds, 
            components: this.components, 
            files: this.files 
        };

        if (this.message?.editable) await this.message.edit(MessagePayload.create(this.message, options));
        else if (this.interaction.isRepliable()) await this.interaction.editReply(MessagePayload.create(this.interaction, options));
        else if (elseSend) await this.send(channel);
    }
    /**   
     * 현재 데이터를 송신하고 message를 갱신합니다.
     * @param channel - 송신할 채널  
     */
    public async send(channel: TextBasedChannel | null = this.interaction.channel): Promise<void> {
        const options: MessagePayloadOption = { 
            content: this.content, 
            embeds: this.embeds, 
            components: this.components, 
            files: this.files 
        };
        await channel?.send(MessagePayload.create(channel, options)).then(message => this.message = message);
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
     * 모든 버튼이 사라지고 삭제 버튼이 생성됩니다. 메시지는 5초 후 자동 삭제됩니다.
     */
    public async endManager(timeout = 5000): Promise<void> {
        this.setComponents([]);
        this.addRemoveButton(timeout);
        await this.update();
    }

    public addRemoveButton(timeout = 5000): this {
        this.addComponents(
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents([
                    new ButtonBuilder()
                        .setCustomId('remove_embed')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                ])
        )
            .setTriggers('remove_embed', () => this.remove());
        setTimeout(() => {
            this.remove();
        }, timeout);
        return this;
    }

    public setContent(content: string): this {
        this.content = content;
        return this;
    }
    public setEmbeds(embeds: EmbedBuilder[]): this {
        this.embeds = embeds;
        return this;
    }
    public addEmbeds(embeds: EmbedBuilder | EmbedBuilder[]): this {
        for (const embed of Array.isArray(embeds) ? embeds : [embeds]) this.embeds.push(embed);
        return this;
    }
    public setComponents(components: ActionRowBuilder<SelectMenuBuilder | ButtonBuilder>[]): this {
        this.components = components;
        return this;
    }
    public addComponents(components: ActionRowBuilder<SelectMenuBuilder | ButtonBuilder> | ActionRowBuilder<SelectMenuBuilder | ButtonBuilder>[]): this {
        for (const component of Array.isArray(components) ? components : [components]) this.components.push(component);
        return this;
    }
    public setTriggers(customId: string, trigger: ComponentTrigger): this {
        this.triggers.set(customId, trigger);
        return this;
    }
    public setFiles(files: Files): this {
        this.files = files;
        return this;
    }
    public addFiles(files: Files[number] | Files): this {
        for (const file of Array.isArray(files) ? files : [files]) this.files.push(file);
        return this;
    }


    public static newErrorEmbed(interaction: BaseInteraction, description: string) {
        new Manager({ interaction, embeds: [new EmbedBuilder().setTitle("ERROR").setDescription(description)] }).addRemoveButton().send(interaction.channel as TextBasedChannel);
    }

    public static newTextEmbed(interaction: BaseInteraction, description: string, title = "") {
        new Manager({ interaction, embeds: [new EmbedBuilder().setTitle(title).setDescription(description)] }).addRemoveButton().send(interaction.channel as TextBasedChannel);
    }
}

export default Manager;