import { type ManagerConstructOptions, type ComponentTrigger } from "@RTTRPG/@type";
import { Formatters, type Interaction, MessageActionRow, type MessageOptions, Message, MessageEmbed, MessageButton, TextBasedChannel, InteractionReplyOptions, CacheType, InteractionCollector, MessageComponentInteraction, Options } from "discord.js";
import { KotlinLike } from '../../util'

type Files = Exclude<MessageOptions['files'], undefined>;
/**
 * 임베드와 컴포넌트의 생성, 통신, 상호작용을 총괄함
 */
class Manager extends KotlinLike<Manager> {
    public content?: string;
    public embeds: MessageEmbed[] = [];
    public components: MessageActionRow[] = [];
    public triggers: Map<string, ComponentTrigger> = new Map();
    public files: Files = [];
	public readonly locale: string;
    public readonly interaction: Interaction;
    private message?: Message | undefined;
    private readonly collector?: InteractionCollector<MessageComponentInteraction<CacheType>>;

    public constructor({ content, embeds, components, files, interaction, triggers } : ManagerConstructOptions) {
        super()
        if(components) this.components = components;
        if(triggers) this.triggers = triggers;
        if(embeds) this.embeds = embeds;
        if(files) this.files = files;
        this.content = content;

        this.interaction = interaction;
		this.locale = interaction.locale;

        this.collector = interaction.channel?.createMessageComponentCollector();
        this.collector?.on('collect', async (interaction) => {
            const trigger = this.triggers.get(interaction.customId);
            if(trigger) {
                interaction.deferUpdate({ fetchReply: true }).then(() => trigger(interaction, this));
            }
        });
    }

    public static start<T extends abstract new (...args: any) => any = typeof this>(options: ConstructorParameters<T>[0] & { channel?: TextBasedChannel, update?: boolean }) {
        const manager = new this(options);
        manager.init();
        if(options.update) manager.update();
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
        if(this.message?.deletable) {
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
        const options = { content: this.content, embeds: this.embeds, components: this.components, files: this.files };

        if(this.message?.editable) await this.message.edit(options);
        else if(this.interaction.isRepliable()) await this.interaction.editReply(options);
        else if(elseSend) this.send(channel);
    }
    /**   
     * 현재 데이터를 송신하고 message를 갱신합니다.
     * @param channel - 송신할 채널  
     */
    public async send(channel: TextBasedChannel | null = this.interaction.channel): Promise<void> {
        const options = { content: this.content, embeds: this.embeds, components: this.components, files: this.files };
        await channel?.send(options).then(message => this.message = message);
    }
    
    /**
     * 메시지에 문자열을 추가합니다.
     * @param content - 추가할 문자열
     * @param type - 코드블록 언어, 빈 문자열은 하이라이트 X
     */
    public addContent(content: string, type?: string): void {
        this.content += type === undefined ? content : Formatters.codeBlock(type, content);
    }

    /**
     * 이 메시지와의 상호작용을 종료합니다.   
     * 모든 버튼이 사라지고 삭제 버튼이 생성됩니다. 메시지는 5초 후 자동 삭제됩니다.
     */
    public async endManager(timeout = 5000) : Promise<void> {
      this.setComponents([]);
      this.addRemoveButton(timeout);
      await this.update();
    }

    public addRemoveButton(timeout = 5000): this {
        this.addComponents(
            new MessageActionRow()
                .addComponents([
                    new MessageButton()
                        .setCustomId('remove_embed')
                        .setLabel('Cancel')
                        .setStyle('SECONDARY')
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
    public setEmbeds(embeds: MessageEmbed[]): this {
        this.embeds = embeds;
        return this;
    }
    public addEmbeds(embeds: MessageEmbed | MessageEmbed[]): this {
        for(const embed of Array.isArray(embeds) ? embeds : [embeds]) this.embeds.push(embed);
        return this;
    }
    public setComponents(components: MessageActionRow[]): this {
        this.components = components;
        return this;
    }
    public addComponents(components: MessageActionRow | MessageActionRow[]): this {
        for(const component of Array.isArray(components) ? components : [components]) this.components.push(component);
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
        for(const file of Array.isArray(files) ? files : [files]) this.files.push(file);
        return this;
    }
    

    public static newErrorEmbed(interaction: Interaction, description: string) {
        new Manager({ interaction, embeds: [new MessageEmbed().setTitle("ERROR").setDescription(description)] }).addRemoveButton().send(interaction.channel as TextBasedChannel);
    }

    public static newTextEmbed(interaction: Interaction, description: string, title = "") {
        new Manager({ interaction, embeds: [new MessageEmbed().setTitle(title).setDescription(description)] }).addRemoveButton().send(interaction.channel as TextBasedChannel);
    }
}

export default Manager;