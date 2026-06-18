import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";

interface MathAttrs {
  latex: string;
}

function renderInto(dom: HTMLElement, latex: string, displayMode: boolean) {
  try {
    katex.render(latex, dom, { throwOnError: false, displayMode });
  } catch {
    dom.textContent = latex;
  }
  if (!latex.trim()) {
    dom.textContent = displayMode ? "( formula )" : "( ƒ )";
    dom.classList.add("math-empty");
  }
}

/** Inline (matn ichidagi) formula — atom node, attrs.latex. */
export const InlineMath = Node.create({
  name: "inlineMath",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-latex") || "",
        renderHTML: (attrs: MathAttrs) => ({ "data-latex": attrs.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="inline-math"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "inline-math" }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.setAttribute("data-type", "inline-math");
      dom.className = "math-node math-inline";
      dom.contentEditable = "false";
      renderInto(dom, (node.attrs.latex as string) || "", false);
      return { dom };
    };
  },
});

/** Blok (alohida qatordagi, markazlashgan) formula. */
export const BlockMath = Node.create({
  name: "blockMath",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-latex") || "",
        renderHTML: (attrs: MathAttrs) => ({ "data-latex": attrs.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="block-math"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "block-math" }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "block-math");
      dom.className = "math-node math-block";
      dom.contentEditable = "false";
      renderInto(dom, (node.attrs.latex as string) || "", true);
      return { dom };
    };
  },
});
