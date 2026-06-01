import { redirect } from "next/navigation";

export default function AdminRequirementsPage() {
  redirect("/admin?tab=requirements");
}
