"use server";

import { sendReplyMessage } from "@/lib/clickup/client";

export async function notifyBlockedPrAction(
  messageId: string,
  content: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendReplyMessage(messageId, content);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Notify failed" };
  }
}
