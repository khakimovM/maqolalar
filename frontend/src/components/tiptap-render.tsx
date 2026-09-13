import React from "react";
import katex from "katex";

/**
 * Link href'ini xavfsizlaydi — faqat http(s) va mailto ruxsat etiladi.
 * `javascript:`, `data:` kabi protokollar XSS xavfi tug'diradi, shuning uchun
 * ular "#" ga almashtiriladi.
 */
export function safeHref(href: unknown): string {
  if (typeof href !== "string") return "#";
  const trimmed = href.trim();
  // nisbiy / anchor havolalar xavfsiz
  if (/^(\/|#|\.)/.test(trimmed)) return trimmed;
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return "#";
}

/**
 * Rasm src'ini xavfsizlaydi — faqat http(s), nisbiy (/, .) va protokol-relativ
 * (//) manbalar ruxsat etiladi. `data:` (SVG data-URI XSS), `javascript:`,
 * `blob:` kabi protokollar rad etiladi (null qaytadi → rasm umuman render qilinmaydi).
 */
export function safeImageSrc(src: unknown): string | null {
  if (typeof src !== "string") return null;
  const trimmed = src.trim();
  if (trimmed === "") return null;
  if (/^(\/|\.)/.test(trimmed)) return trimmed; // nisbiy yoki protokol-relativ (//)
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

/** LaTeX'ni KaTeX HTML satriga aylantiradi (xato bo'lsa ham yiqilmaydi). */
function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return latex;
  }
}

interface TNode {
  type: string;
  content?: TNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
}

function renderText(node: TNode, key: React.Key): React.ReactNode {
  let el: React.ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        el = <strong>{el}</strong>;
        break;
      case "italic":
        el = <em>{el}</em>;
        break;
      case "underline":
        el = <u>{el}</u>;
        break;
      case "strike":
        el = <s>{el}</s>;
        break;
      case "code":
        el = (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
            {el}
          </code>
        );
        break;
      case "superscript":
        el = <sup>{el}</sup>;
        break;
      case "subscript":
        el = <sub>{el}</sub>;
        break;
      case "link":
        el = (
          <a
            href={safeHref(mark.attrs?.href)}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {el}
          </a>
        );
        break;
    }
  }
  return <React.Fragment key={key}>{el}</React.Fragment>;
}

/**
 * Paragraf/sarlavha tekislashi (admin muharriridagi textAlign atributi).
 * Faqat ma'lum qiymatlar qabul qilinadi.
 */
function alignStyle(node: TNode): React.CSSProperties | undefined {
  const value = node.attrs?.textAlign;
  if (value === "center" || value === "right" || value === "justify" || value === "left") {
    return { textAlign: value };
  }
  return undefined;
}

function children(node: TNode): React.ReactNode {
  return node.content?.map((c, i) => renderNode(c, i));
}

function renderNode(node: TNode, key: React.Key): React.ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return (
        <p key={key} className="mb-5 leading-[1.8]" style={alignStyle(node)}>
          {children(node)}
        </p>
      );
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const sizes: Record<number, string> = {
        1: "text-4xl",
        2: "text-3xl",
        3: "text-2xl",
        4: "text-xl",
        5: "text-lg",
        6: "text-base",
      };
      const cls =
        "mt-8 mb-3 font-serif font-medium " + (sizes[level] ?? "text-xl");
      const Tag = (`h${Math.min(6, Math.max(1, level))}`) as keyof React.JSX.IntrinsicElements;
      return (
        <Tag key={key} className={cls} style={alignStyle(node)}>
          {children(node)}
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="mb-5 list-disc space-y-2 pl-6 leading-[1.8]">
          {children(node)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="mb-5 list-decimal space-y-2 pl-6 leading-[1.8]">
          {children(node)}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children(node)}</li>;
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-6 border-l-2 border-primary pl-5 italic text-muted-foreground"
        >
          {children(node)}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre
          key={key}
          className="my-6 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm"
        >
          <code>{children(node)}</code>
        </pre>
      );
    case "image": {
      const imgSrc = safeImageSrc(node.attrs?.src);
      if (!imgSrc) return null; // xavfsiz bo'lmagan manba — rasm ko'rsatilmaydi
      const align = String(node.attrs?.align ?? "center");
      const wrap = String(node.attrs?.wrap ?? "none");
      const width = node.attrs?.width ? String(node.attrs.width) : undefined;
      const height = node.attrs?.height ? String(node.attrs.height) : undefined;
      const img = (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imgSrc}
          alt={String(node.attrs?.alt ?? "")}
          className="rounded-lg border border-border"
          style={{
            width: width ?? "auto",
            height: height ?? "auto",
            maxWidth: "100%",
          }}
          loading="lazy"
        />
      );

      // Matn rasmning yonidan o'raladi (Word/Docs "Wrap text").
      // Mobilda o'ralish o'chadi — rasm to'liq kenglikda.
      if (wrap === "left" || wrap === "right") {
        const wrapCls =
          wrap === "left"
            ? "float-left mt-1 mr-6 mb-3 max-sm:mr-0"
            : "float-right mt-1 ml-6 mb-3 max-sm:ml-0";
        return (
          <span
            key={key}
            className={
              wrapCls +
              " block max-w-[60%] max-sm:float-none max-sm:my-5 max-sm:max-w-full"
            }
          >
            {img}
          </span>
        );
      }

      // Alohida qator — chap / markaz / o'ng
      const justify =
        align === "left"
          ? "flex-start"
          : align === "right"
            ? "flex-end"
            : "center";
      return (
        <span key={key} className="my-6 flex clear-both" style={{ justifyContent: justify }}>
          {img}
        </span>
      );
    }
    case "inlineMath":
      return (
        <span
          key={key}
          className="mx-0.5 inline-block align-middle"
          dangerouslySetInnerHTML={{
            __html: renderKatex(String(node.attrs?.latex ?? ""), false),
          }}
        />
      );
    case "blockMath":
      return (
        <div
          key={key}
          className="my-6 overflow-x-auto text-center"
          dangerouslySetInnerHTML={{
            __html: renderKatex(String(node.attrs?.latex ?? ""), true),
          }}
        />
      );
    case "horizontalRule":
      return <hr key={key} className="my-8 border-border" />;
    case "hardBreak":
      return <br key={key} />;
    default:
      return node.content ? (
        <React.Fragment key={key}>{children(node)}</React.Fragment>
      ) : null;
  }
}

export function TiptapRender({ content }: { content: unknown }) {
  const doc = content as TNode | null;
  if (!doc || !doc.content) {
    return <p className="text-muted-foreground">Matn mavjud emas.</p>;
  }
  return (
    <div>
      {doc.content.map((n, i) => renderNode(n, i))}
      {/* o'ralgan (float) rasmlar konteynerdan chiqib ketmasligi uchun */}
      <div className="clear-both" />
    </div>
  );
}
