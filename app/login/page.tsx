import { redirect } from "next/navigation";
import { getAdmin, isConfigured } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
import overview from "@/docs/screenshots/overview.webp";
import tasks from "@/docs/screenshots/tasks.webp";
import notes from "@/docs/screenshots/notes.webp";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (await getAdmin()) redirect("/");
  return (
    <LoginForm
      configured={isConfigured()}
      showPreview
      screenshots={[
        { id: "overview", label: "Overview", ...overview },
        { id: "tasks", label: "Tasks", ...tasks },
        { id: "notes", label: "Notes", ...notes },
      ]}
    />
  );
}
