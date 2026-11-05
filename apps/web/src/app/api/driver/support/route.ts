import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyDriverToken } from "@/lib/driver-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendTransactionalEmail, escapeHtml } from "@/lib/email-delivery";
import { SUPPORT_TICKET_TYPE_SET } from "@/lib/support-ticket-types";

function adminInbox(): string | undefined {
  return (
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    undefined
  );
}

function makeTicketId(): string {
  return `ST-${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

function cleanMessage(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

/**
 * Authenticated driver: submit in-app Contact Us / support ticket.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await verifyDriverToken(req);
    if (!token?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const profile = await prisma.driver.findUnique({
      where: { id: token.id },
      select: {
        id: true,
        driverId: true,
        name: true,
        email: true,
        phone: true,
      },
    });
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Driver not found." },
        { status: 404 }
      );
    }

    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit(
      `driver-support:${profile.id}:${clientIp}`,
      {
        maxRequests: 5,
        windowMs: 60 * 1000,
      }
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const typeRaw = typeof body?.type === "string" ? body.type.trim() : "";
    const type = SUPPORT_TICKET_TYPE_SET.has(typeRaw) ? typeRaw : "";
    const message = cleanMessage(body?.message);
    const subjectRaw =
      typeof body?.subject === "string"
        ? body.subject.replace(/\u0000/g, "").trim()
        : "";
    const subject = subjectRaw ? subjectRaw.slice(0, 120) : null;

    if (!type) {
      return NextResponse.json(
        { success: false, error: "Please select a valid topic." },
        { status: 400 }
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a message (at least 10 characters).",
        },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { success: false, error: "Message is too long (max 4000 characters)." },
        { status: 400 }
      );
    }

    const ticketId = makeTicketId();
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketId,
        driverId: profile.id,
        type,
        subject,
        message,
        status: "NEW",
      },
      select: {
        id: true,
        ticketId: true,
        type: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    });

    const inbox = adminInbox();
    if (inbox) {
      void sendTransactionalEmail({
        to: inbox,
        replyTo: profile.email || undefined,
        subject: `Driver App Support [${ticket.ticketId}]: ${type}`,
        logLabel: "driver-support-ticket",
        html: `
          <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a">
            <h2 style="margin:0 0 12px">New driver in-app support message</h2>
            <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketId)}</p>
            <p><strong>Type:</strong> ${escapeHtml(type)}</p>
            ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ""}
            <p><strong>Driver:</strong> ${escapeHtml(profile.name || "—")}</p>
            <p><strong>Driver ID:</strong> ${escapeHtml(profile.driverId || "—")}</p>
            <p><strong>Email:</strong> ${escapeHtml(profile.email || "—")}</p>
            <p><strong>Phone:</strong> ${escapeHtml(profile.phone || "—")}</p>
            <p><strong>Message:</strong></p>
            <pre style="white-space:pre-wrap;background:#f6f4f0;padding:12px;border-radius:8px">${escapeHtml(message)}</pre>
            <p style="color:#666;font-size:13px">View in Admin → Support Tickets</p>
          </div>
        `,
      }).catch((err) => console.error("[driver-support] admin email", err));
    }

    return NextResponse.json({
      success: true,
      message: "Your message has been sent. Our team will get back to you soon.",
      ticket,
    });
  } catch (error) {
    console.error("Driver support submit error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to send your message. Please try again.",
      },
      { status: 500 }
    );
  }
}
