import Stripe from "stripe";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export function safeReturnBase(raw?: unknown): string {
  const fallback = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  const candidate = String(raw || "").trim().replace(/\/+$/, "");
  if (!candidate) return fallback;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return fallback;
    return `${u.protocol}//${u.host}`;
  } catch {
    return fallback;
  }
}

type ReservationCheckoutInput = {
  bookingId: string;
  total: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  pickupLocation?: string | null;
  returnBaseUrl?: unknown;
};

/** Create a shareable Stripe Checkout URL for a reservation (pay later). */
export async function createReservationPaymentLink(
  input: ReservationCheckoutInput
): Promise<{ url: string; sessionId: string; amount: number }> {
  const amount = Number(input.total) || 0;
  if (amount < 0.5) {
    throw new Error("Total must be at least $0.50 to create a Stripe link");
  }

  const amountCents = Math.round(amount * 100);
  const returnBase = safeReturnBase(input.returnBaseUrl);
  const customerName = `${input.firstName || ""} ${input.lastName || ""}`.trim();
  const pickupSnippet = (input.pickupLocation || "").slice(0, 80);
  const bookingId = input.bookingId;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: input.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: amountCents,
          product_data: {
            name: `SARJ Worldwide · ${bookingId}`,
            description: `${customerName || "Customer"} · ${pickupSnippet || "Chauffeur reservation"}`,
          },
        },
      },
    ],
    success_url: `${returnBase}/pay/success?bookingId=${encodeURIComponent(bookingId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnBase}/pay/cancel?bookingId=${encodeURIComponent(bookingId)}`,
    metadata: {
      type: "reservation",
      bookingId,
      expectedAmountCents: String(amountCents),
    },
    payment_intent_data: {
      metadata: {
        type: "reservation",
        bookingId,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { url: session.url, sessionId: session.id, amount };
}
