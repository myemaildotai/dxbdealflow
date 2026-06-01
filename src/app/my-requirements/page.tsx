import { redirect } from "next/navigation";

export default function MyRequirementsPage() {
  redirect("/dashboard?section=requirements");
}
