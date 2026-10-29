import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/supabase/server";
import {
  itemInput,
  noteInput,
  reorderInput,
  listIconInput,
  profileInput,
} from "@/lib/validation";
import { isSameOrigin } from "@/lib/security";
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  const admin = await getAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "Your session expired. Sign in again." },
      { status: 401 },
    );
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string")
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { client, user } = admin;
  try {
    let data: unknown = null;
    switch (body.action) {
      case "create_item": {
        const item = itemInput.parse(body.item);
        const { data: last } = await client
          .from("tick_items")
          .select("position")
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();
        const result = await client
          .from("tick_items")
          .insert({
            ...item,
            user_id: user.id,
            position: (last?.position ?? -1) + 1,
          })
          .select()
          .single();
        if (result.error) throw result.error;
        data = result.data;
        break;
      }
      case "update_item": {
        const id = z.uuid().parse(body.id);
        const item = itemInput.parse(body.item);
        const result = await client
          .from("tick_items")
          .update(item)
          .eq("id", id)
          .select()
          .single();
        if (result.error) throw result.error;
        data = result.data;
        break;
      }
      case "complete_item": {
        const id = z.uuid().parse(body.id);
        const completed = z.boolean().parse(body.completed);
        const result = await client
          .from("tick_items")
          .update({ completed_at: completed ? new Date().toISOString() : null })
          .eq("id", id)
          .select()
          .single();
        if (result.error) throw result.error;
        data = result.data;
        break;
      }
      case "delete_item": {
        const result = await client
          .from("tick_items")
          .delete()
          .eq("id", z.uuid().parse(body.id));
        if (result.error) throw result.error;
        break;
      }
      case "reorder": {
        const ids = reorderInput.parse(body.ids);
        const result = await client.rpc("tick_reorder", {
          ordered_ids: ids,
        });
        if (result.error) throw result.error;
        break;
      }
      case "save_note": {
        const note = noteInput.parse(body.note);
        const result = note.id
          ? await client
              .from("tick_notes")
              .update({
                title: note.title,
                content: note.content,
                format: note.format,
              })
              .eq("id", note.id)
              .select()
              .single()
          : await client
              .from("tick_notes")
              .insert({
                title: note.title,
                content: note.content,
                format: note.format,
                position: note.position ?? 0,
                user_id: user.id,
              })
              .select()
              .single();
        if (result.error) throw result.error;
        data = result.data;
        break;
      }
      case "delete_note": {
        const result = await client
          .from("tick_notes")
          .delete()
          .eq("id", z.uuid().parse(body.id));
        if (result.error) throw result.error;
        break;
      }
      case "save_list": {
        const title = z.string().trim().min(1).max(80).parse(body.title);
        const icon = listIconInput.parse(body.icon);
        const result = body.id
          ? await client
              .from("tick_lists")
              .update({ title, icon })
              .eq("id", z.uuid().parse(body.id))
              .select()
              .single()
          : await client
              .from("tick_lists")
              .insert({
                title,
                icon,
                user_id: user.id,
                position: z
                  .number()
                  .int()
                  .min(0)
                  .max(1000)
                  .parse(body.position ?? 0),
              })
              .select()
              .single();
        if (result.error) throw result.error;
        data = result.data;
        break;
      }
      case "delete_list": {
        const result = await client
          .from("tick_lists")
          .delete()
          .eq("id", z.uuid().parse(body.id));
        if (result.error) throw result.error;
        break;
      }
      case "save_profile": {
        const profile = profileInput.parse(body.profile);
        const result = await client
          .from("tick_profiles")
          .upsert({ user_id: user.id, ...profile })
          .select("display_name,avatar_data")
          .single();
        if (result.error) throw result.error;
        data = result.data;
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Check the title and content." },
        { status: 400 },
      );
    console.error(
      "Workspace operation failed:",
      body.action,
      (
        error as {
          code?: string;
        }
      ).code ?? "unknown",
    );
    return NextResponse.json(
      {
        error: "Could not save. Your changes are still here; try again.",
      },
      { status: 500 },
    );
  }
}
