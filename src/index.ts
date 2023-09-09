import { GatewayIntentBits } from "discord.js";
import { Client } from "discordx";
import dotenv from "dotenv";
import "@/utils/kotlinLike";
import "@/command";

import User from "./game/User";
import Game from "./game";
import Vars from "./Vars";

dotenv.config();

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  simpleCommand: {
    prefix: "!",
  },
  botGuilds: process.env.NODE_ENV === "production" ? undefined : [process.env.TEST_GUILD_ID],
});

const time = Date.now();

Game.init();
console.log(`asset & game initialization has been done in ${Date.now() - time}ms`);

client.login(process.env.BOT_TOKEN);

client
  .once("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}(${client.application?.id}): ${Date.now() - time}ms`);
    await client.clearApplicationCommands(
      ...(process.env.NODE_ENV === "production" ? [] : [process.env.TEST_GUILD_ID]),
    );
    await client.initApplicationCommands();
  })
  .on("messageCreate", (message) => {
    client.executeCommand(message);
  })
  .on("interactionCreate", (interaction) => {
    const user =
      Vars.users.find((u) => u.id == interaction.user.id) ||
      Vars.users[Vars.users.push(new User(interaction.user)) - 1];
    user.updateData(interaction);

    client.executeInteraction(interaction);
  });

process
  .on("unhandledRejection", async (err) => {
    console.error(`[${new Date().toISOString()}] Unhandled Promise Rejection:\n`, err);
  })
  .on("uncaughtException", async (err) => {
    console.error(`[${new Date().toISOString()}] Uncaught Promise Exception:\n`, err);
  })
  .on("uncaughtExceptionMonitor", async (err) => {
    console.error(`[${new Date().toISOString()}] Uncaught Promise Exception (Monitor):\n`, err);
  });
