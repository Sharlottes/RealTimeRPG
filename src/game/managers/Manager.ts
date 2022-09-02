import { type ManagerConstructOptions, type ComponentTrigger } from "@RTTRPG/@type";
import { Formatters, type Interaction, MessageActionRow, type MessageOptions, Message, MessageEmbed, MessageButton, TextBasedChannel } from "discord.js";
import { KotlinLike } from '../../util'

type Files = Exclude<MessageOptions['files'], undefined>;
/**
 * 임베드와 컴포넌트의 생성, 수신, 상호작용을 총괄함 
 */
class Manager extends KotlinLike<Manager> {
    public content?: string;
	public readonly locale: string;
    public embeds: MessageEmbed[] = [];
    public components: MessageActionRow[] = [];
    public triggers: Map<string, ComponentTrigger> = new Map();
    public files: Files = [];
    public readonly interaction: Interaction;
    public message?: Message | undefined;

    public constructor({ content, embeds, components, files, interaction, triggers } : ManagerConstructOptions) {
        super()
        if(components) this.components = components;
        if(triggers) this.triggers = triggers;
        if(embeds) this.embeds = embeds;
        if(files) this.files = files;
        this.content = content;

        this.interaction = interaction;
		this.locale = interaction.locale;

        const collector = interaction.channel?.createMessageComponentCollector({ time: 60000 });
        collector?.on('collect', interaction => {
            const trigger = this.triggers.get(interaction.customId);
            if(trigger) trigger(interaction, this);
        })
    }


    public static start<T extends abstract new (...args: any) => any = typeof this>(options: ConstructorParameters<T>[0]) {
        const manager = new this(options);
        manager.init();
        manager.send();
    }
        
    public init(): void {
        
    }

    /**
     * 보내진 메시지를 삭제합니다.
     */
    public remove(): void {
        if(this.interaction.isRepliable()) this.interaction.deleteReply();
        else if(this.message?.deletable) this.message.delete();
        console.warn("this manager doesn't have any way to remove message");
    }

    /**
     * 현재 데이터로 메시지를 보내거나 수정합니다.
     * 데이터를 수정하고 업데이트할 때 꼭 필요합니다.
     * 성공적으로 완료되었으면 message를 업데이트합니다.
     * 
     * @param {TextBasedChannel} channel - 수신할 채널, 생략할 경우 interaction editreply - reply - send 우선적으로 수신합니다.
     */
    public async send(channel?: TextBasedChannel): Promise<void> {
        const options = { content: this.content, embeds: this.embeds, components: this.components, files: this.files };

        const msg = await (() => {
            if(channel) return channel.send(options)
            else if(this.interaction.isRepliable()) {
                if(this.interaction.replied || this.interaction.deferred) return this.interaction.editReply(options);
                else return this.interaction.reply(options);
            }
            else return this.interaction.channel?.send(options);
        })();
        if(!(msg instanceof Message)) return;
        this.message = msg;
    }
    
    /**
     * 메시지에 코드블록을 추가합니다.
     * 주로 전투 로그나 교환 로그 등...에 쓰임
     */
    public addContentBlock(description: string, type = '', codeblock = true): void {
        if(codeblock) description = Formatters.codeBlock(type, description);
        this.content += `\n${description}`;
    }

    public addRemoveButton(): this {
        this.addComponents(
            new MessageActionRow()
                .addComponents([
                    new MessageButton()
                        .setCustomId('remove_embed')
                        .setLabel('Cancel')
                        .setStyle('SECONDARY')
                ])
        )
            .setTriggers('remove_embed', this.remove);

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