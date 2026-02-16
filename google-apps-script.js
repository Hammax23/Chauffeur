/**
 * SARJ Worldwide — Google Apps Script for Reservation Management
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://sheets.google.com and create a new Google Sheet
 * 2. Name it "SARJ Reservations"
 * 3. Go to Extensions > Apps Script
 * 4. Delete the default code and paste this entire file
 * 5. Click "Deploy" > "New deployment"
 * 6. Select type: "Web app"
 * 7. Set "Execute as": Me
 * 8. Set "Who has access": Anyone
 * 9. Click "Deploy" and copy the Web App URL
 * 10. Add the URL to your .env.local as GOOGLE_SCRIPT_URL=<your-url>
 * 11. Share the Google Sheet with anyone who needs to view reservations
 */

// Sheet name
const SHEET_NAME = "Reservations";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "new_reservation";

    if (action === "new_reservation") {
      return handleNewReservation(data);
    } else if (action === "update_status") {
      return handleStatusUpdate(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const bookingId = e.parameter.bookingId;

    if (action === "get_status" && bookingId) {
      return handleGetStatus(bookingId);
    }

    if (action === "get_all") {
      return handleGetAll();
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Missing parameters" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleNewReservation(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Create sheet with headers if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Booking ID", "Date Submitted", "Status",
      "First Name", "Last Name", "Email", "Phone",
      "Service Type", "Vehicle", "Passengers",
      "Child Seats", "Child Seat Type", "407 ETR",
      "Service Date", "Service Time",
      "Pick-up", "Stops", "Drop-off",
      "Distance", "Duration",
      "Airline", "Flight #", "Flight Note",
      "Ride Fare", "Stop Charge", "Child Seat Charge",
      "Subtotal", "HST (13%)", "Gratuity", "Total",
      "Special Requirements", "Driver Link", "Customer Track Link"
    ]);
    // Bold headers
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold");
    // Freeze header row
    sheet.setFrozenRows(1);
  }

  const bookingId = data.bookingId || "SARJ-" + Math.floor(10000 + Math.random() * 90000);
  const baseUrl = data.baseUrl || "https://sarjworldwide.ca";

  sheet.appendRow([
    bookingId,
    new Date().toLocaleString("en-US"),
    "PENDING",
    data.firstName || "",
    data.lastName || "",
    data.email || "",
    data.phone || "",
    data.serviceType || "",
    data.vehicle || "",
    data.passengers || 1,
    data.childSeatCount || 0,
    data.childSeatType || "",
    data.etr407 ? "Yes" : "No",
    data.serviceDate || "",
    data.serviceTime || "",
    data.pickupLocation || "",
    (data.stops || []).join(" → "),
    data.dropoffLocation || "",
    data.routeDistance || "",
    data.routeDuration || "",
    data.airlineName || "",
    data.flightNumber || "",
    data.flightNote || "",
    data.routePrice || 0,
    data.stopCharge || 0,
    data.childSeatCharge || 0,
    data.subtotal || 0,
    data.hst || 0,
    data.gratuity || 0,
    data.total || 0,
    data.specialRequirements || "",
    baseUrl + "/driver/" + bookingId,
    baseUrl + "/track/" + bookingId
  ]);

  // Create Google Calendar event
  try {
    if (data.serviceDate && data.serviceTime) {
      const startTime = new Date(data.serviceDate + "T" + data.serviceTime);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

      const calendar = CalendarApp.getDefaultCalendar();
      const event = calendar.createEvent(
        "🚗 " + bookingId + " — " + (data.firstName || "") + " " + (data.lastName || ""),
        startTime,
        endTime,
        {
          description:
            "Booking: " + bookingId + "\n" +
            "Passenger: " + (data.firstName || "") + " " + (data.lastName || "") + "\n" +
            "Phone: " + (data.phone || "") + "\n" +
            "Vehicle: " + (data.vehicle || "") + "\n" +
            "Pick-up: " + (data.pickupLocation || "") + "\n" +
            "Drop-off: " + (data.dropoffLocation || "") + "\n" +
            "Total: $" + (data.total || 0) + " CAD\n\n" +
            "Driver Link: " + baseUrl + "/driver/" + bookingId + "\n" +
            "Track Link: " + baseUrl + "/track/" + bookingId,
          location: data.pickupLocation || ""
        }
      );
    }
  } catch (calErr) {
    // Calendar creation is optional — don't fail the whole request
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    bookingId: bookingId
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleStatusUpdate(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const bookingId = data.bookingId;
  const newStatus = data.status;
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === bookingId) {
      sheet.getRange(i + 1, 3).setValue(newStatus); // Column C = Status
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        bookingId: bookingId,
        status: newStatus
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Booking not found" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetStatus(bookingId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === bookingId) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        bookingId: bookingId,
        status: values[i][2],       // Status
        firstName: values[i][3],    // First Name
        lastName: values[i][4],     // Last Name
        vehicle: values[i][8],      // Vehicle
        serviceDate: values[i][13], // Service Date
        serviceTime: values[i][14], // Service Time
        pickupLocation: values[i][15], // Pick-up
        dropoffLocation: values[i][17] // Drop-off
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Booking not found" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, reservations: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const reservations = [];

  for (let i = 1; i < values.length; i++) {
    reservations.push({
      bookingId: values[i][0],
      dateSubmitted: values[i][1],
      status: values[i][2],
      firstName: values[i][3],
      lastName: values[i][4],
      email: values[i][5],
      phone: values[i][6],
      serviceType: values[i][7],
      vehicle: values[i][8],
      passengers: values[i][9],
      childSeats: values[i][10],
      childSeatType: values[i][11],
      etr407: values[i][12],
      serviceDate: values[i][13],
      serviceTime: values[i][14],
      pickupLocation: values[i][15],
      stops: values[i][16],
      dropoffLocation: values[i][17],
      distance: values[i][18],
      duration: values[i][19],
      airline: values[i][20],
      flightNumber: values[i][21],
      flightNote: values[i][22],
      rideFare: values[i][23],
      stopCharge: values[i][24],
      childSeatCharge: values[i][25],
      subtotal: values[i][26],
      hst: values[i][27],
      gratuity: values[i][28],
      total: values[i][29],
      specialRequirements: values[i][30],
      driverLink: values[i][31],
      trackLink: values[i][32]
    });
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    reservations: reservations.reverse()
  })).setMimeType(ContentService.MimeType.JSON);
}
