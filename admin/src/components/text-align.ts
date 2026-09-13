import { Extension } from "@tiptap/core";

/**
 * Matnni tekislash (chap / markaz / o'ng / eni bo'yicha) — Google Docs kabi.
 *
 * Rasmiy @tiptap/extension-text-align bilan BIR XIL JSON shaklini beradi:
 *   { type: "paragraph", attrs: { textAlign: "center" }, ... }
 * shuning uchun keyinchalik rasmiy paketga o'tilsa, mavjud maqolalar buzilmaydi.
 * Paket o'rnatmaslik uchun shu yerda lokal yozildi.
 */

export type TextAlignValue = "left" | "center" | "right" | "justify";

/** Qaysi nodelarga qo'llanadi. */
const TYPES = ["paragraph", "heading"];

const ALIGNMENTS: TextAlignValue[] = ["left", "center", "right", "justify"];

function isAlignment(value: string): value is TextAlignValue {
  return (ALIGNMENTS as string[]).includes(value);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      /** Tanlangan paragraf/sarlavhani tekislaydi. */
      setTextAlign: (alignment: TextAlignValue) => ReturnType;
      /** Tekislashni olib tashlaydi (standart holatga qaytaradi). */
      unsetTextAlign: () => ReturnType;
    };
  }
}

export const TextAlign = Extension.create({
  name: "textAlign",

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const value = element.style.textAlign;
              return value && isAlignment(value) ? value : null;
            },
            renderHTML: (attributes: { textAlign?: string | null }) =>
              attributes.textAlign
                ? { style: `text-align: ${attributes.textAlign}` }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment) =>
        ({ commands }) => {
          if (!isAlignment(alignment)) return false;
          return TYPES.every((type) =>
            commands.updateAttributes(type, { textAlign: alignment }),
          );
        },
      unsetTextAlign:
        () =>
        ({ commands }) =>
          TYPES.every((type) => commands.resetAttributes(type, "textAlign")),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-l": () => this.editor.commands.setTextAlign("left"),
      "Mod-Shift-e": () => this.editor.commands.setTextAlign("center"),
      "Mod-Shift-r": () => this.editor.commands.setTextAlign("right"),
      "Mod-Shift-j": () => this.editor.commands.setTextAlign("justify"),
    };
  },
});
