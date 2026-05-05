"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Phone,
  Mail,
  Car,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  X,
  Shield,
  Clock,
  FileText,
} from "lucide-react";
import Turnstile from "@/components/Turnstile";
import {
  DEFAULT_VISIBLE_FIELDS,
  DRIVER_COMPLIANCE_UPLOAD_KEYS,
  DRIVER_DOCUMENT_FIELD_KEYS,
  DRIVER_INVITE_FIELD_LABELS,
  DRIVER_VEHICLE_DOC_FIELD_KEYS,
  emptyComplianceUrlState,
  getVisibleComplianceDocKeys,
  type VisibleFieldsMap,
  type DriverInviteFieldKey,
} from "@/lib/driver-invite-config";

interface InviteData {
  email: string | null;
  name: string | null;
  expiresAt: string;
  visibleFields: VisibleFieldsMap;
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
  const [complianceUrls, setComplianceUrls] = useState<
    Partial<Record<DriverInviteFieldKey, string>>
  >(() => emptyComplianceUrlState());
  const [uploadingComplianceKey, setUploadingComplianceKey] = useState<DriverInviteFieldKey | null>(null);

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
          const visibleFields: VisibleFieldsMap = {
            ...DEFAULT_VISIBLE_FIELDS,
            ...(data.invite.visibleFields || {}),
          };
          setInviteData({ ...data.invite, visibleFields });
          // Pre-fill email and name only when those fields are open on this invite
          if (visibleFields.email && data.invite.email) setEmail(data.invite.email);
          if (visibleFields.name && data.invite.name) setName(data.invite.name);
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

  const handleComplianceUpload = async (
    key: DriverInviteFieldKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const okType =
      file.type.startsWith("image/") || file.type === "application/pdf";
    if (!okType) {
      setSubmitError("Please upload a PDF or image file");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setSubmitError("File must be 12MB or smaller");
      return;
    }

    setUploadingComplianceKey(key);
    setSubmitError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "driver-document");
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setComplianceUrls((prev) => ({ ...prev, [key]: data.url }));
      } else {
        setSubmitError(data.error || "Upload failed");
      }
    } catch {
      setSubmitError("Upload failed");
    } finally {
      setUploadingComplianceKey(null);
      e.target.value = "";
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!inviteData) return;
    const vf = inviteData.visibleFields;

    if (vf.name && !name.trim()) {
      setSubmitError("Please enter your full name");
      return;
    }
    if (vf.email && !email.trim()) {
      setSubmitError("Please enter your email address");
      return;
    }
    if (vf.phone && !phone.trim()) {
      setSubmitError("Please enter your phone number");
      return;
    }
    if (vf.vehicle && !vehicle.trim()) {
      setSubmitError("Please enter your vehicle");
      return;
    }
    if (vf.vehiclePlate && !vehiclePlate.trim()) {
      setSubmitError("Please enter your vehicle plate");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (vf.email && !emailRegex.test(email)) {
      setSubmitError("Please enter a valid email address");
      return;
    }

    const phoneRegex = /^[\d\s\-+()]{10,}$/;
    if (vf.phone && !phoneRegex.test(phone)) {
      setSubmitError("Please enter a valid phone number");
      return;
    }

    if (!turnstileToken) {
      setSubmitError("Please complete the security verification");
      return;
    }

    for (const key of getVisibleComplianceDocKeys(vf)) {
      if (!complianceUrls[key]?.trim()) {
        setSubmitError(`Please upload: ${DRIVER_INVITE_FIELD_LABELS[key]}`);
        return;
      }
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = { token, turnstileToken };
    if (vf.name) payload.name = name.trim();
    if (vf.email) payload.email = email.trim();
    if (vf.phone) payload.phone = phone.trim();
    if (vf.vehicle) payload.vehicle = vehicle.trim();
    if (vf.vehiclePlate) payload.vehiclePlate = vehiclePlate.trim().toUpperCase();
    if (vf.photo) payload.photo = photo || null;

    for (const key of DRIVER_COMPLIANCE_UPLOAD_KEYS) {
      if (vf[key]) {
        payload[key] = complianceUrls[key]?.trim() || null;
      }
    }

    try {
      const response = await fetch("/api/driver-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
            Check your email for a confirmation message and your driver app login password. Our team will contact you
            shortly.
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
  if (!inviteData) {
    return null;
  }

  const vf = inviteData.visibleFields;
  const hasAnyComplianceOpen = DRIVER_COMPLIANCE_UPLOAD_KEYS.some((k) => vf[k]);
  const hasAnyFieldForDriver =
    vf.name ||
    vf.email ||
    vf.phone ||
    vf.vehicle ||
    vf.vehiclePlate ||
    vf.photo ||
    hasAnyComplianceOpen;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-8 px-3 sm:px-4 pb-10">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 px-1">
          <Link href="/" className="inline-block mb-4 sm:mb-6">
            <Image
              src="/sarjlogo.png"
              alt="SARJ Worldwide"
              width={180}
              height={60}
              className="mx-auto w-[140px] sm:w-[180px] h-auto"
            />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 px-1">
            Driver Registration
          </h1>
          <p className="text-gray-600 text-sm sm:text-base px-2">
            Complete your registration to join SARJ Worldwide
          </p>

          {!hasAnyFieldForDriver && (
            <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto px-2 leading-relaxed">
              Your administrator has already entered your details. Complete the security verification below to finish.
            </p>
          )}

          {/* Expiry notice */}
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 max-w-[95vw] bg-amber-50 text-amber-800 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm">
            <Clock className="w-4 h-4 shrink-0" />
            <span className="text-left leading-snug">
              Link expires:{" "}
              {new Date(inviteData.expiresAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-8">
          {/* Security badge */}
          <div className="flex flex-wrap items-center gap-2 text-green-700 bg-green-50 px-3 sm:px-4 py-2.5 rounded-lg mb-5 sm:mb-6">
            <Shield className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-medium leading-snug">
              Secure Registration Form
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            {vf.photo && (
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Profile Photo</label>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
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
                  <div className="text-sm text-gray-500 text-center sm:text-left">
                    <p>Upload a professional photo</p>
                    <p className="text-xs">Max 5MB, JPG or PNG</p>
                  </div>
                </div>
              </div>
            )}

            {/* Name */}
            {vf.name && (
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
                    className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                    required
                  />
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Email */}
            {vf.email && (
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
                    className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Phone */}
            {vf.phone && (
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
                    className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                    required
                  />
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Vehicle */}
            {vf.vehicle && (
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
                    className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                    required
                  />
                  <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Vehicle Plate */}
            {vf.vehiclePlate && (
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
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {(DRIVER_DOCUMENT_FIELD_KEYS.some((k) => vf[k]) ||
              DRIVER_VEHICLE_DOC_FIELD_KEYS.some((k) => vf[k])) && (
              <div className="border-t border-gray-100 pt-6 sm:pt-8 space-y-8 sm:space-y-10">
                {DRIVER_DOCUMENT_FIELD_KEYS.some((k) => vf[k]) && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9A063]/10">
                          <FileText className="w-5 h-5 text-[#C9A063]" />
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
                            Documents
                          </h2>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Compliance uploads — PDF or clear images (max 12MB each).
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {DRIVER_DOCUMENT_FIELD_KEYS.filter((k) => vf[k]).map((key) => {
                        const uploaded = !!complianceUrls[key]?.trim();
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm"
                          >
                            <label className="block text-gray-900 text-sm font-semibold mb-3">
                              {DRIVER_INVITE_FIELD_LABELS[key]}{" "}
                              <span className="text-red-500 font-bold">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                              <label className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-[#C9A063] hover:shadow-sm text-sm font-medium text-gray-800 transition-all">
                                {uploadingComplianceKey === key ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-[#C9A063]" />
                                ) : (
                                  <Upload className="w-4 h-4 text-[#C9A063] shrink-0" />
                                )}
                                {uploaded ? "Replace file" : "Upload PDF or image"}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadingComplianceKey !== null}
                                  onChange={(e) => handleComplianceUpload(key, e)}
                                />
                              </label>
                              {uploaded && (
                                <span className="text-xs font-semibold text-emerald-700 flex items-center justify-center sm:justify-start gap-1.5 py-1">
                                  <CheckCircle className="w-4 h-4 shrink-0" /> File attached
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {DRIVER_VEHICLE_DOC_FIELD_KEYS.some((k) => vf[k]) && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9A063]/10">
                          <Car className="w-5 h-5 text-[#C9A063]" />
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
                            Vehicle
                          </h2>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Vehicle insurance and registration documents.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {DRIVER_VEHICLE_DOC_FIELD_KEYS.filter((k) => vf[k]).map((key) => {
                        const uploaded = !!complianceUrls[key]?.trim();
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm"
                          >
                            <label className="block text-gray-900 text-sm font-semibold mb-3">
                              {DRIVER_INVITE_FIELD_LABELS[key]}{" "}
                              <span className="text-red-500 font-bold">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                              <label className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-[#C9A063] hover:shadow-sm text-sm font-medium text-gray-800 transition-all">
                                {uploadingComplianceKey === key ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-[#C9A063]" />
                                ) : (
                                  <Upload className="w-4 h-4 text-[#C9A063] shrink-0" />
                                )}
                                {uploaded ? "Replace file" : "Upload PDF or image"}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadingComplianceKey !== null}
                                  onChange={(e) => handleComplianceUpload(key, e)}
                                />
                              </label>
                              {uploaded && (
                                <span className="text-xs font-semibold text-emerald-700 flex items-center justify-center sm:justify-start gap-1.5 py-1">
                                  <CheckCircle className="w-4 h-4 shrink-0" /> File attached
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Turnstile */}
            <div className="flex justify-center overflow-x-auto w-full -mx-1 px-1 py-1">
              <Turnstile onVerify={setTurnstileToken} />
            </div>

            {/* Error message */}
            {submitError && (
              <div className="flex items-start gap-2 text-red-600 bg-red-50 px-3 sm:px-4 py-3 rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed">{submitError}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[52px] bg-gradient-to-r from-[#C9A063] to-[#B8905A] text-white py-3.5 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:from-[#B8905A] hover:to-[#A68049] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#C9A063]/20"
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
