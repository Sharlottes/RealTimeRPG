import { type ManagerConstructOptions, type ComponentTrigger } from "@RTTRPG/@type";
import { type Interaction, MessageActionRow, type MessageOptions, Message, MessageEmbed, MessageButton } from "discord.js";

type Files = Exclude<MessageOptions['files'], undefined>;
/**
 * 임베드와 컴포넌트의 생성, 수신, 상호작용을 총괄함 
 */
class Manager {
    public content?: string;
	public readonly locale: string;
    public embeds: MessageEmbed[] = [];
    public components: MessageActionRow[] = [];
    public triggers: Map<string, ComponentTrigger> = new Map();
    public files: Files = [];
    public readonly interaction: Interaction;
    public message?: Message | undefined;

    public constructor({ content, embeds, components, files, interaction, triggers } : ManagerConstructOptions) {
        if(components) this.components = components;
        if(triggers) this.triggers = triggers;
        if(embeds) this.embeds = embeds;
        if(files) this.files = files;
        this.content = content;

        this.interaction = interaction;
		this.locale = interaction.locale;

        const collector = interaction.channel?.createMessageComponentCollector({ time: 60000 });
        collector?.on('collect', interaction => {
            const trigger = triggers?.get(interaction.customId);
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
        else if(this.message && this.message.deletable) this.message.delete();
        console.warn("this manager doesn't have any way to remove message");
    }

    /**
     * 현재 데이터로 메시지를 보내거나 수정합니다.
     * 데이터를 수정하고 업데이트할 때 꼭 필요합니다.
     * 성공적으로 완료되었으면 message를 업데이트합니다.
     */
    public async send(): Promise<unknown> {
        const options = { content: this.content, embeds: this.embeds, components: this.components, files: this.files };

        if(this.interaction.isRepliable()) {
            if(this.interaction.replied || this.interaction.deferred) return this.interaction.editReply(options).then(msg => {if(msg instanceof Message) this.message = msg;});
            else return this.interaction.reply(options);
        }
        else return this.interaction.channel?.send(options).then(msg => this.message = msg);

    }
    
    /**
     * 메시지에 코드블록을 추가합니다.
     */
    public addContentBlock(description: string, type = '', codeblock = true): void {
        if(codeblock) description = "```"+type+"\n"+description+"\n```";
        this.content += `\n${description}`;
    }

    public addRemoveButton() {
        this.addComponents(new MessageActionRow().addComponents([
        new MessageButton().setCustomId('remove_embed').setLabel('Cancel').setStyle('SECONDARY')
        ])).setTriggers('remove_embed', this.remove);
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
        new Manager({ interaction, embeds: [new MessageEmbed().setTitle("ERROR").setDescription(description)] }).send();
    }

    public static newTextEmbed(interaction: Interaction, description: string, title = "") {
        new Manager({ interaction, embeds: [new MessageEmbed().setTitle(title).setDescription(description)] }).send();
    }
}

export default Manager;