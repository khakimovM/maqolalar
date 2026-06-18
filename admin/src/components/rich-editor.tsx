"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage } from "./resizable-image";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";
import { NodeSelection } from "@tiptap/pm/state";
import { InlineMath, BlockMath } from "./math-extension";
import { MathDialog, type MathMode } from "./math-dialog";
import { ImageCropDialog } from "./image-crop-dialog";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
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

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mathInit, setMathInit] = useState<{ latex: string; mode: MathMode } | null>(null);
  const [cropState, setCropState] = useState<{ src: string; pos: number } | null>(null);

  const imageSelected = (() => {
    const sel = editor.state.selection;
    return sel instanceof NodeSelection && sel.node.type.name === "image";
  })();

  function openCrop() {
    const sel = editor.state.selection;
    if (sel instanceof NodeSelection && sel.node.type.name === "image") {
      setCropState({ src: sel.node.attrs.src as string, pos: sel.from });
    }
  }

  async function onCropped(file: File) {
    if (!cropState) return;
    try {
      const url = await uploadArticleImage(file);
      const pos = cropState.pos;
      const node = editor.state.doc.nodeAt(pos);
      const attrs = node ? node.attrs : {};
      editor.view.dispatch(
        editor.view.state.tr.setNodeMarkup(pos, undefined, {
          ...attrs,
          src: url,
          width: null,
          height: null,
        }),
      );
    } catch {
      window.alert("Rasmni saqlab bo'lmadi.");
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


  function setLink() {
    const prev = (editor.getAttributes("link").href as string) || "";
    const url = window.prompt("Havola manzili (URL):", prev || "https://");
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

  async function onImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadArticleImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      window.alert("Rasm yuklab bo'lmadi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-border bg-card p-2 shadow-sm">
      <Btn title="Sarlavha 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Btn>
      <Btn title="Sarlavha 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </Btn>
      <Divider />
      <Btn title="Qalin" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn title="Kursiv" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn title="Tagiga chizilgan" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-4 w-4" />
      </Btn>
      <Btn title="O'chirilgan" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </Btn>
      <Btn title="Kod" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="h-4 w-4" />
      </Btn>
      <Divider />
      <Btn title="Belgili ro'yxat" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Btn>
      <Btn title="Raqamli ro'yxat" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Btn>
      <Btn title="Sitata" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </Btn>
      <Divider />
      <Btn title="Pastki indeks" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
        <SubIcon className="h-4 w-4" />
      </Btn>
      <Btn title="Yuqori indeks" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
        <SupIcon className="h-4 w-4" />
      </Btn>
      <Divider />
      <Btn title="Havola" active={editor.isActive("link")} onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </Btn>
      <Btn title="Havolani olib tashlash" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}>
        <Link2Off className="h-4 w-4" />
      </Btn>
      <Btn title="Rasm" disabled={uploading} onClick={() => fileRef.current?.click()}>
        <ImageIcon className="h-4 w-4" />
      </Btn>
      <Btn title="Rasmni qirqish" disabled={!imageSelected} onClick={openCrop}>
        <Crop className="h-4 w-4" />
      </Btn>
      <Btn title="Ajratuvchi chiziq" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </Btn>
      <Btn title="Formula (LaTeX)" active={editor.isActive("inlineMath") || editor.isActive("blockMath")} onClick={openMath}>
        <Sigma className="h-4 w-4" />
      </Btn>
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

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true },
      }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      Subscript,
      Superscript,
      InlineMath,
      BlockMath,
      Placeholder.configure({
        placeholder: "Maqola matnini shu yerga yozing…",
      }),
    ],
    content: initialContent ?? "",
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
      <EditorContent editor={editor} />
    </div>
  );
}
