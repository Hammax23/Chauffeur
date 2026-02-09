import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, phone, phoneCode, pickup, dropoff, additionalNotes } = await request.json();

    // Validate required fields
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Please fill in all required fields" },
        { status: 400 }
      );
    }

    const fullPhone = `${phoneCode}${phone}`;
    const currentDate = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Email to SARJ (Admin)
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #C9A063 0%, #A68B5B 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Contact Form Submission</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">SARJ Worldwide Chauffeur Service</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1C1C1E; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #C9A063; padding-bottom: 10px;">Contact Details</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #666; font-size: 14px; width: 120px;">Name:</td>
                  <td style="padding: 10px 0; color: #1C1C1E; font-size: 14px; font-weight: 600;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666; font-size: 14px;">Email:</td>
                  <td style="padding: 10px 0; color: #1C1C1E; font-size: 14px; font-weight: 600;">
                    <a href="mailto:${email}" style="color: #C9A063; text-decoration: none;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666; font-size: 14px;">Phone:</td>
                  <td style="padding: 10px 0; color: #1C1C1E; font-size: 14px; font-weight: 600;">
                    <a href="tel:${fullPhone}" style="color: #C9A063; text-decoration: none;">${fullPhone}</a>
                  </td>
                </tr>
                ${pickup ? `
                <tr>
                  <td style="padding: 10px 0; color: #666; font-size: 14px;">Pickup:</td>
                  <td style="padding: 10px 0; color: #1C1C1E; font-size: 14px; font-weight: 600;">${pickup}</td>
                </tr>
                ` : ''}
                ${dropoff ? `
                <tr>
                  <td style="padding: 10px 0; color: #666; font-size: 14px;">Dropoff:</td>
                  <td style="padding: 10px 0; color: #1C1C1E; font-size: 14px; font-weight: 600;">${dropoff}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${additionalNotes ? `
            <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <h3 style="color: #1C1C1E; margin: 0 0 10px 0; font-size: 16px;">Additional Notes:</h3>
              <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0;">${additionalNotes}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px; margin: 0;">Received on ${currentDate}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Confirmation Email to User
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #C9A063 0%, #A68B5B 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Thank You!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 16px;">Your message has been received</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="color: #1C1C1E; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
              Dear <strong>${fullName}</strong>,
            </p>
            
            <p style="color: #444; font-size: 15px; line-height: 1.8; margin: 0 0 20px 0;">
              Your booking form has been <strong style="color: #C9A063;">successfully submitted</strong> to SARJ WORLDWIDE. Our team will review your request and get back to you within 24 hours.
            </p>
            
            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #C9A063;">
              <h3 style="color: #1C1C1E; margin: 0 0 15px 0; font-size: 16px;">Your Submission Summary:</h3>
              <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>Name:</strong> ${fullName}</p>
              <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>Phone:</strong> ${fullPhone}</p>
              ${pickup ? `<p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>Pickup:</strong> ${pickup}</p>` : ''}
              ${dropoff ? `<p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>Dropoff:</strong> ${dropoff}</p>` : ''}
            </div>
            
            <p style="color: #444; font-size: 15px; line-height: 1.8; margin: 20px 0;">
              If you have any urgent inquiries, please don't hesitate to call us at <a href="tel:+14168935779" style="color: #C9A063; text-decoration: none; font-weight: 600;">416-893-5779</a>.
            </p>
            
            <p style="color: #444; font-size: 15px; line-height: 1.8; margin: 20px 0 0 0;">
              Best regards,<br>
              <strong style="color: #C9A063;">SARJ WORLDWIDE</strong><br>
              <span style="color: #888; font-size: 13px;">Luxury Chauffeur Service</span>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #1C1C1E; padding: 25px 30px; text-align: center;">
            <p style="color: #C9A063; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">SARJ WORLDWIDE</p>
            <p style="color: #888; font-size: 12px; margin: 0;">231 Oak Park Blvd, Oakville, ON L6H 7S8</p>
            <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">
              <a href="tel:+14168935779" style="color: #888; text-decoration: none;">416-893-5779</a> | 
              <a href="mailto:reserve@sarjworldwide.ca" style="color: #888; text-decoration: none;">reserve@sarjworldwide.ca</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create transporter with Hostinger SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true,
    });

    // Verify connection
    await transporter.verify();
    console.log("SMTP connection verified successfully");

    // Send email to admin
    await transporter.sendMail({
      from: `"SARJ Website" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL,
      subject: `New Contact Form: ${fullName}`,
      html: adminEmailHtml,
    });

    // Send confirmation email to user
    await transporter.sendMail({
      from: `"SARJ WORLDWIDE" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Booking Form is Successfully Submitted - SARJ WORLDWIDE",
      html: userEmailHtml,
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error: any) {
    console.error("Email error:", error);
    
    let errorMessage = "Failed to send message. Please try again later.";
    if (error.code === "EAUTH") {
      errorMessage = "Email authentication failed. Check email password in Hostinger.";
    } else if (error.code === "ECONNECTION" || error.code === "ESOCKET") {
      errorMessage = "Could not connect to email server.";
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}
