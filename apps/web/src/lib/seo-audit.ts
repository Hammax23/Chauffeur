import prisma from "@/lib/prisma";

export type SeoAuditAction = "create" | "update" | "delete" | "import" | "export" | "sync" | "seed";
export type SeoAuditEntity =
  | "page"
  | "blog"
  | "redirect"
  | "settings"
  | "city"
  | "service"
  | "bulk";

export async function logSeoAudit(params: {
  action: SeoAuditAction;
  entityType: SeoAuditEntity;
  entityId?: string | null;
  entityLabel?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  try {
    await prisma.seoAuditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        entityLabel: params.entityLabel ?? null,
        details: params.details ?? undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("[SEO Audit]", error);
  }
}
