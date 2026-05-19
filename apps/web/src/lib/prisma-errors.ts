import { Prisma } from "@prisma/client";

/** Maps known Prisma errors to API-friendly messages (e.g. missing table after migrate not run). */
export function prismaKnownErrorResponse(e: unknown): { message: string; status: number } | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021") {
      return {
        message:
          "Database table missing. From apps/web run: npx prisma migrate deploy — or local dev: npx prisma db push",
        status: 503,
      };
    }
  }
  return null;
}
