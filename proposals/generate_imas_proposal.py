"""IMAS WORLDWIDE proposal — balanced enterprise layout (readable, not congested)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import white, HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
from pathlib import Path

OUT = Path(r"C:\Users\HP\Desktop\Chauffeur\proposals\IMAS-WORLDWIDE-App-Proposal.pdf")

NAVY = HexColor("#0B1220")
INK = HexColor("#121826")
SLATE = HexColor("#3D4759")
MUTED = HexColor("#6B7280")
LINE = HexColor("#E5E7EB")
GOLD = HexColor("#C9A063")
SOFT = HexColor("#F7F4EF")
FOOTER_Y = 18 * mm

W, H = A4
M = 16 * mm
CONTENT_W = W - 2 * M


def draw_header(c, page_title, page_no, total=8):
    c.setFillColor(NAVY)
    c.rect(0, H - 13 * mm, W, 13 * mm, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 13.8 * mm, W, 1.1, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M, H - 8 * mm, "VYNTECH SOLUTIONS")
    c.setFont("Helvetica", 9)
    c.drawRightString(W - M, H - 8 * mm, "PROPOSAL FOR IMAS WORLDWIDE")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(M, H - 19.5 * mm, page_title)
    c.drawRightString(W - M, H - 19.5 * mm, f"{page_no:02d} / {total:02d}")
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(M, H - 21.5 * mm, W - M, H - 21.5 * mm)


def draw_footer(c, page_no, total=8):
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(M, 12 * mm, W - M, 12 * mm)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(M, 7 * mm, "Vyntech Solutions  ·  Confidential")
    c.drawRightString(W - M, 7 * mm, f"Page {page_no} of {total}")


def section_title(c, y, text):
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(M, y, text)
    c.setFillColor(GOLD)
    c.rect(M, y - 2.2 * mm, 16 * mm, 1.2, fill=1, stroke=0)
    return y - 8 * mm


def body(c, text, x, y, width, size=10, color=SLATE, leading=14):
    c.setFillColor(color)
    c.setFont("Helvetica", size)
    for line in simpleSplit(text, "Helvetica", size, width):
        if y < FOOTER_Y:
            break
        c.drawString(x, y, line)
        y -= leading
    return y


def bullets(c, items, x, y, width, size=9.5, leading=13):
    for item in items:
        lines = simpleSplit(item, "Helvetica", size, width - 5 * mm)
        c.setFillColor(GOLD)
        c.setFont("Helvetica", size)
        c.drawString(x, y, "•")
        c.setFillColor(SLATE)
        for line in lines:
            c.drawString(x + 4.5 * mm, y, line)
            y -= leading
        y -= 2
    return y


def table_header(c, y, cols):
    c.setFillColor(NAVY)
    c.rect(M, y - 7 * mm, CONTENT_W, 8 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    x = M + 3 * mm
    for label, w in cols:
        c.drawString(x, y - 4.6 * mm, label)
        x += w
    return y - 10 * mm


def table_row(c, y, cols, values, alt=False):
    wrapped = []
    row_h = 0
    for (_, w), val in zip(cols, values):
        lines = simpleSplit(val, "Helvetica", 9.5, w - 4 * mm)
        wrapped.append(lines)
        row_h = max(row_h, len(lines) * 12.5 + 8)
    # Never draw into the footer band
    if y - row_h < FOOTER_Y + 2 * mm:
        return y
    if alt:
        c.setFillColor(SOFT)
        c.rect(M, y - row_h + 2, CONTENT_W, row_h, fill=1, stroke=0)
    c.setFont("Helvetica", 9.5)
    c.setFillColor(SLATE)
    x = M + 3 * mm
    for (_, w), lines in zip(cols, wrapped):
        ty = y - 9
        for line in lines:
            c.drawString(x, ty, line)
            ty -= 12.5
        x += w
    c.setStrokeColor(LINE)
    c.setLineWidth(0.4)
    c.line(M, y - row_h + 2, W - M, y - row_h + 2)
    return y - row_h - 1


def soft_box(c, x, y, w, h, title, items):
    c.setFillColor(SOFT)
    c.roundRect(x, y - h, w, h, 3, fill=1, stroke=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    c.line(x, y, x, y - h)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 4 * mm, y - 6.5 * mm, title)
    bullets(c, items, x + 4 * mm, y - 14 * mm, w - 8 * mm, size=9.5, leading=13)


def page_cover(c):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(0, H - 4 * mm, W, 4 * mm, fill=1, stroke=0)
    c.rect(0, 0, W, 4 * mm, fill=1, stroke=0)

    c.setFillColor(GOLD)
    c.setFont("Helvetica", 10)
    c.drawString(M, H - 28 * mm, "ENTERPRISE MOBILE PLATFORM PROPOSAL")

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(M, H - 48 * mm, "IMAS WORLDWIDE")
    body(
        c,
        "Chauffeur Application Suite for iOS, Android, and Admin Web — booking, dispatch, live trip management, payments, and scalable fleet operations.",
        M, H - 60 * mm, CONTENT_W, size=11, color=HexColor("#D1D5DB"), leading=15,
    )

    pillars = [
        ("01", "CUSTOMER APP", "Book transfers, track rides, and manage trips with a premium guest experience."),
        ("02", "DRIVER APP", "Accept assignments, update status, and complete jobs with clear trip details."),
        ("03", "ADMIN WEB", "Dispatch drivers, manage fleet and rates, and run daily operations."),
    ]
    box_w = (CONTENT_W - 10 * mm) / 3
    bx, by = M, H - 100 * mm
    for num, title, desc in pillars:
        c.setFillColor(HexColor("#151D2E"))
        c.roundRect(bx, by - 42 * mm, box_w, 42 * mm, 4, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.line(bx, by, bx + box_w, by)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(bx + 4 * mm, by - 9 * mm, num)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(bx + 4 * mm, by - 18 * mm, title)
        c.setFillColor(HexColor("#9CA3AF"))
        c.setFont("Helvetica", 8.5)
        ty = by - 27 * mm
        for line in simpleSplit(desc, "Helvetica", 8.5, box_w - 8 * mm):
            c.drawString(bx + 4 * mm, ty, line)
            ty -= 11
        bx += box_w + 5 * mm

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(M, H - 160 * mm, "DOCUMENT CONTENTS")
    c.setFillColor(GOLD)
    c.rect(M, H - 162.5 * mm, 16 * mm, 1.2, fill=1, stroke=0)
    toc = [
        "02  Executive overview and success criteria",
        "03  Platform model and ride journey",
        "04  Service patterns and Customer app",
        "05  Driver app and Admin console",
        "06  Foundations and deliverables",
        "07  Responsibilities, phases, and stack",
        "08  Partnership rationale and next steps",
    ]
    ty = H - 174 * mm
    for item in toc:
        c.setFillColor(HexColor("#CBD5E1"))
        c.setFont("Helvetica", 10)
        c.drawString(M, ty, item)
        ty -= 14

    meta = [
        ("PREPARED BY", "Vyntech Solutions"),
        ("PREPARED FOR", "IMAS WORLDWIDE"),
        ("PLATFORM", "iOS · Android · Admin Web"),
        ("TYPE", "Scope & Delivery Brief"),
    ]
    mx, my, mw = M, 32 * mm, (CONTENT_W - 12 * mm) / 4
    for label, val in meta:
        c.setFillColor(HexColor("#151D2E"))
        c.roundRect(mx, my, mw, 22 * mm, 3, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica", 7)
        c.drawString(mx + 3 * mm, my + 14 * mm, label)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(mx + 3 * mm, my + 6 * mm, val[:22])
        mx += mw + 4 * mm

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(M, 18 * mm, "CONFIDENTIAL  ·  AUGUST 2026")


def page_02(c):
    draw_header(c, "Executive overview", 2)
    y = H - 30 * mm
    y = section_title(c, y, "Engagement overview")
    y = body(
        c,
        "IMAS WORLDWIDE needs a production-ready chauffeur platform that clients can book on mobile, drivers can run in the field, and operations can control from a secure admin console.",
        M, y, CONTENT_W,
    )
    y -= 4 * mm
    y = body(
        c,
        "Vyntech Solutions will design, brand, configure, and launch a full suite: Customer and Driver apps for iOS and Android, an Admin web console, backend APIs, payments readiness, notifications, maps, and go-live support.",
        M, y, CONTENT_W,
    )
    y -= 8 * mm

    cols = [("OUTCOME", 42 * mm), ("WHAT IMAS WORLDWIDE GAINS", CONTENT_W - 42 * mm)]
    y = table_header(c, y, cols)
    for i, row in enumerate([
        ("Own branded platform", "Clients experience IMAS WORLDWIDE — not a generic white-label marketplace."),
        ("Faster booking cycle", "Customers book from their phone; ops and drivers work from one live system."),
        ("Operational control", "Assign drivers, monitor trips, manage fleet and rates without daily developer dependency."),
        ("Payment readiness", "Card payments can be enabled in-app (Stripe) when ready — or remain ops-led."),
        ("Store distribution", "Apps prepared for App Store and Google Play under the IMAS brand."),
    ]):
        y = table_row(c, y, cols, row, alt=i % 2 == 1)

    y -= 10 * mm
    y = section_title(c, y, "Success criteria")
    half = CONTENT_W / 2 - 5 * mm
    soft_box(c, M, y, half, 62 * mm, "For leadership", [
        "Platform looks premium and brand-aligned",
        "Scope is clear: Customer, Driver, Admin",
        "Launch path to stores is defined",
        "System can grow with vehicles and cities",
    ])
    soft_box(c, M + half + 10 * mm, y, half, 62 * mm, "For operations", [
        "Reservations are visible and assignable",
        "Drivers get clear trip instructions",
        "Live status stays in sync across apps",
        "Team can run daily ops after handover",
    ])
    y -= 72 * mm

    y = section_title(c, y, "Scope at a glance")
    w3 = (CONTENT_W - 12 * mm) / 3
    soft_box(c, M, y, w3, 68 * mm, "In scope", [
        "Customer + Driver apps",
        "Admin web console",
        "Backend API + database",
        "Maps, push, auth",
        "Staging + launch path",
    ])
    soft_box(c, M + w3 + 6 * mm, y, w3, 68 * mm, "Launch modes", [
        "Payments on at go-live, or",
        "Ops-led / pay-later first",
        "Manual + assisted assign",
        "TestFlight / Play tracks",
        "Store submission support",
    ])
    soft_box(c, M + 2 * (w3 + 6 * mm), y, w3, 68 * mm, "Later (optional)", [
        "Multi-language pack",
        "Deep ERP integrations",
        "Auto-dispatch rules",
        "Marketing website",
        "Extra city rollouts",
    ])
    draw_footer(c, 2)


def page_03(c):
    draw_header(c, "Platform model and ride journey", 3)
    y = H - 30 * mm
    y = section_title(c, y, "How the platform works")
    y = body(
        c,
        "One connected system: customer request → operations decision → driver execution → trip close-out. IMAS WORLDWIDE stays in control of dispatch quality.",
        M, y, CONTENT_W,
    )
    y -= 8 * mm

    steps = [
        ("1", "Customer books", "Chooses route, time, and vehicle in the IMAS app."),
        ("2", "Ops confirms", "Admin reviews and assigns the right chauffeur."),
        ("3", "Driver serves", "Pickup, trip updates, and live status sync."),
        ("4", "Trip closes", "Payment settled where enabled; history saved."),
    ]
    sw = (CONTENT_W - 12 * mm) / 4
    sx = M
    for num, title, desc in steps:
        c.setFillColor(SOFT)
        c.roundRect(sx, y - 40 * mm, sw, 40 * mm, 3, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(sx + 3.5 * mm, y - 9 * mm, num)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(sx + 3.5 * mm, y - 17 * mm, title)
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 8.5)
        ty = y - 25 * mm
        for line in simpleSplit(desc, "Helvetica", 8.5, sw - 7 * mm):
            c.drawString(sx + 3.5 * mm, ty, line)
            ty -= 11
        sx += sw + 4 * mm
    y -= 52 * mm

    y = section_title(c, y, "Roles and responsibilities")
    cols = [("ROLE", 32 * mm), ("PRIMARY ACTIONS", CONTENT_W - 32 * mm)]
    y = table_header(c, y, cols)
    for i, row in enumerate([
        ("Customer", "Sign in, create bookings, track status, pay when enabled, view history, manage profile."),
        ("Driver", "Go online, receive jobs, run trip flow, update statuses, view completed work."),
        ("Admin / Ops", "Manage reservations, assign drivers, configure fleet and rates, monitor live rides."),
        ("System", "APIs, database, maps, push notifications, payments, and secure authentication."),
    ]):
        y = table_row(c, y, cols, row, alt=i % 2 == 1)

    y -= 10 * mm
    y = section_title(c, y, "What stays under IMAS control")
    half = CONTENT_W / 2 - 5 * mm
    soft_box(c, M, y, half, 78 * mm, "Business configuration", [
        "Fleet categories and inventory",
        "Pricing and distance rules",
        "Operating regions / service types",
        "Driver roster preferences",
        "Support contacts and hours",
        "Assignment preferences for ops",
    ])
    soft_box(c, M + half + 10 * mm, y, half, 78 * mm, "Brand and experience", [
        "App name, logo, colors, listing",
        "Customer-facing copy and tone",
        "Payment mode (on or ops-led)",
        "Notification policies",
        "VIP / corporate service standards",
        "Guest communication preferences",
    ])
    draw_footer(c, 3)


def page_04(c):
    draw_header(c, "Customer and Driver capabilities", 4)
    y = H - 30 * mm
    y = section_title(c, y, "Supported service patterns")
    cols = [("PATTERN", 40 * mm), ("PLATFORM SUPPORT", CONTENT_W - 40 * mm)]
    y = table_header(c, y, cols)
    for i, row in enumerate([
        ("Airport transfer", "Scheduled pickup, optional flight notes, ops notes for meet-and-greet style service."),
        ("Point-to-point", "Maps search, vehicle class selection, clear fare presentation."),
        ("Hourly / as-directed", "Duration-oriented booking for chauffeur-style engagements."),
        ("Staff-created booking", "Admin can create reservations and share pay-later Stripe links when configured."),
    ]):
        y = table_row(c, y, cols, row, alt=i % 2 == 1)

    y -= 10 * mm
    y = section_title(c, y, "Customer mobile application")
    y = body(
        c,
        "The customer app is the public face of IMAS WORLDWIDE — premium, simple, and reliable for airport transfers, corporate travel, and VIP chauffeur service.",
        M, y, CONTENT_W,
    )
    y -= 8 * mm
    half = CONTENT_W / 2 - 5 * mm
    soft_box(c, M, y, half, 68 * mm, "Account and onboarding", [
        "Email registration and secure sign-in",
        "Google / Apple social sign-in on iOS",
        "Profile: name, phone, city, photo",
        "Session security and logout",
        "Account deletion for store compliance",
    ])
    soft_box(c, M + half + 10 * mm, y, half, 68 * mm, "Booking experience", [
        "Book now or schedule for later",
        "Airport, point-to-point, chauffeur trips",
        "Maps-assisted pickup and drop-off",
        "Vehicle selection with pricing",
        "Special notes for driver / dispatch",
    ])
    y -= 78 * mm
    soft_box(c, M, y, half, 56 * mm, "Payments and confirmation", [
        "In-app Stripe payments when enabled",
        "Pay-later / pending if ops settles offline",
        "Booking confirmation details",
        "Push notifications for status updates",
    ])
    soft_box(c, M + half + 10 * mm, y, half, 56 * mm, "Trip and history", [
        "Live ride status during active trips",
        "Past reservations and receipts",
        "Support contact from profile",
        "Clear trip timeline for the guest",
    ])
    draw_footer(c, 4)


def page_05(c):
    draw_header(c, "Driver app and Admin console", 5)
    y = H - 30 * mm
    y = section_title(c, y, "Driver mobile application")
    y = body(
        c,
        "Built for field use: fast status updates, clear trip details, and minimal friction so chauffeurs can focus on the guest.",
        M, y, CONTENT_W,
    )
    y -= 8 * mm
    half = CONTENT_W / 2 - 5 * mm
    soft_box(c, M, y, half, 68 * mm, "Driver workflow", [
        "Secure driver login",
        "Availability / online control",
        "Offers or assigned jobs",
        "Accept, start, complete trip steps",
        "Push alerts for new work",
    ])
    soft_box(c, M + half + 10 * mm, y, half, 68 * mm, "Trip execution", [
        "Pickup, drop-off, passenger, notes",
        "Status sync with admin and customer",
        "Location-assisted ops where enabled",
        "Completed trip record",
        "Earnings / job visibility",
    ])
    y -= 80 * mm

    y = section_title(c, y, "Admin web console")
    y = body(
        c,
        "A secure browser dashboard for day-to-day dispatch and business configuration — the operational heart of IMAS WORLDWIDE.",
        M, y, CONTENT_W,
    )
    y -= 8 * mm
    soft_box(c, M, y, half, 78 * mm, "Reservations and dispatch", [
        "Reservation inbox with status filters",
        "Manual or assisted driver assignment",
        "App vs web assignment channels",
        "Trip timeline and status visibility",
        "Customer and booking records",
        "Internal operational notes",
    ])
    soft_box(c, M + half + 10 * mm, y, half, 78 * mm, "Fleet, drivers, settings", [
        "Fleet vehicles, categories, rates",
        "Driver roster and profiles",
        "Live map / active ride visibility",
        "Custom reservation + pay-later links",
        "Daily operational settings",
        "Admin authentication / protected routes",
    ])
    draw_footer(c, 5)


def page_06(c):
    draw_header(c, "Platform foundations and deliverables", 6)
    y = H - 30 * mm
    y = section_title(c, y, "Platform foundations")
    foundations = [
        ("Secure API", "Backend for apps"),
        ("Database", "Users & bookings"),
        ("Maps", "Search & routing"),
        ("Push", "Job & status alerts"),
        ("Payments", "Stripe readiness"),
        ("Hosting", "Production cloud"),
    ]
    fw = (CONTENT_W - 15 * mm) / 6
    fx = M
    for title, sub in foundations:
        c.setFillColor(NAVY)
        c.roundRect(fx, y - 24 * mm, fw, 24 * mm, 3, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(fx + fw / 2, y - 9 * mm, title)
        c.setFillColor(white)
        c.setFont("Helvetica", 7.5)
        c.drawCentredString(fx + fw / 2, y - 16 * mm, sub)
        fx += fw + 3 * mm
    y -= 36 * mm

    y = section_title(c, y, "Security, reliability, and store readiness")
    cols = [("AREA", 36 * mm), ("HOW VYNTECH SUPPORTS IMAS", CONTENT_W - 36 * mm)]
    y = table_header(c, y, cols)
    for i, row in enumerate([
        ("Security", "HTTPS, JWT sessions, role separation, server-side validation, environment secrets."),
        ("App Store / Play", "Icons, splash, bundle IDs, build pipeline, listing metadata and review guidance."),
        ("Permissions", "Clear purpose strings for location, camera, and photos where required."),
        ("Privacy", "Privacy policy URL structure and data-handling transparency for submissions."),
        ("Release quality", "Staging + production checklist, TestFlight / Play internal tracks, QA cycles."),
    ]):
        y = table_row(c, y, cols, row, alt=i % 2 == 1)

    y -= 10 * mm
    y = section_title(c, y, "What is included in delivery")
    cols = [("DELIVERABLE", 40 * mm), ("DESCRIPTION", CONTENT_W - 40 * mm)]
    y = table_header(c, y, cols)
    for i, row in enumerate([
        ("Customer mobile app", "Branded iOS and Android app for booking, payments, tracking, history, and accounts."),
        ("Driver mobile app", "Branded iOS and Android app for assignments, trip execution, and driver workflow."),
        ("Admin web panel", "Secure dashboard for reservations, fleet, drivers, live operations, and settings."),
        ("Backend and hosting", "API, database, and production environment configured for IMAS WORLDWIDE."),
        ("Brand and store assets", "Logo integration, icons, splash screens, and store listing guidance."),
        ("Integrations + QA", "Maps, push, payments wiring, TestFlight / Play tracks, and release candidates."),
        ("Handover and training", "Admin walkthrough for dispatch, fleet updates, and standard operating flow."),
    ]):
        y = table_row(c, y, cols, row, alt=i % 2 == 1)
    draw_footer(c, 6)


def page_07(c):
    draw_header(c, "Responsibilities, phases, and technology", 7)
    y = H - 30 * mm
    y = section_title(c, y, "Responsibility split")
    half = CONTENT_W / 2 - 5 * mm
    soft_box(c, M, y, half, 78 * mm, "Provided by IMAS WORLDWIDE", [
        "Logo, colors, app name, brand assets",
        "Fleet list, service types, pricing",
        "Operating city / region and support",
        "Apple and Google developer accounts",
        "Payment / push accounts when live",
        "Domain / email for messages",
    ])
    soft_box(c, M + half + 10 * mm, y, half, 78 * mm, "Delivered by Vyntech Solutions", [
        "Branded UI and product configuration",
        "Mobile apps, admin web, backend",
        "Environment setup and production",
        "Store pipeline and submission support",
        "QA cycles and refinements",
        "Training and post-launch support window",
    ])
    y -= 90 * mm

    y = section_title(c, y, "Delivery phases")
    phases = [
        ("PHASE 1", "Discovery", "Brand, fleet, pricing, regions, payment mode, success metrics."),
        ("PHASE 2", "Build", "IMAS branding, backend, apps, admin flows, staging."),
        ("PHASE 3", "Test", "QA, TestFlight / Play testing, dry runs, feedback."),
        ("PHASE 4", "Launch", "Go-live, store support, training, handover."),
    ]
    pw = (CONTENT_W - 12 * mm) / 4
    px = M
    for tag, title, desc in phases:
        c.setFillColor(NAVY)
        c.roundRect(px, y - 42 * mm, pw, 42 * mm, 3, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(px + 3 * mm, y - 8 * mm, tag)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(px + 3 * mm, y - 16 * mm, title)
        c.setFillColor(HexColor("#CBD5E1"))
        c.setFont("Helvetica", 8)
        ty = y - 25 * mm
        for line in simpleSplit(desc, "Helvetica", 8, pw - 6 * mm):
            c.drawString(px + 3 * mm, ty, line)
            ty -= 11
        px += pw + 4 * mm
    y -= 54 * mm

    y = section_title(c, y, "Enterprise technology stack")
    cols = [("LAYER", 32 * mm), ("STACK AND VALUE", CONTENT_W - 32 * mm)]
    y = table_header(c, y, cols)
    for i, row in enumerate([
        ("Mobile apps", "React Native + Expo (TypeScript) — one codebase for iOS and Android."),
        ("Admin and API", "Next.js + React + TypeScript — secure ops console and API layer."),
        ("Database", "PostgreSQL + Prisma — structured, audit-friendly booking records."),
        ("Auth", "JWT sessions + Google / Apple social login."),
        ("Maps", "Google Maps / Places — address search and location-aware booking."),
        ("Payments", "Stripe — enabled at launch or ops-led per IMAS preference."),
        ("Push & cloud", "Device push + hardened hosting, HTTPS, controlled releases."),
        ("Release", "EAS Build + App Store Connect / Play Console pipelines."),
    ]):
        y = table_row(c, y, cols, row, alt=i % 2 == 1)
    draw_footer(c, 7)



def page_08(c):
    """End page — breathing room at bottom is intentional."""
    draw_header(c, "Why Vyntech and next steps", 8)
    y = H - 30 * mm
    y = section_title(c, y, "Why partner with Vyntech Solutions")
    half = CONTENT_W / 2 - 5 * mm
    soft_box(c, M, y, half, 68 * mm, "Enterprise delivery", [
        "Full stack: apps, admin, backend, launch",
        "Brand-first product for IMAS WORLDWIDE",
        "Operations-first dispatch tools",
        "Clear phases and accountability",
    ])
    soft_box(c, M + half + 10 * mm, y, half, 68 * mm, "Practical partnership", [
        "Direct stakeholder communication",
        "Training for daily operations",
        "Store submission support",
        "Room to expand over time",
    ])
    y -= 82 * mm

    y = section_title(c, y, "Optional expansions (separate scope)")
    soft_box(c, M, y, half, 62 * mm, "Growth options", [
        "Multi-language experience",
        "Hotel / concierge workflows",
        "Advanced auto-dispatch",
        "Loyalty / promo / referral",
    ])
    soft_box(c, M + half + 10 * mm, y, half, 62 * mm, "Channel options", [
        "Marketing website tied to apps",
        "Additional city rollouts",
        "Analytics dashboards",
        "Custom IMAS integrations",
    ])
    y -= 76 * mm

    y = section_title(c, y, "Next steps to kick off")
    y = body(
        c,
        "To start the IMAS WORLDWIDE platform with Vyntech Solutions, we confirm:",
        M, y, CONTENT_W,
    )
    y -= 6 * mm
    steps = [
        "Final feature package for phase one",
        "Brand assets and app store names",
        "Fleet categories and pricing rules",
        "Operating city / region and support contacts",
        "Apple and Google developer account access",
        "Payment mode for launch (on or later)",
        "Preferred launch window",
        "Commercial package and kickoff date",
    ]
    for col, chunk in enumerate([steps[:4], steps[4:]]):
        x = M if col == 0 else M + CONTENT_W / 2 + 4 * mm
        ty = y
        for i, item in enumerate(chunk, start=1 + col * 4):
            c.setFillColor(GOLD)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(x, ty, f"{i:02d}")
            c.setFillColor(SLATE)
            c.setFont("Helvetica", 10)
            c.drawString(x + 8 * mm, ty, item)
            ty -= 15

    y -= 72
    c.setFillColor(SOFT)
    c.roundRect(M, y - 36 * mm, CONTENT_W, 36 * mm, 3, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(M + 4 * mm, y - 8 * mm, "Assumptions and commercial note")
    body(
        c,
        "Timelines depend on timely brand assets, fleet and pricing inputs, developer account access, and decision-maker feedback. Payment and push go live when IMAS provides provider accounts. Commercial terms, calendar, and third-party fees are provided in a separate quotation upon request.",
        M + 4 * mm, y - 16 * mm, CONTENT_W - 8 * mm, size=9.5, leading=13,
    )
    # Intentional open space remaining below on the final page
    draw_footer(c, 8)


def main():
    c = canvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle("IMAS WORLDWIDE — Enterprise Mobile Platform Proposal")
    c.setAuthor("Vyntech Solutions")
    c.setSubject("Chauffeur App Platform Proposal for IMAS WORLDWIDE")
    pages = [page_cover, page_02, page_03, page_04, page_05, page_06, page_07, page_08]
    for i, fn in enumerate(pages):
        fn(c)
        if i < len(pages) - 1:
            c.showPage()
    c.save()
    from pypdf import PdfReader
    r = PdfReader(str(OUT))
    print(f"Wrote {OUT}")
    print(f"Pages: {len(r.pages)}")
    for i, p in enumerate(r.pages):
        t = (p.extract_text() or "").strip()
        print(f"  Page {i+1}: {len(t)} chars")


if __name__ == "__main__":
    main()
