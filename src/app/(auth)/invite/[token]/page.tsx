import { store } from "@/lib/store";
import { hashInviteToken } from "@/lib/auth/invite-token";
import { AcceptInviteForm } from "./accept-invite-form";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await store.getInviteByTokenHash(hashInviteToken(token));
  const invalid = !invite || invite.acceptedAt || new Date(invite.expiresAt) < new Date();

  if (invalid) {
    return (
      <div className="space-y-2">
        <h1 className="text-base font-medium">Invite invalid</h1>
        <p className="text-sm text-muted-foreground">
          This invite link is invalid or has expired. Ask an admin to send a new one.
        </p>
      </div>
    );
  }

  return <AcceptInviteForm token={token} email={invite.email} />;
}
