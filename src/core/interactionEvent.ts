type InteractionEventListener = (interaction: Discord.BaseInteraction) => unknown;

class InteractionEvent {
  private callbacks: Set<InteractionEventListener> = new Set();

  public setClient(client: Discord.Client) {
    client.on("interactionCreate", (interaction) => {
      for (const callback of this.callbacks) {
        callback(interaction);
      }
    });
  }

  public on(callback: InteractionEventListener) {
    this.callbacks.add(callback);
  }

  public off(callback: InteractionEventListener) {
    this.callbacks.delete(callback);
  }
}

declare module "discord.js" {
  interface Client {
    interactionEvent: InteractionEvent;
  }
}

export default new InteractionEvent();
