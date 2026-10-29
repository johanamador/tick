"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useLanguage } from "./language-provider";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Undo2,
  Redo2,
  IndentIncrease,
  IndentDecrease,
} from "lucide-react";
import type { Note } from "@/lib/types";
export default function NoteEditor({
  note,
  onChange,
  actions,
}: {
  note: Note;
  onChange: (markdown: string) => void;
  actions?: ReactNode;
}) {
  const { t, locale } = useLanguage();
  const translateRef = useRef(t);
  translateRef.current = t;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Plain notes are inserted as text nodes. Existing markup stays literal until edited.
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown,
      Placeholder.configure({
        placeholder: () =>
          translateRef.current(
            "Start writing. Use - for bullets, 1. for lists or # for headings.",
          ),
      }),
    ],
    content:
      note.format === "markdown"
        ? note.content
        : {
            type: "doc",
            content: note.content.split("\n").map((line) => ({
              type: "paragraph",
              ...(line ? { content: [{ type: "text", text: line }] } : {}),
            })),
          },
    ...(note.format === "markdown" ? { contentType: "markdown" as const } : {}),
    editorProps: {
      attributes: {
        class: "note-editor-content",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": t("Contents of {title}", { title: note.title }),
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getMarkdown()),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            strike: editor.isActive("strike"),
            h1: editor.isActive("heading", { level: 1 }),
            h2: editor.isActive("heading", { level: 2 }),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            task: editor.isActive("taskList"),
            quote: editor.isActive("blockquote"),
            code: editor.isActive("codeBlock"),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
            indent: editor
              .can()
              .sinkListItem(
                editor.isActive("taskList") ? "taskItem" : "listItem",
              ),
            outdent: editor
              .can()
              .liftListItem(
                editor.isActive("taskList") ? "taskItem" : "listItem",
              ),
          }
        : null,
  });
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: "note-editor-content",
            role: "textbox",
            "aria-multiline": "true",
            "aria-label": t("Contents of {title}", { title: note.title }),
            spellcheck: "true",
          },
        },
      });
      editor.view.dispatch(editor.state.tr.setMeta("locale", locale));
    }
  }, [editor, note.title, locale]);
  if (!editor)
    return <div className="note-editor-loading">{t("Loading editor…")}</div>;
  const controls = [
    {
      label: t("Heading 1"),
      Icon: Heading1,
      active: state?.h1,
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: t("Heading 2"),
      Icon: Heading2,
      active: state?.h2,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: t("Bold (Ctrl+B)"),
      Icon: Bold,
      active: state?.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: t("Italic (Ctrl+I)"),
      Icon: Italic,
      active: state?.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: t("Strikethrough"),
      Icon: Strikethrough,
      active: state?.strike,
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: t("Bullet list"),
      Icon: List,
      active: state?.bullet,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: t("Numbered list"),
      Icon: ListOrdered,
      active: state?.ordered,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: t("Checklist"),
      Icon: ListTodo,
      active: state?.task,
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: t("Indent"),
      Icon: IndentIncrease,
      disabled: !state?.indent,
      run: () =>
        editor
          .chain()
          .focus()
          .sinkListItem(editor.isActive("taskList") ? "taskItem" : "listItem")
          .run(),
    },
    {
      label: t("Outdent"),
      Icon: IndentDecrease,
      disabled: !state?.outdent,
      run: () =>
        editor
          .chain()
          .focus()
          .liftListItem(editor.isActive("taskList") ? "taskItem" : "listItem")
          .run(),
    },
    {
      label: t("Quote"),
      Icon: Quote,
      active: state?.quote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: t("Code block"),
      Icon: Code,
      active: state?.code,
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: t("Undo (Ctrl+Z)"),
      Icon: Undo2,
      disabled: !state?.undo,
      run: () => editor.chain().focus().undo().run(),
    },
    {
      label: t("Redo (Ctrl+Shift+Z)"),
      Icon: Redo2,
      disabled: !state?.redo,
      run: () => editor.chain().focus().redo().run(),
    },
  ];
  return (
    <div className="note-editor">
      <div
        className="note-format-toolbar"
        role="group"
        aria-label={t("Note formatting")}
      >
        <div className="note-format-controls">
          {controls.map(({ label, Icon, active, disabled, run }) => (
            <button
              key={label}
              type="button"
              className="icon-button"
              aria-label={label}
              data-tooltip={label}
              aria-pressed={active}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={run}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
        {actions}
      </div>
      <EditorContent className="note-editor-scroll" editor={editor} />
    </div>
  );
}
