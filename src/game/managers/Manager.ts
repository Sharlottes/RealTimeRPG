import type { ComponentTrigger } from "@type";
import { bundle } from 'assets';
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
    SelectMenuBuilder,
    APIButtonComponent,
    APISelectMenuOption,
    ComponentType,
    MessageComponentInteraction
} from "discord.js";
import { KotlinLike } from '../../utils'

type Files = Exclude<BaseMessageOptions['files'], undefined>;

export type ManagerConstructOptions = {
    content?: string;
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<SelectMenuBuilder | ButtonBuilder>[];
    triggers?: Map<string, ComponentTrigger>;
    files?: Exclude<BaseMessageOptions['files'], undefined>;
    lastManager?: Manager;

    interaction: BaseInteraction;
}

type MenuSelectOptions<T> = {
    list: T[] | (() => T[]);
    reducer?: (elem: T, index: number) => APISelectMenuOption;
    placeholder?: string;
}

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
    protected readonly lastManager?: Manager;

    public constructor({ content, embeds = [], components = [], files = [], interaction, triggers = new Map(), lastManager }: ManagerConstructOptions) {
        super()
        this.components = components;
        this.triggers = triggers;
        this.embeds = embeds;
        this.files = files;
        this.content = content;

        this.interaction = interaction;
        this.locale = interaction.locale;

        this.lastManager = lastManager;
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
     * 이전 매니저가 존재할 경우 이전 매니저로 즉시 전환합니다.   
     * 이전 매니저가 존재하지 않을 경우 이벤트가 종료되고 삭제 버튼이 생성됩니다.   
     */
    public async endManager(timeout = 5000): Promise<void> {
        if (this.lastManager) {
            this.collector?.stop();
            await this.lastManager.update();
        } else {
            //this.user.gameManager.endEvent();
            this.setComponents();
            this.addRemoveButton(timeout);
            await this.update();
        }
    }

    /**
     * 보냈을 때 업데이트한 메시지를 삭제합니다.
     */
    public async remove(): Promise<void> {
        this.collector?.stop();

        if (!this.message) throw new Error('message is empty');
        else await this.message.delete();
    }


    /**
     * 버튼 컴포넌트를 추가합니다.
     * 
     * @param name - 컴포넌트 이름
     * @param row - 컴포넌트 열 (0~4)
     * @param callback - 선택 콜백함수
     */
    public addButtonSelection(
        name: string,
        row: number,
        callback: ComponentTrigger,
        option: Partial<Omit<APIButtonComponent, 'label' | 'customId'>> = { style: ButtonStyle.Primary }
    ) {
        this.resizeSelection(row);

        this.components[row].addComponents(
            new ButtonBuilder(option)
                .setLabel(bundle.find(this.locale, `select.${name}`))
                .setCustomId(name)
        );
        this.setTrigger(name, callback);

        return this;
    }

    /**
     * 선택메뉴 컴포넌트를 추가합니다.
     * 
     * @param name - 컴포넌트 이름
     * @param row - 컴포넌트 열 (0~4)
     * @param callback - 선택 콜백함수
     * @param list - 아이템 리스트
     * @param reducer - 아이템 리스트 매퍼
     * @param placeholder - 선택 전 힌트
     */
    public addMenuSelection<T>(
        name: string,
        row: number,
        callback: (interaction: MessageComponentInteraction, manager: Manager, item: T) => void,
        { list, reducer, placeholder = "select..." }: MenuSelectOptions<T>) {
        this.resizeSelection(row);

        const getList = () => typeof list === 'function' ? list() : list;
        let currentPage = 0;
        const reoption = () => {
            const currentList = getList();
            const options = currentList.reduce<APISelectMenuOption[]>(
                (acc, elem, index) =>
                    index < currentPage * 8 || index > (currentPage + 1) * 8
                        ? acc
                        : [...acc, reducer ? reducer(elem, index)
                            : {
                                label: `#${index} item`,
                                value: index.toString()
                            }
                        ]
                , currentPage == 0
                    ? []
                    : [{
                        label: `<-- ${currentPage}/${Math.floor(currentList.length / 8) + 1}`,
                        value: '-1'
                    }]
            )
                .concat(currentPage == Math.floor(currentList.length / 8)
                    ? []
                    : [{
                        label: `${currentPage + 1}/${Math.floor(currentList.length / 8) + 1} -->`,
                        value: '-2'
                    }]
                );


            return options.length === 0 ? [{ label: 'empty', value: '-10' }] : options;
        }

        const refreshOptions = () => {
            (this.components[row]?.components[0] as SelectMenuBuilder).setOptions(reoption());
            return this;
        }

        this.components[row].addComponents(
            new SelectMenuBuilder()
                .setCustomId(name)
                .setPlaceholder(placeholder)
                .setOptions(reoption())
        );

        this.setTrigger(name, async (interaction, manager) => {
            if (!(interaction.isSelectMenu() && interaction.component.type == ComponentType.SelectMenu)) return;
            const id = interaction.values[0];
            const list = getList();

            switch (id) {
                case '-1':
                    if (currentPage == 0)
                        Manager.newErrorEmbed(this.interaction, bundle.find(this.locale, "error.first_page"));
                    else currentPage--;
                    break;
                case '-2':
                    if (currentPage + 1 > Math.floor(list.length / 8))
                        Manager.newErrorEmbed(this.interaction, bundle.find(this.locale, "error.last_page"));
                    else currentPage++;
                    break;
                case '-10': break;
                default:
                    callback(interaction, manager, list[Number(id)]);
            }

            await refreshOptions().update();
        })
        return refreshOptions;
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


    public addBackButton(): this {
        if (!this.lastManager) throw new Error('last manager does not exist but trying to add back button?');

        this.addButtonSelection('back_select', 0, () => {
            if (!this.lastManager) throw new Error('last manager does not exist but trying to add back button?');

            this.collector?.stop();
            this.lastManager.update();
        }, { style: ButtonStyle.Secondary });

        return this;
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