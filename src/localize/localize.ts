import * as cs from "./languages/cs.json";
import * as de from "./languages/de.json";
import * as dk from "./languages/dk.json";
import * as en from "./languages/en.json";
import * as enGB from "./languages/en-GB.json";
import * as es from "./languages/es.json";
import * as fi from "./languages/fi.json";
import * as fr from "./languages/fr.json";
import * as it from "./languages/it.json";
import * as nl from "./languages/nl.json";
import * as pl from "./languages/pl.json";
import * as ptBR from "./languages/pt-BR.json";
import * as ptPT from "./languages/pt-PT.json";
import * as ru from "./languages/ru.json";
import * as sk from "./languages/sk.json";
import * as sv from "./languages/sv.json";

const LANGUAGES: Record<string, unknown> = {
  cs,
  de,
  dk,
  en,
  en_GB: enGB,
  es,
  fi,
  fr,
  it,
  nl,
  pl,
  pt_BR: ptBR,
  pt_PT: ptPT,
  ru,
  sk,
  sv,
};

const DEFAULT_LANGUAGE = "en";

function getTranslatedString(key: string, lang: string): string | undefined {
  try {
    return key.split(".").reduce((o, i) => (o as Record<string, unknown>)[i], LANGUAGES[lang]) as string;
  } catch (_) {
    return undefined;
  }
}

export function localize(key: string, fallback: string | undefined = undefined) {
  const lang = (localStorage.getItem("selectedLanguage") || DEFAULT_LANGUAGE).replace(/['"]+/g, "").replace("-", "_");;
  let translated = getTranslatedString(key, lang);

  if (!translated) {
    translated = getTranslatedString(key, DEFAULT_LANGUAGE);
  }

  return translated ?? fallback ?? key;
}
