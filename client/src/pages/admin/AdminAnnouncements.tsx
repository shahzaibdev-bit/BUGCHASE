import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, Send, Bold, Italic, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export default function AdminAnnouncements() {
  const [isSending, setIsSending] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Type your broadcast message here...',
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setCharCount(editor.storage.characterCount?.characters?.() || editor.getText().length);
    },
    editorProps: {
        attributes: {
            class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] text-lg font-mono text-foreground'
        }
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleBroadcast = async () => {
    if (!editor || editor.isEmpty) {
      toast.error("Message cannot be empty.");
      return;
    }

    setIsSending(true);

    try {
        const message = editor.getHTML();
        const res = await fetch('/api/admin/announcements/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await res.json();

        if (res.ok) {
             toast.success(data.message || "Broadcast Sent Successfully!");
             editor.commands.clearContent();
             setCharCount(0);
        } else {
            toast.error(data.message || "Failed to send broadcast");
        }

    } catch (error) {
        console.error(error);
        toast.error("An error occurred while sending the broadcast.");
    } finally {
        setIsSending(false);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 animate-fade-in space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground tracking-tight uppercase font-mono">Platform Announcement</h1>
        <p className="text-muted-foreground">Send system-wide notifications to all users.</p>
      </div>

      {/* Broadcast Terminal */}
      <div className="relative overflow-hidden rounded-xl border border-black dark:border-white bg-white dark:bg-zinc-950 shadow-2xl">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <span className="font-mono text-xs text-foreground font-bold tracking-wider">ANNOUNCEMENT_SYSTEM_V4</span>
            <Megaphone className="h-4 w-4 text-foreground" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-black/10 dark:border-white/10 bg-background">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'bg-muted' : ''}
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'bg-muted' : ''}
            >
                <Italic className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'bg-muted' : ''}
            >
                <List className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'bg-muted' : ''}
            >
                <ListOrdered className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={editor.isActive('blockquote') ? 'bg-muted' : ''}
            >
                <Quote className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()}>
                <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()}>
                <Redo className="h-4 w-4" />
            </Button>
        </div>

        {/* Input Area */}
        <div className="min-h-[250px] p-6 bg-background">
            <EditorContent editor={editor} />
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5">
             <div className="flex items-center gap-2 text-xs text-foreground/70 font-mono">
                <AlertTriangle className="h-3 w-3" />
                <span>WARNING: PERSISTS_24H</span>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
                CHARS: <span className="text-foreground font-bold">{charCount}</span>
                <span className={`${cursorVisible ? 'opacity-100' : 'opacity-0'} transition-opacity ml-1 bg-foreground w-2 h-4 inline-block align-middle`}></span>
            </div>
        </div>
      </div>

      {/* Action Area */}
      <Button
        onClick={handleBroadcast}
        disabled={isSending || editor.isEmpty}
        className="w-full bg-black text-white dark:bg-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 font-bold h-14 text-lg transition-all rounded-xl border border-transparent hover:scale-[1.01] active:scale-[0.99]"
      >
        {isSending ? (
            <span className="flex items-center gap-2 animate-pulse font-mono">
                [ BROADCASTING... ]
            </span>
        ) : (
            <span className="flex items-center gap-2 font-mono">
                <Send className="h-5 w-5" />
                SEND_BROADCAST
            </span>
        )}
      </Button>
    </div>
  );
}
