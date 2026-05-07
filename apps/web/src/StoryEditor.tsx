import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function StoryEditor({
  storyTitle,
  content,
  onSave,
  busy
}: {
  storyTitle: string;
  content: string;
  onSave: (content: string) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = React.useState(content);
  const editor = useEditor({
    extensions: [StarterKit],
    content: `<p>${escapeHtml(content)}</p>`,
    onUpdate: ({ editor: instance }) => {
      setDraft(instance.getText({ blockSeparator: "\n\n" }));
    }
  });

  React.useEffect(() => {
    setDraft(content);
    if (editor && editor.getText({ blockSeparator: "\n\n" }) !== content) {
      editor.commands.setContent(`<p>${escapeHtml(content)}</p>`);
    }
  }, [content, editor]);

  return (
    <section className="control-group story-panel">
      <div className="section-heading">
        <span>Story editor</span>
        <span>{storyTitle}</span>
      </div>
      <div className="editor-toolbar">
        <button type="button" className="icon-link" onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold">
          B
        </button>
        <button type="button" className="icon-link" onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic">
          I
        </button>
      </div>
      <EditorContent editor={editor} className="story-editor" />
      <button type="button" className="secondary" onClick={() => onSave(draft)} disabled={busy || !draft.trim()}>
        Save story
      </button>
    </section>
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />");
}
