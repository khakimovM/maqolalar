"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage } from "./resizable-image";
import { ImageRow, RowImage, findImageRow } from "./image-row";
import { ImageUpload } from "./image-upload";
import { normalizeContent, MAX_ROW_IMAGES } from "@/lib/editor-content";
import { TextAlign } from "./text-align";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";
import { NodeSelection } from "@tiptap/pm/state";
import { InlineMath, BlockMath } from "./math-extension";
import { MathDialog, type MathMode } from "./math-dialog";
import { ImageCropDialog } from "./image-crop-dialog";
import { useToast } from "@/components/toast";
import { usePrompt } from "@/components/confirm-dialog";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading,
  ChevronDown,
  Smile,
  List,
  ListOrdered,
  Quote,
  Link2,
  Link2Off,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Image as ImageIcon,
  Minus,
  Undo2,
  Redo2,
  Sigma,
  Crop,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  GripVertical,
  Columns2,
  Type,
  Plus,
} from "lucide-react";
import { uploadArticleImage } from "@/lib/admin";

type Json = Record<string, unknown>;

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 " +
        (active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" />;
}

/** Tashqariga bosilganda yopiladigan ochiluvchi ro'yxat (dropdown). */
function useCloseOnOutside(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);
  return ref;
}

/**
 * Asboblar panelidagi toifa menyusi.
 *
 * NEGA: panelda 25 dan ortiq tugma bor edi — tor ekranda ular bir necha qatorga
 * o'ralib, yopishqoq panel ekranning yarmini egallab qo'yardi. Bir toifadagi
 * amallar bitta menyuga yig'ilgach, panel bitta qatorga sig'adi.
 */
function Menu({
  title,
  trigger,
  active,
  children,
}: {
  title: string;
  trigger: React.ReactNode;
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useCloseOnOutside(open, close);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={
          "flex h-8 items-center gap-0.5 rounded-md px-1.5 transition-colors " +
          (active || open
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground")
        }
      >
        {trigger}
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-52 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg">
          {children(close)}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={hint}
      onClick={onClick}
      className={
        "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors disabled:opacity-40 " +
        (active ? "bg-primary/10 text-primary" : "hover:bg-muted disabled:hover:bg-transparent")
      }
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "😏", "🤔", "🤨", "😐", "😴", "😬", "🙄", "😮", "😯", "😢", "😭", "😤", "😠", "😡", "🤯", "😱", "🥺", "🤗", "🤭", "🤫", "👍", "👎", "👏", "🙌", "👌", "✌️", "🤞", "🤝", "🙏", "💪", "👋", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "🔥", "⭐", "✨", "🎉", "🎊", "✅", "❌", "❗", "❓", "💯", "📌", "📝", "📚", "🔖", "💡", "⚡", "🌟"];

function EmojiMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Emoji"
        aria-label="Emoji"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 grid max-h-56 w-64 grid-cols-8 gap-0.5 overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-lg">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => editor.chain().focus().insertContent(e).run()}
              className="flex h-7 w-7 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HeadingMenu({ editor }: { editor: Editor }) {
  const levels = [1, 2, 3, 4, 5, 6] as const;
  const current = levels.find((l) => editor.isActive("heading", { level: l }));

  return (
    <Menu
      title="Sarlavha darajasi"
      active={!!current}
      trigger={
        <>
          <Heading className="h-4 w-4" />
          <span className="text-xs font-medium">{current ? "H" + current : "¶"}</span>
        </>
      }
    >
      {(close) => (
        <>
          <MenuItem
            icon={<span className="text-sm">¶</span>}
            label="Oddiy matn"
            active={!current}
            onClick={() => {
              editor.chain().focus().setParagraph().run();
              close();
            }}
          />
          {levels.map((l) => (
            <MenuItem
              key={l}
              icon={<span className="text-[0.7rem] font-semibold">H{l}</span>}
              label={`Sarlavha ${l}`}
              active={current === l}
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: l }).run();
                close();
              }}
            />
          ))}
        </>
      )}
    </Menu>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const rowFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const prompt = usePrompt();
  const [mathInit, setMathInit] = useState<{ latex: string; mode: MathMode } | null>(null);
  const [cropState, setCropState] = useState<{ src: string; pos: number } | null>(null);

  // Joriy tekislash: alohida qiymat yo'q bo'lsa — "left" (standart)
  const alignValue =
    (["center", "right", "justify"] as const).find((a) =>
      editor.isActive({ textAlign: a }),
    ) ?? "left";

  /** Tanlangan rasm — qator ichidagisi ham, matn ichidagisi ham. */
  const selectedImage = (() => {
    const sel = editor.state.selection;
    if (!(sel instanceof NodeSelection)) return null;
    const name = sel.node.type.name;
    if (name !== "image" && name !== "rowImage") return null;
    return { src: sel.node.attrs.src as string, pos: sel.from };
  })();

  /** Joriy tanlov qaysi rasm qatorida turibdi (yonma-yon qo'shish uchun). */
  const activeRow = findImageRow(editor.state);

  function openCrop() {
    if (selectedImage) setCropState(selectedImage);
  }

  async function onCropped(file: File) {
    if (!cropState) return;
    try {
      const url = await uploadArticleImage(file);
      const { state } = editor.view;
      const node = state.doc.nodeAt(cropState.pos);
      // Dialog ochiq turganda hujjat o'zgargan bo'lishi mumkin — o'sha rasmligini
      // tekshirmasak, qirqilgan rasm BOSHQA node ustiga yozilib ketardi.
      if (!node || node.attrs.src !== cropState.src) {
        toast({ title: "Rasm o'zgardi — qirqishni qaytadan boshlang." });
        return;
      }
      const attrs =
        node.type.name === "rowImage"
          ? { ...node.attrs, src: url }
          : { ...node.attrs, src: url, width: null, height: null };
      editor.view.dispatch(state.tr.setNodeMarkup(cropState.pos, undefined, attrs));
    } catch {
      toast({ title: "Rasmni saqlab bo'lmadi." });
    } finally {
      setCropState(null);
    }
  }


  function openMath() {
    const sel = editor.state.selection;
    if (sel instanceof NodeSelection) {
      const n = sel.node;
      if (n.type.name === "inlineMath" || n.type.name === "blockMath") {
        setMathInit({
          latex: (n.attrs.latex as string) || "",
          mode: n.type.name === "blockMath" ? "block" : "inline",
        });
        return;
      }
    }
    setMathInit({ latex: "", mode: "inline" });
  }

  function submitMath(latex: string, mode: MathMode) {
    const type = mode === "block" ? "blockMath" : "inlineMath";
    const sel = editor.state.selection;
    const onMathNode =
      sel instanceof NodeSelection &&
      (sel.node.type.name === "inlineMath" || sel.node.type.name === "blockMath");
    if (!latex) {
      setMathInit(null);
      return;
    }
    if (onMathNode && sel instanceof NodeSelection) {
      if (sel.node.type.name === type) {
        editor.chain().focus().updateAttributes(type, { latex }).run();
      } else {
        editor.chain().focus().deleteSelection().insertContent({ type, attrs: { latex } }).run();
      }
    } else {
      editor.chain().focus().insertContent({ type, attrs: { latex } }).run();
    }
    setMathInit(null);
  }


  async function setLink() {
    const prev = (editor.getAttributes("link").href as string) || "";
    const url = await prompt({
      title: "Havola qo'shish",
      placeholder: "https://...",
      defaultValue: prev || "https://",
      confirmText: "Qo'shish",
    });
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }

  /**
   * Rasm qo'yish. ILGARI `setImage()` ishlatilardi — u `insertContent` orqali
   * TANLOVNI ALMASHTIRARDI, ya'ni rasm tanlangan holda tugma bosilsa yangi rasm
   * eskisining O'RNIGA tushardi. Endi har doim yangi qator qo'yiladi.
   */
  async function onImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadArticleImage(file);
      editor.chain().focus().insertImageRow([url]).run();
    } catch {
      toast({ title: "Rasm yuklab bo'lmadi." });
    } finally {
      setUploading(false);
    }
  }

  /** Joriy qatorga yonma-yon rasm qo'shish. */
  async function onRowImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadArticleImage(file);
      editor.chain().focus().addImageToRow(url).run();
    } catch {
      toast({ title: "Rasm yuklab bo'lmadi." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rt-toolbar sticky top-0 z-20 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-border bg-card p-2 shadow-sm">
      <HeadingMenu editor={editor} />
      <Divider />

      {/* Eng ko'p ishlatiladigan uchtasi — to'g'ridan-to'g'ri */}
      <Btn title="Qalin" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn title="Kursiv" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn title="Tagiga chizilgan" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-4 w-4" />
      </Btn>

      <Menu
        title="Matn ko'rinishi"
        active={
          editor.isActive("strike") ||
          editor.isActive("code") ||
          editor.isActive("subscript") ||
          editor.isActive("superscript")
        }
        trigger={<Type className="h-4 w-4" />}
      >
        {(close) => (
          <>
            <MenuItem
              icon={<Strikethrough className="h-4 w-4" />}
              label="O'chirilgan"
              active={editor.isActive("strike")}
              onClick={() => { editor.chain().focus().toggleStrike().run(); close(); }}
            />
            <MenuItem
              icon={<Code className="h-4 w-4" />}
              label="Kod"
              active={editor.isActive("code")}
              onClick={() => { editor.chain().focus().toggleCode().run(); close(); }}
            />
            <MenuItem
              icon={<SubIcon className="h-4 w-4" />}
              label="Pastki indeks"
              active={editor.isActive("subscript")}
              onClick={() => { editor.chain().focus().toggleSubscript().run(); close(); }}
            />
            <MenuItem
              icon={<SupIcon className="h-4 w-4" />}
              label="Yuqori indeks"
              active={editor.isActive("superscript")}
              onClick={() => { editor.chain().focus().toggleSuperscript().run(); close(); }}
            />
          </>
        )}
      </Menu>

      <Divider />

      <Menu
        title="Tekislash"
        active={alignValue !== "left"}
        trigger={
          alignValue === "center" ? <AlignCenter className="h-4 w-4" />
          : alignValue === "right" ? <AlignRight className="h-4 w-4" />
          : alignValue === "justify" ? <AlignJustify className="h-4 w-4" />
          : <AlignLeft className="h-4 w-4" />
        }
      >
        {(close) => (
          <>
            {([
              ["left", "Chapga", AlignLeft],
              ["center", "Markazga", AlignCenter],
              ["right", "O'ngga", AlignRight],
              ["justify", "Eni bo'yicha", AlignJustify],
            ] as const).map(([value, label, Icon]) => (
              <MenuItem
                key={value}
                icon={<Icon className="h-4 w-4" />}
                label={label}
                active={alignValue === value}
                onClick={() => { editor.chain().focus().setTextAlign(value).run(); close(); }}
              />
            ))}
          </>
        )}
      </Menu>

      <Menu
        title="Ro'yxat va sitata"
        active={
          editor.isActive("bulletList") ||
          editor.isActive("orderedList") ||
          editor.isActive("blockquote")
        }
        trigger={<List className="h-4 w-4" />}
      >
        {(close) => (
          <>
            <MenuItem
              icon={<List className="h-4 w-4" />}
              label="Belgili ro'yxat"
              active={editor.isActive("bulletList")}
              onClick={() => { editor.chain().focus().toggleBulletList().run(); close(); }}
            />
            <MenuItem
              icon={<ListOrdered className="h-4 w-4" />}
              label="Raqamli ro'yxat"
              active={editor.isActive("orderedList")}
              onClick={() => { editor.chain().focus().toggleOrderedList().run(); close(); }}
            />
            <MenuItem
              icon={<Quote className="h-4 w-4" />}
              label="Sitata"
              active={editor.isActive("blockquote")}
              onClick={() => { editor.chain().focus().toggleBlockquote().run(); close(); }}
            />
          </>
        )}
      </Menu>

      <Menu title="Rasm" trigger={<ImageIcon className="h-4 w-4" />}>
        {(close) => (
          <>
            <MenuItem
              icon={<ImageIcon className="h-4 w-4" />}
              label="Rasm qo'shish"
              disabled={uploading}
              onClick={() => { fileRef.current?.click(); close(); }}
            />
            <MenuItem
              icon={<Columns2 className="h-4 w-4" />}
              label="Yonma-yon rasm qo'shish"
              hint={activeRow ? undefined : "Avval rasm qatorini tanlang"}
              disabled={uploading || !activeRow || activeRow.node.childCount >= MAX_ROW_IMAGES}
              onClick={() => { rowFileRef.current?.click(); close(); }}
            />
            <MenuItem
              icon={<Crop className="h-4 w-4" />}
              label="Rasmni qirqish"
              hint={selectedImage ? undefined : "Avval rasmni tanlang"}
              disabled={!selectedImage}
              onClick={() => { openCrop(); close(); }}
            />
          </>
        )}
      </Menu>

      <Menu
        title="Qo'shish"
        active={editor.isActive("link") || editor.isActive("inlineMath") || editor.isActive("blockMath")}
        trigger={<Plus className="h-4 w-4" />}
      >
        {(close) => (
          <>
            <MenuItem
              icon={<Link2 className="h-4 w-4" />}
              label="Havola"
              active={editor.isActive("link")}
              onClick={() => { close(); void setLink(); }}
            />
            <MenuItem
              icon={<Link2Off className="h-4 w-4" />}
              label="Havolani olib tashlash"
              disabled={!editor.isActive("link")}
              onClick={() => { editor.chain().focus().unsetLink().run(); close(); }}
            />
            <MenuItem
              icon={<Sigma className="h-4 w-4" />}
              label="Formula (LaTeX)"
              active={editor.isActive("inlineMath") || editor.isActive("blockMath")}
              onClick={() => { close(); openMath(); }}
            />
            <MenuItem
              icon={<Minus className="h-4 w-4" />}
              label="Ajratuvchi chiziq"
              onClick={() => { editor.chain().focus().setHorizontalRule().run(); close(); }}
            />
          </>
        )}
      </Menu>

      <EmojiMenu editor={editor} />
      <Divider />
      <Btn title="Bekor qilish" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </Btn>
      <Btn title="Qaytarish" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </Btn>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onImagePick}
      />
      <input
        ref={rowFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onRowImagePick}
      />

      {mathInit && (
        <MathDialog
          initial={mathInit}
          onSubmit={submitMath}
          onClose={() => setMathInit(null)}
        />
      )}

      {cropState && (
        <ImageCropDialog
          src={cropState.src}
          onCropped={onCropped}
          onClose={() => setCropState(null)}
        />
      )}
    </div>
  );
}

export function RichEditor({
  initialContent,
  onChange,
}: {
  initialContent?: Json | null;
  onChange: (json: Json) => void;
}) {
  const [, force] = useState(0);
  const { toast } = useToast();
  // Muharrir BIR MARTA yaratiladi — toast'ni ref orqali uzatamiz, aks holda
  // eski render'ning closure'i qotib qolardi.
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: { openOnClick: false, autolink: true },
      }),
      ResizableImage.configure({ inline: true, allowBase64: false }),
      ImageRow,
      RowImage,
      ImageUpload.configure({
        upload: uploadArticleImage,
        onError: (message: string) => toastRef.current({ title: message }),
      }),
      TextAlign,
      Subscript,
      Superscript,
      InlineMath,
      BlockMath,
      Placeholder.configure({
        placeholder: "Maqola matnini shu yerga yozing…",
      }),
    ],
    content: normalizeContent(initialContent) ?? "",
    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[320px] px-4 py-3 font-serif text-[1.05rem] leading-relaxed focus:outline-none",
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => onChange(editor.getJSON() as Json),
  });

  // Toolbar holatini har tranzaksiyada yangilab turamiz
  useEffect(() => {
    if (!editor) return;
    const update = () => force((x) => x + 1);
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="h-[380px] animate-pulse rounded-xl border border-border bg-muted/30" />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background focus-within:border-primary/50">
      <Toolbar editor={editor} />
      {/*
        Sudrab ko'chirish ushlagichi. `nested` — kursor blokning chap chetida
        bo'lsa BUTUN blok (masalan rasm qatori), rasm ustida bo'lsa FAQAT O'SHA
        rasm sudraladi. `allowedContainers` ATAYLAB berilmagan: u depth 1 dagi
        oddiy paragraflarni tekshiruvdan o'tkazmay, ushlagichni butunlay
        yo'qotib yuboradi.
      */}
      <DragHandle editor={editor} nested>
        <span className="drag-handle" title="Sudrab ko'chirish">
          <GripVertical className="h-4 w-4" />
        </span>
      </DragHandle>
      <EditorContent editor={editor} />
    </div>
  );
}
