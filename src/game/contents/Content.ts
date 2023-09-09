import bundle from "@/assets/Bundle";
import User from "@/game/User";

export default class Content {
  readonly name: string;
  readonly localName: (user?: User | string | undefined) => string;
  readonly description: (user?: User | string | undefined) => string;
  readonly details: (user?: User | string | undefined) => string;

  constructor(name: string, type = "other") {
    this.name = name;
    this.localName = (user?: User | string | undefined) =>
      bundle.find(typeof user === "string" ? user : user?.locale, `content.${type}.${name}.name`);
    this.description = (user?: User | string | undefined) =>
      bundle.find(typeof user === "string" ? user : user?.locale, `content.${type}.${name}.description`);
    this.details = (user?: User | string | undefined) =>
      bundle.find(typeof user === "string" ? user : user?.locale, `content.${type}.${name}.details`);
  }
}
