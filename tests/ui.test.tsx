import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:3006/demo",
  pretendToBeVisual: true,
});
for (const [key, value] of Object.entries({
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  DocumentFragment: dom.window.DocumentFragment,
  Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent,
  KeyboardEvent: dom.window.KeyboardEvent,
  MouseEvent: dom.window.MouseEvent,
  HTMLDialogElement: dom.window.HTMLDialogElement,
  MutationObserver: dom.window.MutationObserver,
  DOMParser: dom.window.DOMParser,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  getSelection: dom.window.getSelection.bind(dom.window),
  ShadowRoot: dom.window.ShadowRoot,
  localStorage: dom.window.localStorage,
  getComputedStyle: dom.window.getComputedStyle,
  IS_REACT_ACT_ENVIRONMENT: true,
}))
  Object.defineProperty(globalThis, key, {
    value,
    writable: true,
    configurable: true,
  });
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.HTMLElement.prototype.hasPointerCapture = function () {
  return false;
};
dom.window.HTMLElement.prototype.setPointerCapture = function () {};
dom.window.HTMLElement.prototype.releasePointerCapture = function () {};
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
const {
  render: baseRender,
  fireEvent,
  cleanup,
  waitFor,
  act,
} = await import("@testing-library/react");
const { LanguageProvider } = await import("../components/language-provider");
const { LanguageSwitch } = await import("../components/language-switch");
function render(ui: React.ReactNode) {
  return baseRender(<LanguageProvider>{ui}</LanguageProvider>);
}
const { WorkspaceApp } = await import("../components/workspace-app");
const { demoWorkspace } = await import("../lib/demo");
const { CompactSelect } = await import("../components/compact-select");
const { TagInput } = await import("../components/tag-input");
const { default: NoteEditor } = await import("../components/note-editor");
const { readPreference, writePreference } = await import("../lib/preferences");
const { LoginForm } = await import("../components/login-form");
const { OverviewShortcuts } = await import("../components/overview-shortcuts");
const { demoBackdrops } = await import("../lib/demo-backdrops");
import type { Editor } from "@tiptap/react";
async function changeNote(
  app: ReturnType<typeof render>,
  name: string,
  content: string,
) {
  const input = await app.findByRole("textbox", { name });
  act(() =>
    (
      input as HTMLElement & {
        editor: Editor;
      }
    ).editor.commands.setContent(content, { contentType: "markdown" }),
  );
  return input;
}
afterEach(() => {
  cleanup();
  localStorage.clear();
});

test("overview shortcuts preserve the existing view and follow the first pending title", async () => {
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="test" demo />,
  );
  assert.equal(
    app.getByRole("button", { name: "Items" }).getAttribute("aria-pressed"),
    "true",
  );
  assert.ok(
    app.getByRole("button", { name: "Edit Spider-Man: Brand New Day" }),
  );
  fireEvent.click(app.getByRole("button", { name: "Shortcuts" }));
  assert.equal(localStorage.getItem("tick-overview-layout"), "shortcuts");
  for (const category of [
    "Movies",
    "TV shows",
    "Books",
    "Comics",
    "Games",
    "Tasks",
    "Notes",
  ])
    assert.ok(app.getByRole("button", { name: `Open ${category}` }));
  const movies = app.getByRole("button", { name: "Open Movies" });
  assert.equal(
    movies.querySelector("img")?.getAttribute("src"),
    demoBackdrops["movie:969681"],
  );
  assert.equal(!!app.queryByRole("button", { name: "Sort by" }), false);
  fireEvent.click(movies);
  await app.findByRole("heading", { name: /^Movies/ });
  fireEvent.click(
    app.getByRole("button", {
      name: "Complete: Spider-Man: Brand New Day",
    }),
  );
  fireEvent.click(app.getByRole("button", { name: /^All items/ }));
  assert.equal(
    app
      .getByRole("button", { name: "Open Movies" })
      .querySelector("img")
      ?.getAttribute("src"),
    demoBackdrops["movie:687163"],
  );
  app.unmount();
  const restored = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="test" demo />,
  );
  await restored.findByRole("button", { name: "Open Movies" });
  fireEvent.click(restored.getByRole("button", { name: "Items" }));
  assert.ok(restored.getByRole("button", { name: "Edit Project Hail Mary" }));
  assert.equal(localStorage.getItem("tick-overview-layout"), "items");
});

test("shortcuts remain usable when artwork fails or categories are empty", () => {
  const workspace = structuredClone(demoWorkspace);
  workspace.items = workspace.items.filter((item) => item.kind === "movie");
  let destination = "";
  const app = render(
    <OverviewShortcuts
      workspace={workspace}
      demo
      onNavigate={(section) => {
        destination = section;
      }}
    />,
  );
  const movies = app.getByRole("button", { name: "Open Movies" });
  fireEvent.error(movies.querySelector("img")!);
  assert.equal(
    movies.querySelector("img")?.getAttribute("src"),
    workspace.items[0].cover_url,
  );
  fireEvent.error(movies.querySelector("img")!);
  assert.equal(!!movies.querySelector("img"), false);
  fireEvent.click(movies);
  assert.equal(destination, "movie");
  const books = app.getByRole("button", { name: "Open Books" });
  assert.equal(!!books.querySelector("img"), false);
  fireEvent.click(books);
  assert.equal(destination, "book");
});
test("stored preferences and edited demo notes survive a reload", async () => {
  const previous = structuredClone(demoWorkspace);
  previous.notes[0].content = "# Mi nota guardada antes del cambio de nombre";
  previous.items[0].title = "Mi película guardada";
  localStorage.setItem("tick-demo-v3", JSON.stringify(previous));
  localStorage.setItem("tick-view", "list");
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="test" demo />,
  );
  await app.findByText("Mi película guardada");
  assert.equal(
    app.getByRole("button", { name: "List view" }).getAttribute("aria-pressed"),
    "true",
  );
  fireEvent.click(app.getByRole("button", { name: /Notes/ }));
  const note = await app.findByRole("textbox", {
    name: "Contents of Quick notes",
  });
  assert.ok(
    note.textContent?.includes("Mi nota guardada antes del cambio de nombre"),
  );
  assert.ok(localStorage.getItem("tick-demo-v3")?.includes("Mi nota guardada"));
  assert.equal(localStorage.getItem("tick-view"), "list");
});
test("preferences use the tick storage namespace", () => {
  writePreference("theme", "dark");
  assert.equal(readPreference("theme"), "dark");
  assert.equal(localStorage.getItem("tick-theme"), "dark");
});
test("overview is separated first and games can be added with two tags and filtered", async () => {
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="test" demo />,
  );
  const navigation = app.getAllByRole("navigation");
  assert.equal(navigation[0].getAttribute("aria-label"), "Overview");
  assert.equal(navigation[1].getAttribute("aria-label"), "Organization");
  assert.equal(app.container.querySelector(".avatar img"), null);
  assert.ok(app.getByRole("button", { name: "Edit profile" }));
  fireEvent.click(app.getByRole("button", { name: /^Games/ }));
  assert.equal(app.container.querySelector(".empty-illustration"), null);
  fireEvent.click(app.getByRole("button", { name: /^Add item/ }));
  fireEvent.click(app.getByRole("button", { name: "Add manually" }));
  fireEvent.change(app.getByRole("textbox", { name: "Title" }), {
    target: { value: "Juego para jugar juntos" },
  });
  const input = app.getByRole("combobox", { name: "Tags" });
  for (const tag of ["Friends", "Marvel"]) {
    fireEvent.change(input, { target: { value: tag } });
    fireEvent.keyDown(input, { key: "Enter" });
  }
  fireEvent.click(app.getByRole("button", { name: "Add to list" }));
  await waitFor(() =>
    assert.ok(
      app.getByRole("button", { name: "Edit Juego para jugar juntos" }),
    ),
  );
  fireEvent.click(app.getByRole("button", { name: "Filter by Friends" }));
  fireEvent.click(app.getByRole("button", { name: "Filter by Marvel" }));
  const filter = app.getByRole("button", { name: "Filter by tags" });
  fireEvent.keyDown(filter, { key: "ArrowDown" });
  await waitFor(() =>
    assert.ok(
      app.getByRole("menuitemcheckbox", {
        name: "Friends",
        checked: true,
      }),
    ),
  );
  assert.ok(
    app.getByRole("menuitemcheckbox", { name: "Marvel", checked: true }),
  );
  assert.equal(document.body.hasAttribute("data-scroll-locked"), false);
  assert.equal(document.body.style.overflow, "");
  fireEvent.keyDown(app.getByRole("menuitemcheckbox", { name: "Marvel" }), {
    key: "Escape",
  });
  await waitFor(() => assert.equal(app.queryByRole("menu"), null));
  assert.ok(app.getByRole("button", { name: "Edit Juego para jugar juntos" }));
  fireEvent.click(app.getByRole("button", { name: /^Movies/ }));
  assert.ok(app.getByRole("button", { name: "Clear filters" }));
  fireEvent.click(app.getByRole("button", { name: "Clear filters" }));
  assert.ok(app.getByRole("button", { name: "Edit Dune: Part Two" }));
});
test("existing tags can be selected with the keyboard without duplicates", async () => {
  function Editor() {
    const [tags, setTags] = React.useState<string[]>([]);
    return (
      <TagInput
        value={tags}
        onChange={setTags}
        suggestions={["Friends", "Marvel"]}
      />
    );
  }
  const app = render(<Editor />);
  const input = app.getByRole("combobox", { name: "Tags" });
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowUp" });
  fireEvent.keyDown(input, { key: "Enter" });
  assert.ok(app.getByRole("button", { name: "Remove tag Marvel" }));
  fireEvent.change(input, { target: { value: "marvel" } });
  fireEvent.keyDown(input, { key: "Enter" });
  assert.equal(app.getAllByRole("button", { name: /Remove tag/i }).length, 1);
});
test("custom selector supports keyboard selection and focus return", async () => {
  let selected = "manual";
  const app = render(
    <CompactSelect
      label="Ordenar"
      value={selected}
      onValueChange={(value) => {
        selected = value;
      }}
      options={[
        { value: "manual", label: "Manual order" },
        { value: "title", label: "Title: A–Z" },
      ]}
    />,
  );
  const trigger = app.getByRole("button", { name: "Ordenar" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await waitFor(() => assert.ok(app.getByRole("menu")));
  const option = app.getByRole("menuitemradio", { name: "Title: A–Z" });
  fireEvent.keyDown(option, { key: "Enter" });
  await waitFor(() => assert.equal(selected, "title"));
  await waitFor(() => assert.equal(app.queryByRole("menu"), null));
});
test("task selector renders inside the dialog and keeps the empty list option", async () => {
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="test" demo />,
  );
  fireEvent.click(app.getByRole("button", { name: /^Tasks/ }));
  fireEvent.click(app.getByRole("button", { name: /^New task/ }));
  const trigger = app.getByRole("button", { name: "List" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await waitFor(() => assert.ok(app.getByRole("menu")));
  assert.ok(app.getByRole("menu").closest("dialog"));
  const option = app.getByRole("menuitemradio", { name: "Personal" });
  fireEvent.keyDown(option, { key: "Enter" });
  await waitFor(() => assert.ok(trigger.textContent?.includes("Personal")));
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await waitFor(() =>
    assert.ok(app.getByRole("menuitemradio", { name: "No list" })),
  );
  fireEvent.keyDown(app.getByRole("menuitemradio", { name: "No list" }), {
    key: "Enter",
  });
  await waitFor(() => assert.ok(trigger.textContent?.includes("No list")));
});
test("desktop flow: check a movie, undo, search, and switch to list view", async () => {
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="test" demo />,
  );
  fireEvent.click(
    app.getByRole("button", { name: "Complete: Dune: Part Two" }),
  );
  await waitFor(() =>
    assert.equal(
      app.queryByRole("button", { name: "Complete: Dune: Part Two" }),
      null,
    ),
  );
  fireEvent.click(app.getByRole("button", { name: "Undo" }));
  await waitFor(() =>
    assert.ok(app.getByRole("button", { name: "Complete: Dune: Part Two" })),
  );
  fireEvent.change(app.getByRole("textbox", { name: "Search your items" }), {
    target: { value: "Interstellar" },
  });
  assert.ok(app.getByRole("button", { name: "Edit Interstellar" }));
  assert.equal(
    app.queryByRole("button", { name: "Edit Dune: Part Two" }),
    null,
  );
  fireEvent.click(app.getByRole("button", { name: "List view" }));
  assert.equal(
    app.getByRole("button", { name: "List view" }).getAttribute("aria-pressed"),
    "true",
  );
  assert.ok(
    app.getByRole("button", { name: /Interstellar.*Christopher Nolan/ }),
  );
});
test("notes flow: edit, change tabs, create a new tab, and preserve content", async () => {
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="test" demo />,
  );
  fireEvent.click(app.getByRole("button", { name: /Notes/ }));
  await changeNote(
    app,
    "Contents of Quick notes",
    "Una idea que no se debe perder.",
  );
  fireEvent.click(app.getByRole("tab", { name: "Watchlist" }));
  fireEvent.click(app.getByRole("tab", { name: "Quick notes" }));
  assert.equal(
    (await app.findByRole("textbox", { name: "Contents of Quick notes" }))
      .textContent,
    "Una idea que no se debe perder.",
  );
  fireEvent.click(app.getByRole("button", { name: "New note tab" }));
  fireEvent.change(app.getByRole("textbox", { name: "Name" }), {
    target: { value: "Mi nueva pestaña" },
  });
  fireEvent.click(app.getByRole("button", { name: "Create" }));
  await waitFor(() =>
    assert.ok(app.getByRole("tab", { name: "Mi nueva pestaña" })),
  );
  assert.ok(
    await app.findByRole("textbox", {
      name: "Contents of Mi nueva pestaña",
    }),
  );
});
test("cloud notes autosave the latest text even after changing tabs", async () => {
  const originalFetch = globalThis.fetch;
  const writes: {
    action: string;
    note: {
      content: string;
    };
  }[] = [];
  globalThis.fetch = async (_url, options) => {
    writes.push(JSON.parse(String(options?.body)));
    return new Response(JSON.stringify({ data: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const app = render(
      <WorkspaceApp initial={structuredClone(demoWorkspace)} email="test" />,
    );
    fireEvent.click(app.getByRole("button", { name: /Notes/ }));
    await changeNote(app, "Contents of Quick notes", "Primer borrador");
    await changeNote(
      app,
      "Contents of Quick notes",
      "El texto final que se debe guardar",
    );
    fireEvent.click(app.getByRole("tab", { name: "Watchlist" }));
    await waitFor(() => assert.equal(writes.length, 1), { timeout: 2000 });
    assert.equal(writes[0].action, "save_note");
    assert.equal(writes[0].note.content, "El texto final que se debe guardar");
    await waitFor(() =>
      assert.ok(app.getByRole("button", { name: "All changes saved" })),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("tag menu can deselect a tag and reset to all without locking scroll", async () => {
  function Filter() {
    const [value, setValue] = React.useState<string[]>([]);
    return (
      <CompactSelect
        multiple
        label="Etiquetas del filtro"
        value={value}
        onValueChange={setValue}
        options={[
          { value: "Weekend", label: "Weekend" },
          { value: "Marvel", label: "Marvel" },
        ]}
      />
    );
  }
  const app = render(<Filter />);
  const trigger = app.getByRole("button", { name: "Etiquetas del filtro" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const weekend = await app.findByRole("menuitemcheckbox", { name: "Weekend" });
  fireEvent.click(weekend);
  assert.equal(weekend.getAttribute("aria-checked"), "true");
  assert.ok(trigger.textContent?.includes("Weekend"));
  fireEvent.click(weekend);
  assert.equal(weekend.getAttribute("aria-checked"), "false");
  fireEvent.click(weekend);
  fireEvent.click(app.getByRole("menuitemcheckbox", { name: "Marvel" }));
  assert.ok(trigger.textContent?.includes("2 tags"));
  fireEvent.click(app.getByRole("menuitemcheckbox", { name: "All tags" }));
  assert.equal(weekend.getAttribute("aria-checked"), "false");
  assert.ok(trigger.textContent?.includes("All tags"));
  assert.equal(document.body.hasAttribute("data-scroll-locked"), false);
});
test("task priority can be saved and edited without losing tags", async () => {
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="test" demo />,
  );
  fireEvent.click(app.getByRole("button", { name: /^Tasks/ }));
  fireEvent.click(app.getByRole("button", { name: /^New task/ }));
  fireEvent.change(app.getByRole("textbox", { name: "What needs doing?" }), {
    target: { value: "Comprar entradas" },
  });
  fireEvent.keyDown(app.getByRole("button", { name: "Priority" }), {
    key: "ArrowDown",
  });
  fireEvent.click(await app.findByRole("menuitemradio", { name: "Urgent" }));
  fireEvent.click(app.getByRole("button", { name: "Add to list" }));
  const title = await app.findByRole("button", { name: "Comprar entradas" });
  await waitFor(() => assert.equal(!!app.queryByRole("dialog"), false));
  assert.equal(
    title
      .closest("article")
      ?.querySelector(".priority-stripe")
      ?.getAttribute("aria-label"),
    "Priority: Urgent",
  );
  fireEvent.click(title);
  assert.ok(
    app
      .getByRole("button", { name: "Priority" })
      .textContent?.includes("Urgent"),
  );
  fireEvent.keyDown(app.getByRole("button", { name: "Priority" }), {
    key: "ArrowDown",
  });
  fireEvent.click(await app.findByRole("menuitemradio", { name: "Low" }));
  const tag = app.getByRole("combobox", { name: "Tags" });
  fireEvent.change(tag, { target: { value: "Personal" } });
  fireEvent.keyDown(tag, { key: "Enter" });
  fireEvent.click(app.getByRole("button", { name: "Save changes" }));
  await waitFor(() => assert.equal(!!app.queryByRole("dialog"), false));
  assert.equal(
    app
      .getByRole("button", { name: "Comprar entradas" })
      .closest("article")
      ?.querySelector(".priority-stripe")
      ?.getAttribute("aria-label"),
    "Priority: Low",
  );
  assert.ok(app.getByRole("button", { name: "Filter by Personal" }));
});
test("note lists, checkboxes and formatting survive Markdown round trips", async () => {
  let content =
    "# Plan\n\n- Películas\n- Series\n\n- [ ] Comprar entradas\n- [x] Elegir cine";
  const note = {
    ...demoWorkspace.notes[0],
    content,
    format: "markdown" as const,
  };
  const app = render(
    <NoteEditor
      note={note}
      onChange={(value) => {
        content = value;
      }}
    />,
  );
  const input = await app.findByRole("textbox", {
    name: "Contents of Quick notes",
  });
  assert.ok(app.getByRole("heading", { name: "Plan", level: 1 }));
  assert.equal(input.querySelectorAll("ul:not([data-type]) > li").length, 2);
  const checks = app.getAllByRole("checkbox");
  assert.equal((checks[0] as HTMLInputElement).checked, false);
  assert.equal((checks[1] as HTMLInputElement).checked, true);
  fireEvent.click(checks[0]);
  assert.ok(content.includes("[x] Comprar entradas"));
  const editor = (
    input as HTMLElement & {
      editor: Editor;
    }
  ).editor;
  act(() =>
    editor.commands.setContent("Una idea", { contentType: "markdown" }),
  );
  act(() => editor.commands.selectAll());
  fireEvent.click(app.getByRole("button", { name: "Bold (Ctrl+B)" }));
  assert.equal(content, "**Una idea**");
  fireEvent.click(app.getByRole("button", { name: "Bullet list" }));
  assert.ok(input.querySelector("ul > li > p > strong"));
  act(() => editor.commands.setContent(content, { contentType: "markdown" }));
  assert.ok(input.querySelector("ul > li > p > strong"));
});
test("old plain notes preserve literal markup and do not autosave on opening", async () => {
  const literal = "# Literal\n<script>alert(1)</script>\n**Sin formato**";
  let writes = 0;
  const note = {
    ...demoWorkspace.notes[0],
    content: literal,
    format: "plain" as const,
  };
  const app = render(
    <NoteEditor
      note={note}
      onChange={() => {
        writes++;
      }}
    />,
  );
  const input = await app.findByRole("textbox");
  assert.equal(input.querySelector("script"), null);
  assert.equal(input.querySelector("h1"), null);
  assert.equal(input.querySelector("strong"), null);
  assert.ok(input.textContent?.includes("<script>alert(1)</script>"));
  assert.ok(input.textContent?.includes("**Sin formato**"));
  assert.equal(writes, 0);
});

test("language selection translates the interface and persists the choice", async () => {
  const app = render(<LoginForm configured showPreview />);
  assert.ok(app.getByRole("heading", { name: "Welcome back." }));
  fireEvent.keyDown(app.getByRole("button", { name: "Language" }), {
    key: "ArrowDown",
  });
  fireEvent.click(await app.findByRole("menuitemradio", { name: "Español" }));
  assert.ok(app.getByRole("heading", { name: "Qué bueno verte." }));
  assert.ok(app.getByRole("button", { name: "Entrar a mi espacio" }));
  assert.equal(document.documentElement.lang, "es");
  assert.equal(localStorage.getItem("tick-language"), "es");
  await waitFor(() => assert.equal(!!app.queryByRole("menu"), false));
  fireEvent.keyDown(app.getByRole("button", { name: "Idioma" }), {
    key: "ArrowDown",
  });
  fireEvent.click(await app.findByRole("menuitemradio", { name: "English" }));
  await app.findByRole("heading", { name: "Welcome back." });
});

test("login preview supports keyboard switching without clearing the form", () => {
  const screenshots = ["Overview", "Tasks", "Notes"].map((label) => ({
    id: label.toLowerCase(),
    label,
    src: `/${label.toLowerCase()}.webp`,
    width: 1600,
    height: 900,
  }));
  const app = render(
    <LoginForm configured showPreview screenshots={screenshots} />,
  );
  fireEvent.change(app.getByLabelText("Username"), {
    target: { value: "reader" },
  });
  fireEvent.keyDown(app.getByRole("tab", { name: "Overview" }), {
    key: "ArrowRight",
  });
  assert.equal(
    app.getByRole("tab", { name: "Tasks" }).getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    app.getByRole("img", { name: "tick preview: Tasks" }).getAttribute("src"),
    "/tasks.webp",
  );
  fireEvent.keyDown(app.getByRole("tab", { name: "Tasks" }), { key: "End" });
  assert.equal(
    app.getByRole("tab", { name: "Notes" }).getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    (app.getByLabelText("Username") as HTMLInputElement).value,
    "reader",
  );
});

test("profile starts neutral and saves a chosen name without affecting login credentials", async () => {
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="demo" demo />,
  );
  assert.equal(app.container.querySelectorAll(".avatar img").length, 0);
  fireEvent.click(app.getByRole("button", { name: "Edit profile" }));
  fireEvent.change(app.getByRole("textbox", { name: "Display name" }), {
    target: { value: "Taylor" },
  });
  const file = new dom.window.File(["not an image"], "photo.gif", {
    type: "image/gif",
  });
  fireEvent.change(app.getByLabelText("Profile photo"), {
    target: { files: [file] },
  });
  await app.findByRole("alert");
  assert.ok(app.getByRole("alert").textContent?.includes("JPG, PNG or WebP"));
  fireEvent.click(app.getByRole("button", { name: "Save profile" }));
  await waitFor(() => assert.equal(!!app.queryByRole("dialog"), false));
  assert.ok(app.getByText("Taylor"));
  assert.equal(
    JSON.parse(localStorage.getItem("tick-demo-profile")!).display_name,
    "Taylor",
  );
  assert.equal(
    JSON.parse(localStorage.getItem("tick-demo-profile")!).avatar_data,
    null,
  );
});

test("list icons survive creation and editing", async () => {
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="demo" demo />,
  );
  fireEvent.click(app.getByRole("button", { name: /^Tasks/ }));
  fireEvent.click(app.getByRole("button", { name: "New list" }));
  fireEvent.change(app.getByRole("textbox", { name: "Name" }), {
    target: { value: "Weekend plan" },
  });
  fireEvent.click(app.getByRole("button", { name: "Heart" }));
  fireEvent.click(app.getByRole("button", { name: "Create" }));
  await waitFor(() => assert.equal(!!app.queryByRole("dialog"), false));
  assert.ok(app.getByRole("tab", { name: /Weekend plan/ }));
  fireEvent.click(app.getByRole("button", { name: "Edit list" }));
  assert.equal(
    app.getByRole("button", { name: "Heart" }).getAttribute("aria-pressed"),
    "true",
  );
  fireEvent.click(app.getByRole("button", { name: "Game" }));
  fireEvent.click(app.getByRole("button", { name: "Save changes" }));
  await waitFor(() => assert.equal(!!app.queryByRole("dialog"), false));
  fireEvent.click(app.getByRole("button", { name: "Edit list" }));
  assert.equal(
    app.getByRole("button", { name: "Game" }).getAttribute("aria-pressed"),
    "true",
  );
});

test("maximizing notes preserves the editor, content and focus when restored", async () => {
  const app = render(
    <WorkspaceApp initial={structuredClone(demoWorkspace)} email="demo" demo />,
  );
  fireEvent.click(app.getByRole("button", { name: /^Notes/ }));
  const editor = await changeNote(
    app,
    "Contents of Quick notes",
    "# Draft\n\n- Next action",
  );
  const maximize = app.getByRole("button", { name: "Maximize notes" });
  maximize.focus();
  fireEvent.click(maximize);
  const panel = app.getByRole("dialog", { name: "Notes" });
  assert.ok(panel.classList.contains("maximized"));
  assert.equal(document.body.style.overflow, "hidden");
  assert.equal(
    app.getByRole("textbox", { name: "Contents of Quick notes" }),
    editor,
  );
  fireEvent.click(app.getByRole("tab", { name: "Watchlist" }));
  fireEvent.click(app.getByRole("tab", { name: "Quick notes" }));
  assert.ok(
    (
      await app.findByRole("textbox", { name: "Contents of Quick notes" })
    ).textContent?.includes("Next action"),
  );
  fireEvent.keyDown(panel, { key: "Escape" });
  assert.equal(app.queryByRole("dialog", { name: "Notes" }), null);
  assert.equal(document.body.style.overflow, "");
  assert.ok(app.getByRole("button", { name: "Maximize notes" }));
  assert.equal(
    document.activeElement ===
      app.getByRole("button", { name: "Maximize notes" }),
    true,
    "Focus returns to the current maximize button",
  );
});

test("the maximized bloc can still be restored after its last note is deleted", async () => {
  const initial = structuredClone(demoWorkspace);
  initial.notes = initial.notes.slice(0, 1);
  const app = render(<WorkspaceApp initial={initial} email="demo" demo />);
  fireEvent.click(app.getByRole("button", { name: /^Notes/ }));
  await app.findByRole("textbox", { name: "Contents of Quick notes" });
  fireEvent.click(app.getByRole("button", { name: "Maximize notes" }));
  fireEvent.click(app.getByRole("button", { name: "Close note Quick notes" }));
  fireEvent.click(app.getByRole("button", { name: "Delete" }));
  await waitFor(() =>
    assert.equal(
      !!app.queryByRole("textbox", { name: "Contents of Quick notes" }),
      false,
    ),
  );
  fireEvent.click(app.getByRole("button", { name: "Restore notes" }));
  assert.equal(app.queryByRole("dialog", { name: "Notes" }), null);
  assert.ok(app.getByRole("button", { name: "Create a note" }));
});
