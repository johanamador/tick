import { WorkspaceApp } from "@/components/workspace-app";
import { demoWorkspace } from "@/lib/demo";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export default async function Demo() {
  const notes = await Promise.all(
    demoWorkspace.notes.map(async (note) => ({
      ...note,
      content: await readFile(
        join(process.cwd(), "content/demo", `${note.id}.md`),
        "utf8",
      ),
    })),
  );
  return (
    <WorkspaceApp
      initial={{ ...demoWorkspace, notes }}
      demo
      email="demo"
    />
  );
}
