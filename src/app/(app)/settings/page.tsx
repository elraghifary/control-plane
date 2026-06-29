import { auth } from "@/auth";
import { ChangePasswordForm, ChangePatForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  return (
    <div>
      <h1 className="text-lg font-medium">Settings</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ChangePasswordForm />
        <ChangePatForm githubLogin={session?.user?.githubLogin} />
      </div>
    </div>
  );
}
