import prisma from "@/lib/prisma";
import { sendBulkPushNotifications, sendPushNotification } from "@/lib/push-notifications";

export type PushRole = "CUSTOMER" | "DRIVER";

/** Upsert device token and mirror onto legacy Customer/Driver.pushToken. */
export async function upsertPushDevice(opts: {
  role: PushRole;
  userId: string;
  token: string;
  platform?: string | null;
}): Promise<void> {
  const token = opts.token.trim();
  if (!token) return;

  await prisma.pushDevice.upsert({
    where: { token },
    create: {
      role: opts.role,
      userId: opts.userId,
      token,
      platform: opts.platform?.trim() || null,
    },
    update: {
      role: opts.role,
      userId: opts.userId,
      platform: opts.platform?.trim() || null,
    },
  });

  // Prevent cross-account leak: same Expo token must not stay on another user's legacy column.
  await Promise.all([
    prisma.customer.updateMany({
      where: { pushToken: token, NOT: { id: opts.userId } },
      data: { pushToken: null },
    }),
    prisma.driver.updateMany({
      where: { pushToken: token, NOT: { id: opts.userId } },
      data: { pushToken: null },
    }),
  ]);

  if (opts.role === "CUSTOMER") {
    await prisma.customer.update({
      where: { id: opts.userId },
      data: { pushToken: token },
    });
  } else {
    await prisma.driver.update({
      where: { id: opts.userId },
      data: { pushToken: token },
    });
  }
}

/** Remove one device token (logout). Also clears legacy column if it matched. */
export async function deletePushDeviceByToken(opts: {
  role: PushRole;
  userId: string;
  token: string;
}): Promise<number> {
  const token = opts.token.trim();
  if (!token) return 0;

  const result = await prisma.pushDevice.deleteMany({
    where: { token, role: opts.role, userId: opts.userId },
  });

  if (opts.role === "CUSTOMER") {
    await prisma.customer.updateMany({
      where: { id: opts.userId, pushToken: token },
      data: { pushToken: null },
    });
  } else {
    await prisma.driver.updateMany({
      where: { id: opts.userId, pushToken: token },
      data: { pushToken: null },
    });
  }

  return result.count;
}

/** Wipe all devices for a user (deactivate / admin block). */
export async function deleteAllPushDevicesForUser(
  role: PushRole,
  userId: string
): Promise<number> {
  const result = await prisma.pushDevice.deleteMany({
    where: { role, userId },
  });

  if (role === "CUSTOMER") {
    await prisma.customer.updateMany({
      where: { id: userId },
      data: { pushToken: null },
    });
  } else {
    await prisma.driver.updateMany({
      where: { id: userId },
      data: { pushToken: null },
    });
  }

  return result.count;
}

/** All Expo tokens for one user (PushDevice + legacy fallback). */
export async function listPushTokensForUser(
  role: PushRole,
  userId: string
): Promise<string[]> {
  if (!userId) return [];

  const devices = await prisma.pushDevice.findMany({
    where: { role, userId },
    select: { token: true },
  });
  const tokens = new Set(devices.map((d) => d.token).filter(Boolean));

  if (tokens.size === 0) {
    if (role === "CUSTOMER") {
      const c = await prisma.customer.findUnique({
        where: { id: userId },
        select: { pushToken: true },
      });
      if (c?.pushToken) tokens.add(c.pushToken);
    } else {
      const d = await prisma.driver.findUnique({
        where: { id: userId },
        select: { pushToken: true },
      });
      if (d?.pushToken) tokens.add(d.pushToken);
    }
  }

  return [...tokens];
}

/** Batch tokens for many users — used by live-auto / concierge fan-out. */
export async function listPushTokensByUserIds(
  role: PushRole,
  userIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return map;

  const devices = await prisma.pushDevice.findMany({
    where: { role, userId: { in: ids } },
    select: { userId: true, token: true },
  });

  for (const d of devices) {
    const list = map.get(d.userId) ?? [];
    list.push(d.token);
    map.set(d.userId, list);
  }

  const missing = ids.filter((id) => !map.has(id) || (map.get(id)?.length ?? 0) === 0);
  if (missing.length === 0) return map;

  if (role === "CUSTOMER") {
    const rows = await prisma.customer.findMany({
      where: { id: { in: missing }, pushToken: { not: null } },
      select: { id: true, pushToken: true },
    });
    for (const r of rows) {
      if (r.pushToken) map.set(r.id, [r.pushToken]);
    }
  } else {
    const rows = await prisma.driver.findMany({
      where: { id: { in: missing }, pushToken: { not: null } },
      select: { id: true, pushToken: true },
    });
    for (const r of rows) {
      if (r.pushToken) map.set(r.id, [r.pushToken]);
    }
  }

  return map;
}

/** Fan-out one notification to every device for a user. */
export async function notifyUserDevices(
  role: PushRole,
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; tokenCount: number; error?: string }> {
  const tokens = await listPushTokensForUser(role, userId);
  if (tokens.length === 0) {
    return { success: false, tokenCount: 0, error: "no tokens" };
  }

  if (tokens.length === 1) {
    const r = await sendPushNotification(tokens[0], title, body, data);
    return { success: !!r.success, tokenCount: 1, error: r.error };
  }

  const r = await sendBulkPushNotifications(
    tokens.map((pushToken) => ({ pushToken, title, body, data }))
  );
  return { success: !!r.success, tokenCount: tokens.length, error: r.error };
}

/** Badge-only / silent sync — no sound, updates app icon badge on other devices. */
export async function pushBadgeSyncToUser(
  role: PushRole,
  userId: string,
  badge: number
): Promise<void> {
  const tokens = await listPushTokensForUser(role, userId);
  if (tokens.length === 0) return;

  const safeBadge = Math.max(0, Math.floor(badge));
  await sendBulkPushNotifications(
    tokens.map((pushToken) => ({
      pushToken,
      title: "",
      body: "",
      data: {
        type: "chat_badge",
        badge: safeBadge,
        channelId: "chat",
        silent: true,
        collapseId: `chat_badge:${role}:${userId}`,
        eventId: `chat_badge:${role}:${userId}:${safeBadge}:${Date.now()}`,
      },
    }))
  );
}
