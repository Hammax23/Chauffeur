"use client";

import { useEditor, EditorContent } from "@tiptap/react";
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
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`p-2 rounded-lg transition-colors ${active ? "bg-emerald-100 text-emerald-700" : "text-gray-600 hover:bg-gray-100"
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
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
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
        allowBase64: true,
        inline: false,
        HTMLAttributes: {
          class: "editor-image",
        },
      }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-base max-w-none min-h-[280px] px-4 py-3 focus:outline-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-3 prose-p:my-3 prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-700 prose-a:text-[#C9A063] prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-hr:my-6 prose-hr:border-gray-300",
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

  const handleHeading = (level: 2 | 3) => {
    const isActive = editor.isActive("heading", { level });
    if (isActive) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const handleBulletList = () => {
    editor.chain().focus().toggleBulletList().run();
  };

  const handleOrderedList = () => {
    editor.chain().focus().toggleOrderedList().run();
  };

  const handleBlockquote = () => {
    editor.chain().focus().toggleBlockquote().run();
  };

  const handleHorizontalRule = () => {
    editor.chain().focus().setHorizontalRule().run();
  };

  const handleLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (internal recommended):", previousUrl || "/");
    
    if (url === null) return; // User cancelled
    
    if (!url.trim()) {
      // Remove link
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
  };

  const handleImage = () => {
    const src = window.prompt(
      "Image URL (must be a direct link to an image file):\n\n" +
      "Examples:\n" +
      "• https://example.com/image.jpg\n" +
      "• https://images.unsplash.com/photo-xxx\n" +
      "• Your uploaded image URL from Featured Image section\n\n" +
      "Note: Unsplash page URLs won't work - use the Download or Share > Copy Image URL option",
      ""
    );
    
    if (!src || !src.trim()) return;
    
    const cleanSrc = src.trim();
    
    // Validate URL format
    if (!cleanSrc.startsWith('http://') && !cleanSrc.startsWith('https://') && !cleanSrc.startsWith('data:')) {
      alert('Please enter a valid image URL starting with https:// or http://');
      return;
    }
    
    // Check if it's an Unsplash page URL (not direct image)
    if (cleanSrc.includes('unsplash.com/photos/') && !cleanSrc.includes('images.unsplash.com')) {
      alert(
        'This appears to be an Unsplash page URL, not a direct image URL.\n\n' +
        'To get the direct image URL from Unsplash:\n' +
        '1. Right-click on the image\n' +
        '2. Select "Copy Image Address" or "Copy Image Link"\n' +
        '3. Paste that URL here\n\n' +
        'Or use the "Download" button and get the URL from there.\n\n' +
        'The URL should start with https://images.unsplash.com/'
      );
      return;
    }
    
    const alt = window.prompt("Alt text (describe the image for SEO and accessibility):", "") || "Image";
    
    // Insert image at current cursor position
    try {
      editor.chain().focus().setImage({ 
        src: cleanSrc, 
        alt: alt.trim(),
      }).run();
      
      console.log('Image inserted:', cleanSrc);
    } catch (error) {
      console.error('Error inserting image:', error);
      alert('Failed to insert image. Please check the URL and try again.');
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500">
      <style dangerouslySetInnerHTML={{
        __html: `
          .ProseMirror {
            outline: none;
          }
          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
            line-height: 1.3;
          }
          .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: 700;
            margin-top: 1.25rem;
            margin-bottom: 0.75rem;
            line-height: 1.4;
          }
          .ProseMirror p {
            margin-top: 0.75rem;
            margin-bottom: 0.75rem;
          }
          .ProseMirror ul,
          .ProseMirror ol {
            margin-top: 1rem;
            margin-bottom: 1rem;
            padding-left: 1.5rem;
          }
          .ProseMirror ul {
            list-style-type: disc;
          }
          .ProseMirror ol {
            list-style-type: decimal;
          }
          .ProseMirror li {
            margin-top: 0.25rem;
            margin-bottom: 0.25rem;
          }
          .ProseMirror blockquote {
            border-left: 4px solid #d1d5db;
            padding-left: 1rem;
            font-style: italic;
            color: #374151;
            margin: 1rem 0;
          }
          .ProseMirror hr {
            margin: 1.5rem 0;
            border: none;
            border-top: 2px solid #e5e7eb;
          }
          .ProseMirror img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1rem 0;
            display: block;
          }
          .ProseMirror .editor-image {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1rem 0;
            display: block;
          }
          .ProseMirror a {
            color: #C9A063;
            font-weight: 500;
            text-decoration: none;
          }
          .ProseMirror a:hover {
            text-decoration: underline;
          }
        `
      }} />
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          active={editor.isActive("bold")} 
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          active={editor.isActive("italic")} 
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => handleHeading(2)}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => handleHeading(3)}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton 
          onClick={handleBulletList} 
          active={editor.isActive("bulletList")} 
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton 
          onClick={handleOrderedList} 
          active={editor.isActive("orderedList")} 
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton 
          onClick={handleBlockquote} 
          active={editor.isActive("blockquote")} 
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton 
          onClick={handleHorizontalRule} 
          title="Divider"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-gray-200 mx-1" />
        
        <ToolbarButton
          onClick={handleLink}
          active={editor.isActive("link")}
          title="Insert/Edit link"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={handleImage}
          title="Insert image"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-gray-200 mx-1" />
        
        <ToolbarButton 
          onClick={() => editor.chain().focus().undo().run()} 
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        
        <ToolbarButton 
          onClick={() => editor.chain().focus().redo().run()} 
          title="Redo"
        >
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
