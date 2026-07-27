"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Quote, Undo, Redo, Minus, Link as LinkIcon, Image as ImageIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Apply H2/H3 only to the textblock under the caret/selection head.
 * TipTap's default toggleHeading() uses setBlockType(from, to) which rewrites
 * every block in a multi-block selection — SEO editors hit that often.
 */
function toggleHeadingAtCursor(editor: Editor, level: 2 | 3) {
  return editor
    .chain()
    .focus()
    .command(({ tr, state, dispatch }) => {
      const { $from } = state.selection;
      let depth = $from.depth;
      while (depth > 0 && !$from.node(depth).isTextblock) depth -= 1;
      if (depth === 0) return false;

      const block = $from.node(depth);
      const from = $from.start(depth);
      const to = $from.end(depth);
      const heading = state.schema.nodes.heading;
      const paragraph = state.schema.nodes.paragraph;
      if (!heading || !paragraph) return false;

      const already = block.type === heading && block.attrs.level === level;
      if (dispatch) {
        tr.setBlockType(from, to, already ? paragraph : heading, already ? undefined : { level });
        dispatch(tr.scrollIntoView());
      }
      return true;
    })
    .run();
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      // Keep editor selection when clicking the toolbar (TipTap requirement)
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        active ? "bg-emerald-100 text-emerald-700" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const lastEmittedHtml = useRef<string>(value || "<p></p>");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          class: "text-[#C9A063] font-medium no-underline hover:underline",
        },
      }),
      Image.configure({
        allowBase64: false,
      }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose max-w-none min-h-[280px] px-4 py-3 focus:outline-none prose-a:text-[#C9A063] prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmittedHtml.current = html;
      onChange(html);
    },
  });

  // Sync only when parent replaces content externally (load article / reset).
  // Avoid setContent on every keystroke — TipTap HTML string can differ from parent
  // and full-doc resets break selection / make heading edits feel global.
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedHtml.current) return;
    const current = editor.getHTML();
    if (value === current) {
      lastEmittedHtml.current = value;
      return;
    }
    editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    lastEmittedHtml.current = value || "<p></p>";
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="border border-gray-200 rounded-xl min-h-[320px] bg-gray-50 animate-pulse" />
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleHeadingAtCursor(editor, 2)}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleHeadingAtCursor(editor, 3)}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <ToolbarButton
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL (internal recommended):", previousUrl || "/");
            if (url === null) return;
            if (!url.trim()) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            const clean = url.trim();
            const isExternal = /^https?:\/\//i.test(clean) && !/^https?:\/\/([^/]+\.)?sarjworldwide\.ca\b/i.test(clean);
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({
                href: clean,
                target: isExternal ? "_blank" : undefined,
                rel: isExternal ? "noopener noreferrer" : undefined,
              })
              .run();
          }}
          active={editor.isActive("link")}
          title="Insert/Edit link"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const src = window.prompt("Image URL:", "https://");
            if (!src?.trim()) return;
            const alt = window.prompt("Alt text (required for SEO):", "") || "";
            editor.chain().focus().setImage({ src: src.trim(), alt: alt.trim() }).run();
          }}
          title="Insert image"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
      {placeholder && editor.isEmpty && (
        <p className="px-4 -mt-[280px] text-gray-400 text-sm pointer-events-none">{placeholder}</p>
      )}
    </div>
  );
}
