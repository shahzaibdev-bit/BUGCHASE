'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { 
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
    List, ListOrdered, Code, Quote, Link as LinkIcon, Image as ImageIcon, 
    Undo, Redo, Check, X, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const ToolbarButton = ({ onClick, isActive, icon: Icon, title, disabled }: any) => (
  <button
    onClick={(e) => { e.preventDefault(); onClick(); }}
    disabled={disabled}
    title={title}
    className={cn(
        "p-1.5 rounded-md transition-all duration-200",
        isActive 
            ? "bg-black text-white dark:bg-white dark:text-black" 
            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent hover:text-zinc-500 dark:hover:text-zinc-400"
    )}
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);

export default function CyberpunkEditor({ content, onChange, placeholder }: EditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Type here...' }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
            "prose prose-sm dark:prose-invert max-w-none p-3 min-h-[80px] outline-none font-sans text-sm", // Reduced min-height
            "prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4",
            "prose-blockquote:border-l-2 prose-blockquote:border-zinc-900 dark:prose-blockquote:border-white prose-blockquote:pl-4 prose-blockquote:italic"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const setLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
    } else {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
  };

  const addImage = () => {
      if (imageUrl) {
        editor.chain().focus().setImage({ src: imageUrl }).run();
        setImageUrl('');
      }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm transition-all focus-within:ring-1 focus-within:ring-foreground">
      
      {/* 1. Enhanced Toolbar - Compact */}
      <div className="flex items-center flex-wrap gap-1 p-1.5 border-b border-border bg-muted/30 backdrop-blur-sm">
        
        {/* Formatting Group */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1.5 mr-1.5">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="Bold" disabled={isPreview} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} title="Underline" disabled={isPreview} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="Italic" disabled={isPreview} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} title="Strikethrough" disabled={isPreview} />
        </div>

        {/* Structure Group */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1.5 mr-1.5">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={Quote} title="Quote" disabled={isPreview} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} title="Bullet List" disabled={isPreview} />
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} title="Numbered List" disabled={isPreview} />
        </div>

        {/* Insert Group */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1.5 mr-1.5">
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} icon={Code} title="Code Block" disabled={isPreview} />
            
            {/* Custom Link Popover */}
            <Popover>
                <PopoverTrigger asChild>
                    <button 
                        disabled={isPreview}
                        className={cn(
                        "p-1.5 rounded-md transition-all duration-200",
                        editor.isActive('link')
                            ? "bg-foreground text-background" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        isPreview && "opacity-50 cursor-not-allowed"
                        )}
                        title="Link"
                    >
                        <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                    <div className="flex gap-2">
                         <Input 
                            value={linkUrl} 
                            onChange={(e) => setLinkUrl(e.target.value)} 
                            placeholder="https://example.com" 
                            className="h-8 font-mono text-xs bg-background border-border"
                         />
                         <Button size="icon" className="h-8 w-8 shrink-0 bg-foreground hover:bg-foreground/90 text-background" onClick={setLink}>
                             <Check className="w-4 h-4" />
                         </Button>
                    </div>
                </PopoverContent>
            </Popover>

             {/* Custom Image Popover */}
             <Popover>
                <PopoverTrigger asChild>
                    <button 
                         disabled={isPreview}
                        className={cn(
                        "p-1.5 rounded-md transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground",
                        isPreview && "opacity-50 cursor-not-allowed"
                        )}
                        title="Image"
                    >
                        <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                    <div className="flex gap-2">
                         <Input 
                            value={imageUrl} 
                            onChange={(e) => setImageUrl(e.target.value)} 
                            placeholder="https://image-url.com/file.png" 
                            className="h-8 font-mono text-xs bg-background border-border"
                         />
                         <Button size="icon" className="h-8 w-8 shrink-0 bg-foreground hover:bg-foreground/90 text-background" onClick={addImage}>
                             <Check className="w-4 h-4" />
                         </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>

        {/* History & Preview Group */}
        <div className="ml-auto flex items-center gap-0.5">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={Undo} title="Undo" disabled={isPreview} />
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={Redo} title="Redo" disabled={isPreview} />
            <div className="w-[1px] h-4 bg-border mx-1" />
            <ToolbarButton 
                onClick={() => setIsPreview(!isPreview)} 
                isActive={isPreview} 
                icon={Eye} 
                title={isPreview ? "Edit Mode" : "Preview Mode"} 
            />
        </div>
      </div>

      {/* 2. The Editor Area */}
      {isPreview ? (
        <div 
            className="prose prose-sm dark:prose-invert max-w-none p-3 min-h-[100px] outline-none prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4 prose-blockquote:border-l-2 prose-blockquote:border-foreground prose-blockquote:pl-4 prose-blockquote:italic animate-in fade-in duration-200"
            dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
        />
      ) : (
        <EditorContent editor={editor} className="cursor-text animate-in fade-in duration-200" />
      )}
      
    </div>
  );
}
