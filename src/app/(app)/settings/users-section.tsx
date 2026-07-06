"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inviteUserAction, updateUserAdminAction, deleteUserAction } from "./actions";

export interface SettingsUser {
  id: string;
  email: string;
  githubLogin: string;
  isAdmin: boolean;
  createdAt: string;
}

function formatJoined(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function InviteDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [link, setLink] = React.useState<string | null>(null);

  function handleOpen() {
    setEmail("");
    setError(null);
    setLink(null);
    setOpen(true);
  }

  async function invite() {
    setPending(true);
    setError(null);
    const res = await inviteUserAction(email);
    setPending(false);
    if (!res.ok || !res.token) {
      setError(res.error ?? "Could not create invite.");
      return;
    }
    setLink(`${window.location.origin}/invite/${res.token}`);
    router.refresh();
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>Invite</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-w-md flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Invite User</DialogTitle>
          </DialogHeader>

          {!link ? (
            <>
              <div className="px-5 py-5">
                <label className="mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@happykids.id"
                  autoFocus
                />
                {error && <p className="mt-2 text-xs text-status-error">{error}</p>}
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" loading={pending} disabled={!email.trim()} onClick={invite}>
                  {pending ? "Generating…" : "Generate Invite Link"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3 px-5 py-5">
                <p className="text-sm text-muted-foreground">
                  Share this link with <span className="text-foreground">{email.trim().toLowerCase()}</span>. It expires in 7 days.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs">{link}</span>
                  <Button size="sm" variant="outline" onClick={copyLink}>Copy</Button>
                </div>
              </div>
              <div className="flex shrink-0 justify-end border-t border-border px-5 py-4">
                <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RemoveUserDialog({ user, onConfirm }: { user: SettingsUser; onConfirm: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="hover:border-status-error/40 hover:text-status-error" onClick={() => setOpen(true)}>
        Remove
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove user</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-medium text-foreground">{user.email}</span>? They will lose access immediately.
          </p>
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="border-status-error/40 bg-status-error/10 text-status-error hover:bg-status-error/20"
              onClick={() => { setOpen(false); onConfirm(); }}
            >
              Remove User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserRow({ user, currentUserId }: { user: SettingsUser; currentUserId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const isSelf = user.id === currentUserId;

  async function toggleAdmin() {
    setPending(true);
    const res = await updateUserAdminAction(user.id, !user.isAdmin);
    setPending(false);
    if (!res.ok) { toast.error(res.error ?? "Could not update user."); return; }
    router.refresh();
  }

  async function remove() {
    const res = await deleteUserAction(user.id);
    if (!res.ok) { toast.error(res.error ?? "Could not remove user."); return; }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{user.email}</span>
          {user.isAdmin && <Badge variant="instrument" size="sm">Admin</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          <span>{user.githubLogin}</span> · joined {formatJoined(user.createdAt)}
        </p>
      </div>
      {!isSelf && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={toggleAdmin}>
            {user.isAdmin ? "Remove Admin" : "Make Admin"}
          </Button>
          <RemoveUserDialog user={user} onConfirm={remove} />
        </div>
      )}
    </div>
  );
}

export function UsersSection({ users, currentUserId }: { users: SettingsUser[]; currentUserId: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/50 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-3">
        <div>
          <h2 className="text-sm font-medium">Users</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Invite teammates and manage admin access.</p>
        </div>
        <InviteDialog />
      </div>
      <div className="space-y-2">
        {users.map((u) => <UserRow key={u.id} user={u} currentUserId={currentUserId} />)}
      </div>
    </div>
  );
}
