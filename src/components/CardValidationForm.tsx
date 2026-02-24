"use client";

import { useState } from "react";
import {
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { CheckCircle, AlertCircle, Loader2, CreditCard } from "lucide-react";

interface CardInfo {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cvcCheck: string;
}

interface CardValidationProps {
  email: string;
  name: string;
  onSuccess: (data: { paymentMethodId: string; last4: string; brand: string; customerId: string }) => void;
  onError: (error: string) => void;
}

export default function CardValidationForm({ 
  email, 
  name, 
  onSuccess, 
  onError 
}: CardValidationProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleValidateCard = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    setVerified(null);
    setErrorMessage("");

    try {
      // Step 1: Create SetupIntent
      const setupRes = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const setupData = await setupRes.json();

      if (setupData.error) {
        throw new Error(setupData.error);
      }

      const { clientSecret } = setupData;

      // Step 2: Confirm SetupIntent (validates card + triggers 3DS if needed)
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name, email },
        },
      });

      if (error) {
        setVerified(false);
        setErrorMessage(error.message || "Card validation failed");
        onError(error.message || "Card validation failed");
        return;
      }

      if (setupIntent?.status === "succeeded") {
        // Step 3: Get verification details from backend
        const verifyRes = await fetch("/api/stripe/verify-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setupIntentId: setupIntent.id }),
        });
        const verifyData = await verifyRes.json();

        if (verifyData.verified) {
          setVerified(true);
          setCardInfo(verifyData.card);
          onSuccess({
            paymentMethodId: verifyData.paymentMethodId,
            last4: verifyData.card.last4,
            brand: verifyData.card.brand,
            customerId: verifyData.customerId,
          });
        } else {
          setVerified(false);
          setErrorMessage(verifyData.error || "Card verification failed");
          onError(verifyData.error || "Card verification failed");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setVerified(false);
      setErrorMessage(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        <CreditCard className="inline w-4 h-4 mr-2" />
        Card Details (Secure Validation)
      </label>
      
      <div className={`p-4 border-2 rounded-xl transition-all duration-300 ${
        verified === true ? "border-green-500 bg-green-50" :
        verified === false ? "border-red-500 bg-red-50" :
        "border-gray-200 focus-within:border-[#C9A063] focus-within:ring-4 focus-within:ring-[#C9A063]/10"
      }`}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#1f2937",
                fontFamily: "system-ui, -apple-system, sans-serif",
                "::placeholder": { color: "#9ca3af" },
              },
              invalid: {
                color: "#dc2626",
              },
            },
            hidePostalCode: true,
          }}
          onChange={(e) => {
            setCardComplete(e.complete);
            if (e.error) {
              setErrorMessage(e.error.message);
            } else {
              setErrorMessage("");
            }
          }}
        />
      </div>

      {/* Verification Result */}
      {verified === true && cardInfo && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">
            Card verified: {cardInfo.brand?.toUpperCase()} ****{cardInfo.last4}
            {cardInfo.cvcCheck === "pass" && " • CVC ✓"}
          </span>
        </div>
      )}

      {verified === false && errorMessage && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleValidateCard}
        disabled={!stripe || !cardComplete || loading || verified === true}
        className={`w-full py-4 px-6 font-semibold rounded-xl transition-all duration-300 ${
          verified === true
            ? "bg-green-500 text-white cursor-default"
            : "bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white hover:shadow-lg hover:shadow-[#C9A063]/25 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {loading ? (
          <><Loader2 className="inline w-5 h-5 mr-2 animate-spin" /> Validating Card...</>
        ) : verified === true ? (
          <><CheckCircle className="inline w-5 h-5 mr-2" /> Card Verified ✓</>
        ) : (
          <><CreditCard className="inline w-5 h-5 mr-2" /> Validate Card</>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        🔒 Your card will be securely validated without any charges
      </p>
    </div>
  );
}
