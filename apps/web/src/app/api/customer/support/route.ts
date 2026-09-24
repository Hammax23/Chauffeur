import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getActiveCustomerFromRequest,
  customerAuthFailurePayload,
} from "@/lib/customer-auth";
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

/** Keep message readable in admin (escape only when rendering HTML email). */
function cleanMessage(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

/**
 * Authenticated customer: submit in-app Contact Us / support ticket.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getActiveCustomerFromRequest(req);
    if (!auth.ok) {
      const fail = customerAuthFailurePayload(auth.reason);
      return NextResponse.json(fail.body, { status: fail.status });
    }
    const customer = auth.customer;

    const profile = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Customer not found." },
        { status: 404 }
      );
    }

    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`support:${customer.id}:${clientIp}`, {
      maxRequests: 5,
      windowMs: 60 * 1000,
    });
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
      typeof body?.subject === "string" ? body.subject.replace(/\u0000/g, "").trim() : "";
    const subject = subjectRaw ? subjectRaw.slice(0, 120) : null;

    if (!type) {
      return NextResponse.json(
        { success: false, error: "Please select a valid topic." },
        { status: 400 }
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a message (at least 10 characters)." },
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
        customerId: profile.id,
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
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
      void sendTransactionalEmail({
        to: inbox,
        subject: `App Support [${ticket.ticketId}]: ${type}`,
        logLabel: "support-ticket",
        html: `
          <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a">
            <h2 style="margin:0 0 12px">New in-app support message</h2>
            <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketId)}</p>
            <p><strong>Type:</strong> ${escapeHtml(type)}</p>
            ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ""}
            <p><strong>Customer:</strong> ${escapeHtml(name || "—")}</p>
            <p><strong>Email:</strong> ${escapeHtml(profile.email || "—")}</p>
            <p><strong>Phone:</strong> ${escapeHtml(profile.phone || "—")}</p>
            <p><strong>Message:</strong></p>
            <pre style="white-space:pre-wrap;background:#f6f4f0;padding:12px;border-radius:8px">${escapeHtml(message)}</pre>
            <p style="color:#666;font-size:13px">View in Admin → Support Tickets</p>
          </div>
        `,
      }).catch((err) => console.error("[support] admin email", err));
    }

    return NextResponse.json({
      success: true,
      message: "Your message has been sent. Our team will get back to you soon.",
      ticket,
    });
  } catch (error) {
    console.error("Customer support submit error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to send your message. Please try again." },
      { status: 500 }
    );
  }
}
