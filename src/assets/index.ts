import properties from "properties-reader";

import { Strings } from "@/utils";

namespace Assets {
  const rootDir = "./assets/";
  const dictionary: Map<string, properties.Reader> = new Map();

  export function init() {
    [
      "da",
      "de",
      "en-GB",
      "en-US",
      "es-ES",
      "fr",
      "hr",
      "it",
      "lt",
      "hu",
      "nl",
      "no",
      "pl",
      "pt-BR",
      "ro",
      "fi",
      "sv-SE",
      "vi",
      "tr",
      "cs",
      "el",
      "bg",
      "ru",
      "uk",
      "hi",
      "th",
      "zh-CN",
      "ja",
      "zh-TW",
      "ko",
    ].forEach((lang) => {
      try {
        dictionary.set(lang, properties(`${rootDir}bundles/bundle_${lang}.properties`));
      } catch (ignore) {}
    });
  }

  export namespace bundle {
    export const defaultLocale = "en-US";

    export function find(lang = defaultLocale, key: string): string {
      return String(
        (dictionary.get(lang) ?? dictionary.get(defaultLocale))?.get(key) ??
          dictionary.get(defaultLocale)?.get(key) ??
          key,
      );
    }

    export function format(lang = defaultLocale, key: string, ...args: unknown[]) {
      return Strings.format(find(lang, key), args as string[]);
    }

    export function get(name = "", lang = defaultLocale) {
      if (dictionary.has(lang)) {
        return dictionary.get(lang)?.get(name);
      } else {
        return "";
      }
    }
  }
}

export default Assets;
export const bundle = Assets.bundle;
