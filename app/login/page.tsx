import { redirect } from "next/navigation";
import { getAdmin, isConfigured } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (await getAdmin()) redirect("/");
  return <LoginForm configured={isConfigured()} showPreview />;
}
