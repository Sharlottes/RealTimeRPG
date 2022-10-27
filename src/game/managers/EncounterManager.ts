import Random from 'random';

import BattleManager from 'game/managers/BattleManager';
import ExchangeManager from 'game/managers/ExchangeManager';
import SelectManager from 'game/managers/SelectManager';
import { User, UnitEntity } from 'game';
import { bundle } from 'assets';
import { Mathf } from 'utils';
import { SelectManagerConstructOptions } from '@type';
import { EmbedBuilder } from 'discord.js';

export default class EncounterManager extends SelectManager {
  private readonly target: UnitEntity;
  private readonly mainEmbed: EmbedBuilder;

  public constructor(options: SelectManagerConstructOptions & { target: UnitEntity }) {
    super(options);
    this.target = options.target;
    this.mainEmbed = new EmbedBuilder().setTitle(bundle.find(this.locale, `event.${this.target.type.name}`));
  }

  public override init() {
    super.init();

    this.setEmbeds([this.mainEmbed]);

    this.addButtonSelection('battle', 0, async () => {
      BattleManager.start<typeof BattleManager>({ user: this.user, interaction: this.interaction, enemy: this.target, update: true });
    });

    this.addButtonSelection('run', 0, () => {
      if (Random.boolean()) {
        const money = Math.floor(Mathf.range(2, 10));
        this.user.money -= money;
        this.mainEmbed.addFields({ name: "Result:", value: "```\n" + bundle.format(this.user.locale, 'event.goblin_run_failed', money) + "\n```" });
      } else {
        this.mainEmbed.addFields({ name: "Result:", value: "```\n" + bundle.find(this.user.locale, 'event.goblin_run_success') + "\n```" });
      }
      this.endManager();
    });


    if (this.target.id == 1) {
      this.addButtonSelection('talking', 0, () => {
        const money = Math.floor(Mathf.range(2, 5));
        this.user.money -= money;
        this.mainEmbed.addFields({ name: "Result:", value: "```\n" + bundle.format(this.user.locale, 'event.goblin_talking', money) + "\n```" });
        this.endManager();
      });
      this.addButtonSelection('exchange', 0, () => ExchangeManager.start<typeof ExchangeManager>({ user: this.user, interaction: this.interaction, target: this.target, update: true }));
    }
  }
}