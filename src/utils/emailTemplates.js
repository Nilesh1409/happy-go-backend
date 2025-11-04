import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate booking confirmation email HTML
 * @param {Object} bookingData - The booking data
 * @returns {string} - HTML string
 */
export const generateBookingConfirmationEmail = (bookingData) => {
  const {
    bookingType, // "bike", "hostel", or can have both bikeItems and hostelItems
    booking,
    user,
    bikeDetails,
    hostelDetails,
    priceDetails,
  } = bookingData;

  // Read the template
  const templatePath = path.join(
    __dirname,
    "../templates/booking-confirmation-email-v2.html"
  );
  let template = fs.readFileSync(templatePath, "utf-8");

  // Determine what was booked
  const hasBikes = bookingType === "bike" || bookingType === "combined" || (booking.bikeItems && booking.bikeItems.length > 0);
  const hasHostel = bookingType === "hostel" || bookingType === "combined" || booking.hostel;

  // ===== HEADER =====
  let headerTitle = "Booking Confirmed!";
  let headerSubtitle = "";
  let bookingTypeName = "";

  if (hasBikes && hasHostel) {
    headerSubtitle = "Your bike rental and hostel booking are confirmed";
    bookingTypeName = "🏍️ Bike Rental + 🏨 Hostel Stay";
  } else if (hasBikes) {
    headerSubtitle = "Your bike rental is ready for pickup";
    bookingTypeName = "🏍️ Bike Rental";
  } else if (hasHostel) {
    headerSubtitle = "Your hostel booking is confirmed";
    bookingTypeName = "🏨 Hostel Stay";
  }

  // ===== INTRO TEXT =====
  let introText = "Thank you for choosing Happy Go! Your booking has been confirmed";
  if (hasBikes && hasHostel) {
    introText += " and we're excited to provide you with both amazing bikes and comfortable accommodation.";
  } else if (hasBikes) {
    introText += " and we're excited to help you explore Chikkamagaluru.";
  } else if (hasHostel) {
    introText += " and we're excited to host you at our hostel in Chikkamagaluru.";
  }

  // ===== BIKE SECTION =====
  let bikeSection = "";
  if (hasBikes) {
    const isMultipleBikes = booking.bikeItems && booking.bikeItems.length > 0;
    let bikeCardsHtml = "";

    if (isMultipleBikes) {
      // Multiple bikes
      booking.bikeItems.forEach((item, index) => {
        bikeCardsHtml += `
          <div class="item-card">
            <div class="item-header">
              <div class="item-title">${item.bikeTitle || `Bike ${index + 1}`}</div>
              <div class="item-badge">x${item.quantity}</div>
            </div>
            <div class="item-details">
              <strong>Model:</strong> ${item.bikeModel || "N/A"}<br />
              <strong>Package:</strong> ${item.kmOption === "unlimited" ? "Unlimited" : `Limited (${item.kmLimit || 0} km)`}<br />
              <strong>Price per bike:</strong> ₹${item.pricePerUnit || 0}<br />
              <strong>Total:</strong> ₹${item.totalPrice || 0}
            </div>
          </div>
        `;
      });

      const totalBikes = booking.bikeItems.reduce((sum, item) => sum + item.quantity, 0);
      bikeCardsHtml = `
        <div style="text-align: center; margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; font-weight: 600; border: 2px solid #f47b20;">
          Total Bikes: ${totalBikes}
        </div>
        ${bikeCardsHtml}
      `;
    } else {
      // Single bike
      bikeCardsHtml = `
        <div class="item-card" style="text-align: center;">
          <div class="item-title" style="margin-bottom: 12px;">${bikeDetails?.title || "Bike"}</div>
          <div class="item-details">
            <strong>Model:</strong> ${bikeDetails?.brand || ""} ${bikeDetails?.model || ""}<br />
            <strong>Package:</strong> ${booking.kmOption === "unlimited" ? "Unlimited" : `Limited ${booking.kmLimit ? `(${booking.kmLimit} km)` : ""}`}
          </div>
        </div>
      `;
    }

    // Rental Period
    const pickupDate = new Date(booking.startDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const dropoffDate = new Date(booking.endDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const pickupTime = booking.startTime || "N/A";
    const dropoffTime = booking.endTime || "N/A";
    const totalDays = booking.bikeDetails?.totalDays || 1;

    bikeSection = `
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            <span class="icon">🏍️</span>Bike Details
          </div>
        </div>
        <div class="section-content">
          ${bikeCardsHtml}
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title">
            <span class="icon">📅</span>Rental Period
          </div>
        </div>
        <div class="section-content">
          <div class="rental-grid">
            <div class="rental-item">
              <div class="rental-label">Pickup</div>
              <div class="rental-value">${pickupDate}</div>
              <div class="rental-time">${pickupTime}</div>
            </div>
            <div class="rental-item">
              <div class="rental-label">Drop-off</div>
              <div class="rental-value">${dropoffDate}</div>
              <div class="rental-time">${dropoffTime}</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 16px; font-weight: 600">
            Total Duration: ${totalDays} day${totalDays > 1 ? "s" : ""}
          </div>
        </div>
      </div>
    `;
  }

  // ===== HOSTEL SECTION =====
  let hostelSection = "";
  if (hasHostel) {
    const checkInDate = new Date(booking.startDate || booking.checkIn).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const checkOutDate = new Date(booking.endDate || booking.checkOut).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const numberOfNights = booking.numberOfNights || 1;
    const numberOfBeds = booking.numberOfBeds || 1;

    const mealOptionText = {
      bedOnly: "Bed Only (No Meals)",
      bedAndBreakfast: "Bed & Breakfast",
      bedBreakfastAndDinner: "Bed, Breakfast & Dinner",
    }[booking.mealOption] || booking.mealOption;

    const stayType = booking.hostelDetails?.stayType === "workstation" ? "Workstation Stay" : "Hostel Stay";
    const checkInTime = booking.hostelDetails?.checkInTime || "1:00 PM";

    hostelSection = `
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            <span class="icon">🏨</span>Hostel Details
          </div>
        </div>
        <div class="section-content">
          <div class="item-card">
            <div class="item-header">
              <div class="item-title">${hostelDetails?.name || "Happy Go Hostel"}</div>
              <div class="item-badge">${numberOfBeds} Bed${numberOfBeds > 1 ? "s" : ""}</div>
            </div>
            <div class="item-details">
              <strong>Room Type:</strong> ${booking.roomType || "N/A"}<br />
              <strong>Meal Plan:</strong> ${mealOptionText}<br />
              <strong>Stay Type:</strong> ${stayType}<br />
              <strong>Location:</strong> ${hostelDetails?.location || "Chikkamagaluru"}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title">
            <span class="icon">📅</span>Stay Period
          </div>
        </div>
        <div class="section-content">
          <div class="rental-grid">
            <div class="rental-item">
              <div class="rental-label">Check-In</div>
              <div class="rental-value">${checkInDate}</div>
              <div class="rental-time">${checkInTime}</div>
            </div>
            <div class="rental-item">
              <div class="rental-label">Check-Out</div>
              <div class="rental-value">${checkOutDate}</div>
              <div class="rental-time">11:00 AM</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 16px; font-weight: 600">
            Total Nights: ${numberOfNights} night${numberOfNights > 1 ? "s" : ""}
          </div>
        </div>
      </div>
    `;
  }

  // ===== PAYMENT BREAKDOWN =====
  let paymentBreakdown = "";

  if (hasBikes) {
    const baseAmount = priceDetails.basePrice || priceDetails.subtotal || 0;
    const helmetCharges = priceDetails.helmetCharges || 0;
    paymentBreakdown += `
      <tr class="row">
        <td class="label">Bike Rental</td>
        <td class="value">₹${baseAmount.toFixed(2)}</td>
      </tr>
    `;
    if (helmetCharges > 0) {
      paymentBreakdown += `
        <tr class="row">
          <td class="label">Helmet Charges (${booking.helmetQuantity || 0}x)</td>
          <td class="value">₹${helmetCharges.toFixed(2)}</td>
        </tr>
      `;
    }
  }

  if (hasHostel) {
    const hostelAmount = booking.hostelDetails?.totalPrice || priceDetails.subtotal || 0;
    paymentBreakdown += `
      <tr class="row">
        <td class="label">Hostel Stay (${booking.numberOfNights || 1} night${(booking.numberOfNights || 1) > 1 ? "s" : ""})</td>
        <td class="value">₹${hostelAmount.toFixed(2)}</td>
      </tr>
    `;
  }

  const gstAmount = priceDetails.taxes || priceDetails.gst || 0;
  const gstPercentage = priceDetails.gstPercentage || 5;
  const discount = priceDetails.discount || 0;

  paymentBreakdown += `
    <tr class="row">
      <td class="label">GST (${gstPercentage}%)</td>
      <td class="value">₹${gstAmount.toFixed(2)}</td>
    </tr>
  `;

  if (discount > 0) {
    paymentBreakdown += `
      <tr class="row">
        <td class="label">Discount</td>
        <td class="value">- ₹${discount.toFixed(2)}</td>
      </tr>
    `;
  }

  // Partial payment note
  let partialPaymentNote = "";
  if (booking.partialPaymentPercentage && booking.paymentStatus === "partial") {
    const paidAmount = booking.paymentDetails?.paidAmount || 0;
    const remainingAmount = (priceDetails.totalAmount || 0) - paidAmount;
    partialPaymentNote = `
      <div style="margin-top: 16px; padding: 16px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px;">
        <strong style="color: #92400e;">Payment Status:</strong><br />
        <span style="color: #92400e;">✅ Paid Now: ₹${paidAmount.toFixed(2)} (${booking.partialPaymentPercentage}%)</span><br />
        <span style="color: #92400e;">⏳ Remaining: ₹${remainingAmount.toFixed(2)} (Due before ${hasBikes ? "pickup" : "check-in"})</span>
      </div>
    `;
  }

  // ===== INSTRUCTIONS =====
  let instructionsSections = "";

  if (hasBikes && hasHostel) {
    // Combined instructions
    instructionsSections = `
      <div class="instruction-group">
        <div class="group-title">Before Pickup & Check-In:</div>
        <ul class="instruction-list">
          <li><strong>Carry original documents:</strong> Valid driving license, Aadhaar card</li>
          <li><strong>Complete pending payment</strong> if applicable</li>
          <li><strong>Arrive 15 minutes early</strong> for vehicle inspection</li>
          <li><strong>Verify mobile number</strong> for OTP verification</li>
        </ul>
      </div>
      <div class="instruction-group">
        <div class="group-title">During Your Stay:</div>
        <ul class="instruction-list">
          <li><strong>Always wear helmet</strong> while riding</li>
          <li><strong>Follow hostel rules</strong> and respect other guests</li>
          <li><strong>Keep your room tidy</strong> and report any issues</li>
          <li><strong>Contact us immediately</strong> for any concerns</li>
        </ul>
      </div>
      <div class="instruction-group">
        <div class="group-title">At Return & Check-Out:</div>
        <ul class="instruction-list">
          <li><strong>Return bike with same fuel level</strong> as provided</li>
          <li><strong>Check-out by 11:00 AM</strong> to avoid extra charges</li>
          <li><strong>Vehicle & room inspection</strong> will be conducted</li>
          <li><strong>Late charges apply</strong> after grace period</li>
        </ul>
      </div>
    `;
  } else if (hasBikes) {
    // Bike only instructions
    instructionsSections = `
      <div class="instruction-group">
        <div class="group-title">Before Pickup:</div>
        <ul class="instruction-list">
          <li><strong>Carry original documents:</strong> Valid driving license, Aadhaar card</li>
          <li><strong>Arrive 15 minutes early</strong> for vehicle inspection</li>
          <li><strong>Verify mobile number</strong> for OTP verification</li>
          <li><strong>Complete pending payment</strong> if applicable</li>
        </ul>
      </div>
      <div class="instruction-group">
        <div class="group-title">During Rental:</div>
        <ul class="instruction-list">
          <li><strong>Always wear helmet</strong> while riding</li>
          <li><strong>Follow speed limits</strong> and traffic rules</li>
          <li><strong>Contact us immediately</strong> for any issues</li>
        </ul>
      </div>
      <div class="instruction-group">
        <div class="group-title">At Return:</div>
        <ul class="instruction-list">
          <li><strong>Return with same fuel level</strong> as provided</li>
          <li><strong>Vehicle inspection</strong> will be conducted</li>
          <li><strong>Late return charges</strong> apply after 30-minute grace period</li>
        </ul>
      </div>
    `;
  } else if (hasHostel) {
    // Hostel only instructions
    instructionsSections = `
      <div class="instruction-group">
        <div class="group-title">Before Check-In:</div>
        <ul class="instruction-list">
          <li><strong>Carry original ID proof:</strong> Aadhaar card, passport, or driving license</li>
          <li><strong>Complete pending payment</strong> if applicable</li>
          <li><strong>Check-in time:</strong> ${booking.hostelDetails?.checkInTime || "1:00 PM"} onwards</li>
          <li><strong>Early check-in</strong> subject to availability</li>
        </ul>
      </div>
      <div class="instruction-group">
        <div class="group-title">During Your Stay:</div>
        <ul class="instruction-list">
          <li><strong>Follow hostel rules</strong> and respect other guests</li>
          <li><strong>Keep noise levels low</strong> especially after 10 PM</li>
          <li><strong>Report any issues</strong> to the hostel staff</li>
          <li><strong>Secure your belongings</strong> using provided lockers</li>
        </ul>
      </div>
      <div class="instruction-group">
        <div class="group-title">At Check-Out:</div>
        <ul class="instruction-list">
          <li><strong>Check-out by 11:00 AM</strong> to avoid extra charges</li>
          <li><strong>Room inspection</strong> will be conducted</li>
          <li><strong>Late check-out</strong> subject to availability and charges</li>
          <li><strong>Return room key</strong> at the reception</li>
        </ul>
      </div>
    `;
  }

  // ===== OTHER VARIABLES =====
  const locationTitle = hasBikes && hasHostel ? "Pickup & Accommodation Location" : hasBikes ? "Pickup Location" : "Hostel Location";
  const cancellationDateType = hasBikes ? "pickup" : "check-in";
  const closingMessage = hasBikes && hasHostel ? "Happy Ride & Comfortable Stay!" : hasBikes ? "Happy Ride!" : "Happy Stay!";
  const trackingUrl = `https://happygo.com/bookings/${booking._id}`;

  // ===== REPLACE ALL PLACEHOLDERS =====
  template = template
    .replace(/{{headerTitle}}/g, headerTitle)
    .replace(/{{headerSubtitle}}/g, headerSubtitle)
    .replace(/{{introText}}/g, introText)
    .replace(/{{customerName}}/g, user.name || "Customer")
    .replace(/{{customerMobile}}/g, user.mobile || user.phone || "N/A")
    .replace(/{{customerEmail}}/g, user.email || "N/A")
    .replace(/{{bookingId}}/g, booking._id?.toString() || "N/A")
    .replace(/{{bookingTypeName}}/g, bookingTypeName)
    .replace(/{{bikeSection}}/g, bikeSection)
    .replace(/{{hostelSection}}/g, hostelSection)
    .replace(/{{locationTitle}}/g, locationTitle)
    .replace(/{{paymentBreakdown}}/g, paymentBreakdown)
    .replace(/{{totalAmount}}/g, (priceDetails.totalAmount || 0).toFixed(2))
    .replace(/{{partialPaymentNote}}/g, partialPaymentNote)
    .replace(/{{instructionsSections}}/g, instructionsSections)
    .replace(/{{cancellationDateType}}/g, cancellationDateType)
    .replace(/{{closingMessage}}/g, closingMessage)
    .replace(/{{trackingUrl}}/g, trackingUrl)
    .replace(/{{websiteUrl}}/g, "https://happygo.com")
    .replace(/{{bookingsUrl}}/g, "https://happygo.com/bookings")
    .replace(/{{supportUrl}}/g, "https://happygo.com/support")
    .replace(/{{termsUrl}}/g, "https://happygo.com/terms")
    .replace(/{{privacyUrl}}/g, "https://happygo.com/privacy");

  return template;
};

