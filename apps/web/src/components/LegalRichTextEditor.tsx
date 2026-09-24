"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color, LineHeight } from "@tiptap/extension-text-style";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Minus,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code2,
  Table as TableIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface LegalRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolBtn({
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
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-lg p-2 transition-colors ${
        active ? "bg-[#C9A063]/20 text-[#8B6914]" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

const LINE_HEIGHTS = ["1.2", "1.4", "1.5", "1.65", "1.8", "2", "2.2"];

export default function LegalRichTextEditor({
  value,
  onChange,
  placeholder,
}: LegalRichTextEditorProps) {
  const lastEmitted = useRef(value || "<p></p>");
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(value || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      LineHeight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#C9A063] font-medium" },
      }),
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-base max-w-none min-h-[320px] px-4 py-3 focus:outline-none prose-headings:font-bold prose-p:my-2 prose-p:leading-relaxed prose-li:my-0.5 prose-a:text-[#C9A063]",
        "data-placeholder": placeholder || "Write legal content…",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor || sourceMode) return;
    if (value === lastEmitted.current) return;
    if (value === editor.getHTML()) {
      lastEmitted.current = value;
      return;
    }
    editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    lastEmitted.current = value || "<p></p>";
  }, [value, editor, sourceMode]);

  if (!editor) {
    return <div className="min-h-[360px] animate-pulse rounded-xl border border-gray-200 bg-gray-50" />;
  }

  const toggleSource = () => {
    if (!sourceMode) {
      setSourceHtml(editor.getHTML());
      setSourceMode(true);
      return;
    }
    const next = sourceHtml || "<p></p>";
    editor.commands.setContent(next, { emitUpdate: false });
    lastEmitted.current = next;
    onChange(next);
    setSourceMode(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/80 px-2 py-1.5">
        <ToolBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolBtn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-4 w-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <label className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-600" title="Text color">
          <span>Color</span>
          <input
            type="color"
            className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>
        <select
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
          title="Line height"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              editor.chain().focus().unsetLineHeight().run();
              return;
            }
            editor.chain().focus().setLineHeight(v).run();
          }}
        >
          <option value="">Line height</option>
          {LINE_HEIGHTS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolBtn
          title="Insert table"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()
          }
        >
          <TableIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          title="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL:", prev || "");
            if (url === null) return;
            if (!url.trim()) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="h-4 w-4" />
        </ToolBtn>
        <div className="ml-auto">
          <ToolBtn title="HTML source" active={sourceMode} onClick={toggleSource}>
            <Code2 className="h-4 w-4" />
          </ToolBtn>
        </div>
      </div>

      {sourceMode ? (
        <textarea
          value={sourceHtml}
          onChange={(e) => {
            setSourceHtml(e.target.value);
            onChange(e.target.value);
          }}
          className="min-h-[360px] w-full resize-y bg-[#0f1115] px-4 py-3 font-mono text-[13px] leading-relaxed text-emerald-200 outline-none"
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
