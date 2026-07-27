import { client } from "./client";

/** Send a "Chat with Support" message. The backend relays it to the Sabako
 *  support inbox by email. Resolves on success, throws on failure. */
export async function sendSupportMessage(subject: string, message: string): Promise<void> {
  await client.post("/api/support", { subject, message });
}
