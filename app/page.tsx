import { redirect } from "next/navigation";
import { getAdmin, isConfigured } from "@/lib/supabase/server";
import { WorkspaceApp } from "@/components/workspace-app";
import type { Workspace } from "@/lib/types";
import { SetupNotice } from "@/components/setup-notice";

export const dynamic = "force-dynamic";
export default async function Home() {
  if (!isConfigured()) redirect("/login");
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  const [items, notes, lists] = await Promise.all([
    admin.client.from("tick_items").select("*").order("position"),
    admin.client.from("tick_notes").select("*").order("position"),
    admin.client.from("tick_lists").select("*").order("position"),
  ]);
  const { data: profile } = await admin.client
    .from("tick_profiles")
    .select("display_name,avatar_data")
    .eq("user_id", admin.user.id)
    .maybeSingle();
  if (items.error || notes.error || lists.error) {
    return <SetupNotice />;
  }
  return (
    <WorkspaceApp
      initial={
        { items: items.data, notes: notes.data, lists: lists.data } as Workspace
      }
      email={process.env.ADMIN_USERNAME ?? "User"}
      initialProfile={
        profile ?? {
          display_name:
            admin.user.user_metadata?.display_name ||
            process.env.ADMIN_USERNAME ||
            "User",
          avatar_data: null,
        }
      }
    />
  );
}
