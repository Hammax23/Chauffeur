"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Phone, Mail, Car, CreditCard, CheckCircle, AlertCircle, Loader2, Upload, X, Shield, Clock } from "lucide-react";
import Turnstile from "@/components/Turnstile";

interface InviteData {
  email: string | null;
  name: string | null;
  expiresAt: string;
}

export default function DriverRegisterPage() {
  const params = useParams();
  const token = params.token as string;

  // Validation states
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [driverInfo, setDriverInfo] = useState<{ driverId: string; name: string } | null>(null);

  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState("");

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch("/api/driver-register/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success) {
          setIsValid(true);
          setInviteData(data.invite);
          // Pre-fill email and name if provided
          if (data.invite.email) setEmail(data.invite.email);
          if (data.invite.name) setName(data.invite.name);
        } else {
          setValidationError(data.error || "Invalid invitation link");
        }
      } catch (error) {
        setValidationError("Failed to validate invitation. Please try again.");
      } finally {
        setIsValidating(false);
      }
    }

    if (token) {
      validateToken();
    }
  }, [token]);

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setSubmitError("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Image must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setPhoto(data.url);
        setSubmitError("");
      } else {
        setSubmitError("Failed to upload photo");
      }
    } catch (error) {
      setSubmitError("Failed to upload photo");
    }
  };

  const removePhoto = () => {
    setPhoto("");
    setPhotoPreview("");
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // Validate form
    if (!name.trim() || !phone.trim() || !email.trim() || !vehicle.trim() || !vehiclePlate.trim()) {
      setSubmitError("Please fill in all required fields");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSubmitError("Please enter a valid email address");
      return;
    }

    // Validate phone format
    const phoneRegex = /^[\d\s\-+()]{10,}$/;
    if (!phoneRegex.test(phone)) {
      setSubmitError("Please enter a valid phone number");
      return;
    }

    if (!turnstileToken) {
      setSubmitError("Please complete the security verification");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/driver-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          vehicle: vehicle.trim(),
          vehiclePlate: vehiclePlate.trim().toUpperCase(),
          photo: photo || null,
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitSuccess(true);
        setDriverInfo(data.driver);
      } else {
        setSubmitError(data.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      setSubmitError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#C9A063] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </main>
    );
  }

  // Invalid token state
  if (!isValid) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{validationError}</p>
          <Link
            href="/"
            className="inline-block bg-[#C9A063] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#B8905A] transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </main>
    );
  }

  // Success state
  if (submitSuccess && driverInfo) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Registration Successful!</h1>
          <p className="text-gray-600 mb-6">
            Welcome to SARJ Worldwide, {driverInfo.name}! Your driver ID is{" "}
            <span className="font-bold text-[#C9A063]">{driverInfo.driverId}</span>.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            A confirmation email has been sent to your email address. Our team will contact you shortly.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#C9A063] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#B8905A] transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </main>
    );
  }

  // Registration form
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/sarjlogo.png"
              alt="SARJ Worldwide"
              width={180}
              height={60}
              className="mx-auto"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Registration</h1>
          <p className="text-gray-600">Complete your registration to join SARJ Worldwide</p>
          
          {/* Expiry notice */}
          {inviteData && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm">
              <Clock className="w-4 h-4" />
              <span>
                Link expires:{" "}
                {new Date(inviteData.expiresAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Security badge */}
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg mb-6">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium">Secure Registration Form</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Profile Photo</label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#C9A063]/20">
                      <Image
                        src={photoPreview}
                        alt="Profile preview"
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#C9A063] transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
                <div className="text-sm text-gray-500">
                  <p>Upload a professional photo</p>
                  <p className="text-xs">Max 5MB, JPG or PNG</p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                  required
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                  required
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                  required
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Vehicle */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="e.g., Cadillac XTS, Mercedes S-Class"
                  className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                  required
                />
                <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Vehicle Plate */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Vehicle Plate Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="e.g., ABC 123"
                  className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all uppercase"
                  required
                />
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Turnstile */}
            <div className="flex justify-center">
              <Turnstile onVerify={setTurnstileToken} />
            </div>

            {/* Error message */}
            {submitError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{submitError}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#C9A063] to-[#B8905A] text-white py-4 rounded-xl font-semibold text-lg hover:from-[#B8905A] hover:to-[#A68049] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#C9A063]/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registering...
                </>
              ) : (
                "Complete Registration"
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-gray-500 text-xs mt-6">
            By registering, you agree to our terms and conditions. Your information is securely stored and will only be used for driver management purposes.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} SARJ Worldwide. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
