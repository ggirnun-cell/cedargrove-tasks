"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  createTasks,
  setTaskComplete,
  updateTask,
  type PingCadence,
  type TaskPriority,
  type TaskTarget,
} from "@/lib/tasks";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const CADENCES: PingCadence[] = ["daily", "every_2_days", "every_3_days", "weekly"];

function readPriority(formData: FormData): TaskPriority {
  const v = String(formData.get("priority") ?? "");
  return (PRIORITIES as string[]).includes(v) ? (v as TaskPriority) : "medium";
}
function readCadence(formData: FormData): PingCadence {
  const v = String(formData.get("cadence") ?? "");
  return (CADENCES as string[]).includes(v) ? (v as PingCadence) : "daily";
}

function parseTargets(raw: string): TaskTarget[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object" && typeof t.label === "string")
    .map((t) => ({
      propertyId: typeof t.propertyId === "string" ? t.propertyId : null,
      jobFunction: typeof t.jobFunction === "string" ? (t.jobFunction as TaskTarget["jobFunction"]) : null,
      recipientEmail: typeof t.recipientEmail === "string" ? t.recipientEmail : null,
      label: String(t.label),
    }));
}

export async function createTaskAction(formData: FormData): Promise<void> {
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");

  // Catch only the work — never the redirect() calls, which throw by design.
  let error = "";
  try {
    await createTasks(me, {
      title: String(formData.get("title") ?? ""),
      notes: String(formData.get("notes") ?? "") || null,
      priority: readPriority(formData),
      cadence: readCadence(formData),
      escalationThreshold: Number(formData.get("escalationThreshold") ?? 3),
      targets: parseTargets(String(formData.get("targets") ?? "[]")),
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not create the task.";
  }

  if (error) redirect(`/tasks/new?error=${encodeURIComponent(error)}`);
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateTaskAction(formData: FormData): Promise<void> {
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");
  const taskId = String(formData.get("taskId") ?? "");

  let error = "";
  try {
    await updateTask(me, taskId, {
      title: String(formData.get("title") ?? ""),
      notes: String(formData.get("notes") ?? "") || null,
      priority: readPriority(formData),
      cadence: readCadence(formData),
      escalationThreshold: Number(formData.get("escalationThreshold") ?? 3),
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not save the task.";
  }

  if (error) redirect(`/tasks/${taskId}?error=${encodeURIComponent(error)}`);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  redirect(`/tasks/${taskId}`);
}

export async function toggleCompleteAction(formData: FormData): Promise<void> {
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");
  const taskId = String(formData.get("taskId") ?? "");
  const complete = String(formData.get("complete") ?? "") === "true";

  await setTaskComplete(me, taskId, complete);

  revalidatePath("/tasks");
  revalidatePath("/my-tasks");
  revalidatePath(`/tasks/${taskId}`);
}
