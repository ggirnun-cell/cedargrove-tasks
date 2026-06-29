import { redirect } from "next/navigation";

// Admin index → users management.
export default function AdminIndex() {
  redirect("/admin/users");
}
