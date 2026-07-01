import { auth } from "@/auth";
import { store } from "@/lib/store";
import { ChangePasswordForm, ChangePatForm } from "./settings-form";
import { UsersSection } from "./users-section";

export default async function SettingsPage() {
  const session = await auth();
  const users = session?.user?.isAdmin ? await store.listUsers() : [];

  return (
    <div>
      <h1 className="text-lg font-medium">Settings</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ChangePasswordForm />
        <ChangePatForm githubLogin={session?.user?.githubLogin} />
      </div>
      {session?.user?.isAdmin && (
        <div className="mt-4">
          <UsersSection
            currentUserId={session.user.id}
            users={users.map((u) => ({
              id: u.id,
              email: u.email,
              githubLogin: u.githubLogin,
              isAdmin: u.isAdmin,
              createdAt: u.createdAt,
            }))}
          />
        </div>
      )}
    </div>
  );
}
