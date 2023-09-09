import properties from "properties-reader";

import { Strings } from "@/utils";

const ALL_LANGUAGES = [
  ...["en-US", "en-GB", "es-ES", "da", "de", "fr", "hr", "it", "lt", "hu", "nl", "no", "pl", "pt-BR", "ro"],
  ...["fi", "sv-SE", "vi", "tr", "cs", "el", "bg", "ru", "uk", "hi", "th", "zh-CN", "ja", "zh-TW", "ko"],
] as const;
const DEFAULT_LANGUAGE = ALL_LANGUAGES[0];
declare type ALL_LANGUAGES = (typeof ALL_LANGUAGES)[number];

class Bundle {
  public dictionary: Record<string, properties.Reader> = {};

  constructor() {
    Promise.all(
      ALL_LANGUAGES.map((lang) =>
        new Promise(() => (this.dictionary[lang] = properties(`./assets/bundles/bundle_${lang}.properties`))).catch(
          (_) => {},
        ),
      ),
    );
  }

  public find(lang: string | undefined = DEFAULT_LANGUAGE, key: string): string {
    return String(
      (this.dictionary[lang] ?? this.dictionary[DEFAULT_LANGUAGE])?.get(key) ??
        this.dictionary[DEFAULT_LANGUAGE].get(key) ??
        key,
    );
  }

  public format(lang: string | undefined = DEFAULT_LANGUAGE, key: string, ...args: unknown[]): string {
    return Strings.format(
      this.find(lang, key),
      args.map((arg) => String(arg)),
    );
  }

  public get(name: string | undefined = "", lang: string = DEFAULT_LANGUAGE): string {
    return this.dictionary[lang].get(name)?.toString() ?? "";
  }
}

export default new Bundle();
