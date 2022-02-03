import Discord, { Guild, Snowflake } from "discord.js";

import app from "@뇌절봇/index"
import { Command } from "@뇌절봇/commands"

type defaultPermArgs = {
    commandID: Snowflake | Snowflake[] | Command | Command[],
    guildID?: Snowflake | Snowflake[] | Guild | Guild[],
    permission: boolean
}

type permWithUserIDs = {
    userID: Snowflake | Snowflake[],
} & defaultPermArgs ;

type permWithRollIDs = {
    rollID: Snowflake | Snowflake[],
} & defaultPermArgs;

const argNames = [
    ["commandID", "userID", "guildID", "permission"],
    ["commandID", "userID", "guildID", "permission"]
];


namespace Permission {
    /**
     * 
     * @param args.commandID 
     * @param args.userID
     * @param args.guildID
     * @param args.permission
     */
    export async function setCommandPermission(args: permWithUserIDs): Promise<void>;
    export async function setCommandPermission(args: permWithRollIDs): Promise<void>;

    export async function setCommandPermission(args: permWithUserIDs|permWithRollIDs) {
        let args0 = true;
        let args1: boolean | undefined = undefined;
        Object.keys(args).forEach(key => {
            if(!args0 || args1 === true) args1 = key == "rollID";
            else args0 = args0 ? argNames[0].includes(key) : false;   
        });
        /*
        if(args0) {
            const {commandID, userID, guildID, permission}: permWithUserIDs = args;
            
        } else if(args1) {
            const {commandID, rollID, guildID, permission}: permWithRollIDs = args;

        }
        */
    }
}

export default Permission;