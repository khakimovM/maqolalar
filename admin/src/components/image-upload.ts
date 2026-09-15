import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

/**
 * Rasmni JOYLASHTIRISH va TASHLASH orqali qo'shish (Ctrl+V, drag&drop).
 *
 * NEGA JOY-BELGISI (placeholder) DECORATION KERAK
 * -----------------------------------------------
 * Yuklash asinxron: `await` tugaguncha foydalanuvchi matn yozishi, o'chirishi
 * yoki boshqa rasm qo'shishi mumkin. Yuklash boshlanган paytdagi pozitsiyani
 * eslab qolib, keyin ishlatish ESKI pozitsiyaga yozishni anglatadi — rasm
 * noto'g'ri joyga tushadi.
 *
 * Decoration esa har tranzaksiyada `set.map(tr.mapping, tr.doc)` bilan hujjat
 * bilan birga KO'CHIB yuradi. Shuning uchun `await` dan keyin joyni decoration
 * to'plamidan qayta so'raymiz — u har doim to'g'ri bo'ladi. Decoration topilmasa
 * (foydalanuvchi o'sha joyni o'chirgan) — hech narsa qo'yilmaydi.
 */

/** Backend `multer.config.ts` bilan bir xil ro'yxat. */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type UploadMeta =
  | { kind: "add"; id: object; pos: number }
  | { kind: "remove"; id: object };

const uploadKey = new PluginKey<DecorationSet>("imageUpload");

function placeholderPlugin() {
  return new Plugin<DecorationSet>({
    key: uploadKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set) {
        // Hujjat o'zgarsa joy-belgisi ham u bilan birga siljiydi
        let next = set.map(tr.mapping, tr.doc);
        const meta = tr.getMeta(uploadKey) as UploadMeta | undefined;
        if (meta?.kind === "add") {
          const el = document.createElement("span");
          el.className = "rt-upload";
          el.textContent = "Rasm yuklanmoqda…";
          next = next.add(tr.doc, [
            Decoration.widget(meta.pos, el, { id: meta.id, side: 1 }),
          ]);
        } else if (meta?.kind === "remove") {
          const id = meta.id;
          next = next.remove(next.find(undefined, undefined, (spec) => spec.id === id));
        }
        return next;
      },
    },
    props: {
      decorations: (state) => uploadKey.getState(state),
    },
  });
}

function findPlaceholder(state: EditorState, id: object): number | null {
  const set = uploadKey.getState(state);
  const found = set?.find(undefined, undefined, (spec) => spec.id === id);
  return found && found.length > 0 ? found[0].from : null;
}

/** Ruxsat etilgan rasmlarni ajratadi; `seen` — umuman rasm bormi. */
function pickImages(list: FileList | null | undefined) {
  const ok: File[] = [];
  let seen = 0;
  let rejected: string | null = null;
  for (const file of Array.from(list ?? [])) {
    if (!file.type.startsWith("image/")) continue;
    seen += 1;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      rejected = "Faqat JPEG, PNG va WebP rasmlar qabul qilinadi.";
      continue;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      rejected = "Rasm hajmi 5 MB dan oshmasligi kerak.";
      continue;
    }
    ok.push(file);
  }
  return { ok, seen, rejected };
}

async function startUpload(
  view: EditorView,
  file: File,
  pos: number,
  upload: (file: File) => Promise<string>,
  onError?: (message: string) => void,
) {
  const id = {};
  view.dispatch(view.state.tr.setMeta(uploadKey, { kind: "add", id, pos } as UploadMeta));
  try {
    const url = await upload(file);
    const at = findPlaceholder(view.state, id);
    // Joy-belgisi yo'q — foydalanuvchi o'sha joyni o'chirgan, hech narsa qo'ymaymiz
    if (at === null) return;

    const { state } = view;
    const rowType = state.schema.nodes.imageRow;
    const cellType = state.schema.nodes.rowImage;
    const tr = state.tr.setMeta(uploadKey, { kind: "remove", id } as UploadMeta);
    if (rowType && cellType) {
      const $at = state.doc.resolve(at);
      // Rasm qatori — blok node, shuning uchun uni joriy blokdan KEYIN qo'yamiz
      const insertAt = $at.depth > 0 ? $at.after(1) : at;
      tr.insert(
        insertAt,
        rowType.create({ align: "center", float: "none", width: null }, [
          cellType.create({ src: url, alt: null, share: 1 }),
        ]),
      );
    }
    view.dispatch(tr.scrollIntoView());
  } catch {
    view.dispatch(view.state.tr.setMeta(uploadKey, { kind: "remove", id } as UploadMeta));
    onError?.("Rasm yuklab bo'lmadi.");
  }
}

export interface ImageUploadOptions {
  /** Faylni serverga yuklaydi va public URL qaytaradi. */
  upload: (file: File) => Promise<string>;
  onError?: (message: string) => void;
}

export const ImageUpload = Extension.create<ImageUploadOptions>({
  name: "imageUpload",

  addOptions() {
    return {
      upload: async () => "",
      onError: undefined,
    };
  },

  addProseMirrorPlugins() {
    const { upload, onError } = this.options;
    return [
      placeholderPlugin(),
      new Plugin({
        props: {
          handlePaste(view, event) {
            const { ok, seen, rejected } = pickImages(event.clipboardData?.files);
            if (seen === 0) return false;
            event.preventDefault();
            if (rejected) onError?.(rejected);
            const at = view.state.selection.from;
            ok.forEach((file) => void startUpload(view, file, at, upload, onError));
            return true;
          },

          handleDrop(view, event, _slice, moved) {
            // Muharrir ICHIDAGI sudrashga aralashmaymiz
            if (moved) return false;
            const { ok, seen, rejected } = pickImages(event.dataTransfer?.files);
            if (seen === 0) return false;
            event.preventDefault();
            if (rejected) onError?.(rejected);
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const at = coords?.pos ?? view.state.selection.from;
            ok.forEach((file) => void startUpload(view, file, at, upload, onError));
            return true;
          },
        },
      }),
    ];
  },
});
