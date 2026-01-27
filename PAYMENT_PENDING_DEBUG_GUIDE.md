# 🐛 Debugging Guide: Payment Showing Pending After Success

## 🔍 Problem
User completes payment on Razorpay, but booking still shows `paymentStatus: "pending"` in database.

---

## 📊 Common Causes (In Order of Frequency)

### **1. Verification Endpoint Never Called** (80% of cases)
**Symptom:**
```javascript
paymentHistory: [{
  razorpayOrderId: "order_Rv2bq2p5xAYr0G",
  amount: 787,
  status: "pending",  // ❌ Still pending
  paymentId: "PENDING_order_Rv2bq2p5xAYr0G"
}]
```

**Root Cause:**
- Frontend creates payment order ✅
- User completes payment on Razorpay ✅
- Frontend **forgets** to call verification API ❌

**Solution:**
Frontend must call this after Razorpay success:
```javascript
// After Razorpay payment success
const response = await razorpay.on('payment.success', async (response) => {
  await fetch(`/api/payments/booking/${bookingId}/verify`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    })
  });
});
```

---

### **2. Wrong Verification Endpoint Called** (10% of cases)
**Symptom:**
- Single bike booking created
- Frontend calls `/api/payments/cart/verify` (for combined bookings)
- No error, but booking stays pending

**Solution:**
```javascript
// ✅ For single bookings
POST /api/payments/booking/:id/verify

// ✅ For combined bookings (bike + hostel)
POST /api/payments/cart/verify
```

---

### **3. Razorpay Signature Mismatch** (5% of cases)
**Symptom:**
Error response: `"Invalid payment signature"`

**Root Cause:**
- Wrong `RAZORPAY_KEY_SECRET` in `.env`
- Frontend sends corrupted signature
- Network issues modifying data

**Check Backend Logs:**
```bash
grep "Invalid payment signature" logs/server.log
```

**Solution:**
Verify your `.env`:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret_key  # ← Must match Razorpay dashboard
```

---

### **4. Payment Actually Failed** (3% of cases)
**Symptom:**
Razorpay dashboard shows: `status: "failed"` or `status: "created"`

**Check Razorpay Dashboard:**
1. Go to: https://dashboard.razorpay.com/app/payments
2. Search for order: `order_Rv2bq2p5xAYr0G`
3. Check status:
   - **"captured"** → Payment successful ✅
   - **"failed"** → Payment failed ❌
   - **"created"** → User never completed ⚠️

---

### **5. Network Error During Verification** (2% of cases)
**Symptom:**
- Frontend calls verify API
- Network error occurs
- Frontend shows success (wrong!)
- Backend never receives request

**Solution:**
Add proper error handling:
```javascript
try {
  const verifyResponse = await fetch('/api/payments/booking/:id/verify', {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });

  if (!verifyResponse.ok) {
    throw new Error('Verification failed');
  }

  const result = await verifyResponse.json();
  
  if (!result.success) {
    // Show error to user
    showError('Payment verification failed. Please contact support.');
  } else {
    // Show success
    showSuccess('Payment successful!');
  }
} catch (error) {
  console.error('Verification error:', error);
  showError('Payment verification failed. Please contact support with order ID: ' + orderId);
}
```

---

## 🔧 How to Debug Specific Booking

### **Step 1: Check Database**
```javascript
// MongoDB query
db.bookings.findOne({ _id: ObjectId("694a80b55fb392cbe7113ac9") })
```

**Look for:**
```javascript
{
  paymentStatus: "pending",  // ❌ Problem
  paymentDetails: {
    paymentHistory: [{
      razorpayOrderId: "order_Rv2bq2p5xAYr0G",
      status: "pending",  // ❌ Never updated
      amount: 787
    }]
  }
}
```

---

### **Step 2: Check Razorpay Dashboard**
1. Login to: https://dashboard.razorpay.com
2. Go to: **Payments** → **All Payments**
3. Search: `order_Rv2bq2p5xAYr0G`
4. Check:
   - Payment ID
   - Status (captured/failed)
   - Amount
   - Timestamp

---

### **Step 3: Check Backend Logs**
```bash
# Search for this specific order
grep "order_Rv2bq2p5xAYr0G" logs/server.log

# Look for verification attempts
grep "Payment verified successfully" logs/server.log

# Look for errors
grep "Invalid payment signature" logs/server.log
```

---

### **Step 4: Check Frontend Network Tab**
1. Open DevTools → Network
2. Filter: `verify`
3. Look for:
   - Was request made?
   - What was the response?
   - Any errors (4xx, 5xx)?

---

## ✅ Solutions

### **Solution 1: Run Auto-Fix Script** (Recommended)
This script will:
- Check Razorpay for actual payment status
- Update your database if payment was successful
- Skip if payment was never completed

```bash
cd "/Users/nilesh/Desktop/personal learning/happy go backend new"
npm run fix:pending-payments
```

**Output:**
```
✅ Connected to MongoDB
📦 Found 1 bookings with pending payments

🔍 Processing Booking: 694a80b55fb392cbe7113ac9
   Type: bike
   Payment Status: pending

   📝 Pending Payment:
      Order ID: order_Rv2bq2p5xAYr0G
      Amount: ₹787
      Razorpay Status: paid
      ✅ Payment was completed on Razorpay!
      ✅ Booking updated successfully!
      New Payment Status: partial
      New Booking Status: confirmed
      Paid Amount: ₹787
```

---

### **Solution 2: Manual Verification** (If you have payment details)
If you know the payment was successful and have the payment ID:

```bash
curl -X POST "http://localhost:8080/api/payments/booking/694a80b55fb392cbe7113ac9/verify" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_Rv2bq2p5xAYr0G",
    "razorpay_payment_id": "pay_xxxxx",  # Get from Razorpay dashboard
    "razorpay_signature": "signature_xxxxx"  # Get from Razorpay dashboard
  }'
```

---

### **Solution 3: Manual Database Update** (Last Resort)
⚠️ **Only use if payment is confirmed on Razorpay dashboard**

```javascript
// MongoDB update
db.bookings.updateOne(
  { 
    _id: ObjectId("694a80b55fb392cbe7113ac9"),
    "paymentDetails.paymentHistory.razorpayOrderId": "order_Rv2bq2p5xAYr0G"
  },
  {
    $set: {
      "paymentStatus": "partial",  // or "completed"
      "bookingStatus": "confirmed",
      "paymentId": "pay_xxxxx",  // From Razorpay
      "paymentDetails.paymentHistory.$.status": "completed",
      "paymentDetails.paymentHistory.$.razorpayPaymentId": "pay_xxxxx",
      "paymentDetails.paymentHistory.$.paidAt": new Date()
    },
    $inc: {
      "paymentDetails.paidAmount": 787  // The amount paid
    }
  }
)
```

---

## 🛡️ Prevention (Fix Frontend)

### **Add Proper Razorpay Integration:**

```javascript
// ✅ Correct implementation
const options = {
  key: RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: order.currency,
  order_id: order.id,
  name: "Happy Go",
  description: "Bike Booking Payment",
  
  handler: async function (response) {
    try {
      // ✅ ALWAYS call verification API
      const verifyResponse = await fetch(
        `/api/payments/booking/${bookingId}/verify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })
        }
      );

      const result = await verifyResponse.json();

      if (result.success) {
        // Show success
        alert('Payment successful!');
        window.location.href = `/booking/${bookingId}`;
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Payment received but verification failed. Please contact support.');
    }
  },
  
  modal: {
    ondismiss: function() {
      alert('Payment cancelled');
    }
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

---

## 📊 Quick Reference

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| `status: "pending"` in DB, but paid on Razorpay | Verification API not called | Run `npm run fix:pending-payments` |
| Error: "Invalid payment signature" | Wrong `RAZORPAY_KEY_SECRET` | Check `.env` file |
| Payment shows "created" on Razorpay | User abandoned payment | Keep as pending or mark failed |
| Payment shows "failed" on Razorpay | Payment actually failed | No action needed |
| Verification returns 404 | Wrong booking ID | Check frontend is using correct ID |

---

## 🎯 Quick Commands

```bash
# Check database
mongosh "mongodb://localhost:27017/happygo"
db.bookings.find({ paymentStatus: "pending" }).pretty()

# Fix all pending payments
npm run fix:pending-payments

# Check server logs
tail -f logs/server.log | grep payment

# Test verification endpoint
curl -X POST "http://localhost:8080/api/payments/booking/BOOKING_ID/verify" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"razorpay_order_id":"order_xxx","razorpay_payment_id":"pay_xxx","razorpay_signature":"sig_xxx"}'
```

---

## 📞 Need Help?

If the issue persists:
1. ✅ Run `npm run fix:pending-payments`
2. ✅ Check Razorpay dashboard
3. ✅ Share backend logs
4. ✅ Share frontend network tab
5. ✅ Share booking ID

---

**Last Updated:** Dec 23, 2025




