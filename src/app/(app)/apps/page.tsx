import { redirect } from "next/navigation";
import { getSelectedEnvironment } from "@/lib/apps/session-env";

export default async function AppsPage() {
  await getSelectedEnvironment();
  redirect("/apps/secrets");
}
