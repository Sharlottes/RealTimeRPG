export { default as Command, CommandCategory } from "./Command"; // 명령어 인터페이스

// 위까지는 다른 모듈들 정의
// 아래서부턴 명령어 목록 선언

import { ApplicationCommand, Collection, Guild, GuildResolvable } from "discord.js";
import { Routes } from "discord-api-types/v9";
import fs from "fs";

import { Command } from "@뇌절봇/commands";
import app, { CommandInfo } from "@뇌절봇/index"
import config from "@뇌절봇/config.json";

const ignores: string[] = [
    "index.ts", "Command.ts"
];
namespace CommandManager {
    export const commands: Collection<string, Command> = new Collection();
    
    /**
     * 
     * @param command
     * @returns 명령어 추가여부
     */
    export async function register(command: Command): Promise<boolean> {
        const commandName: string = command.builder.name;

        if(!commands.has(commandName)) {
            commands.set(commandName, command);
            return true;
        } else {
            return false;
        }
    }

    export async function reloadCommands() {
        commands.clear();

        const globals: fs.Dirent[] = []; 
        fs.readdirSync((config.debug ? "./src" : ".") + "/commands/global/", { withFileTypes: true, encoding: "utf-8"})
        .forEach(file => {
            if(file.isFile() && !ignores.includes(file.name)) globals.push(file);
        });
        const guilds: fs.Dirent[] = []; 
        fs.readdirSync((config.debug ? "./src" : ".") + "/commands/guild", { withFileTypes: true, encoding: "utf-8" })
        .forEach(file => {
            if(file.isFile() && !ignores.includes(file.name)) guilds.push(file);
        });

        const rootDir = globals.concat(guilds);

        for(let i = 0, n = rootDir.length; i < n; i++) {
            const file = rootDir[i];
            const code = await import(`@뇌절봇/commands/${i >= globals.length ? "guild" : "global"}/` + file.name);
            if(typeof code.default == "function") {
                const command = new code.default();
                if(command instanceof Command && (app.config.debug || !command.debug)) {
                    if(!commands.has(command.builder.name)) {
                        commands.set(command.builder.name, command);
                    }
                    console.log(`[Command] register [ /${command.builder.name} ] to ${command.category} command.`);
                }
            }
        }

        return commands;
    }

    /**
     * 
     * @param target 
     */
    export async function refreshCommand(target: "global"): Promise<ApplicationCommand<{guild: GuildResolvable;}>[]>;
    /**
     * 
     * @param target
     * @param guild 
     */
    export async function refreshCommand(target: "guild", guild: Guild): Promise<ApplicationCommand<{guild: GuildResolvable;}>[]>;
    
    export async function refreshCommand(target: "global" | "guild", guild?: Guild)
    : Promise<ApplicationCommand<{guild: GuildResolvable;}>[]> {
        // 기존 명령어 삭제
        const application = app.client.application;
        if(application == null || guild == undefined) return [];

        const commandPath = target == "global" ? 
            Routes.applicationCommands(application.id) : 
            Routes.applicationGuildCommands(application.id, guild.id);
    
        const data = await app.rest.get(commandPath) as CommandInfo[];
        
        const promiese = [];
        for(let i = 0; i < data.length; i++) {
            const command: CommandInfo = data[i];
            promiese.push(app.rest.delete(`${commandPath}/${command.id}`));
        }
        
        await Promise.all(promiese);

        // 명령어 재선언
        const createSeq: any[] = [];
        
        commands.forEach(command => {
            if(command.category == target) {
                const data = command.setHiddenConfig(command.builder.toJSON());
                createSeq.push(application.commands.create(data, target == "global" ? undefined : guild.id));
            }
        })

        const result = await Promise.all(createSeq)

        return result;
    }
}

// 타입스크립트나 모듈 타입으로 코딩할 때 사용하는 내보내기 선언.
// require 방식으로 하고 싶으면 이렇게 index 파일 만들지 말고 해당 모듈내에서 export default 혹은 export 해주면 댐.
// 자세한 정보는 help.ts 참고
export default CommandManager;
