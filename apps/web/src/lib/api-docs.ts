/**
 * @swagger
 * /api/reservation:
 *   post:
 *     tags:
 *       - Reservations
 *     summary: Create a new reservation
 *     description: Creates a new chauffeur service reservation with customer details, trip info, and payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phone
 *               - serviceType
 *               - vehicle
 *               - serviceDate
 *               - serviceTime
 *               - pickupLocation
 *               - dropoffLocation
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               phone:
 *                 type: string
 *                 example: "+1-416-123-4567"
 *               serviceType:
 *                 type: string
 *                 enum: [airport-transfers, corporate-travel, point-to-point, hourly-chauffeur, wedding-events]
 *               vehicle:
 *                 type: string
 *                 example: "LUXURY SEDAN"
 *               passengers:
 *                 type: integer
 *                 default: 1
 *               serviceDate:
 *                 type: string
 *                 example: "2026-05-15"
 *               serviceTime:
 *                 type: string
 *                 example: "10:30 AM"
 *               pickupLocation:
 *                 type: string
 *                 example: "Toronto Pearson Airport, Terminal 1"
 *               dropoffLocation:
 *                 type: string
 *                 example: "Downtown Toronto, King Street"
 *               stops:
 *                 type: string
 *               specialRequirements:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reservation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 bookingId:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/quote:
 *   post:
 *     tags:
 *       - Quotes
 *     summary: Submit a quote request
 *     description: Submit a request for a price quote
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passengerName
 *               - email
 *               - phone
 *               - pickupLocation
 *               - dropoffLocation
 *             properties:
 *               passengerName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               passengers:
 *                 type: string
 *               serviceType:
 *                 type: string
 *               pickupLocation:
 *                 type: string
 *               dropoffLocation:
 *                 type: string
 *               additionalNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Quote submitted successfully
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     tags:
 *       - General
 *     summary: Submit contact form
 *     description: Send a contact message
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent successfully
 */

/**
 * @swagger
 * /api/driver-status:
 *   get:
 *     tags:
 *       - Drivers
 *     summary: Get driver status for a reservation
 *     description: Get the current status and location of an assigned driver
 *     parameters:
 *       - in: query
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The booking ID to check driver status for
 *     responses:
 *       200:
 *         description: Driver status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 driver:
 *                   $ref: '#/components/schemas/Driver'
 *                 reservation:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *       404:
 *         description: Reservation or driver not found
 */

/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Admin login
 *     description: Authenticate admin user with password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many attempts - rate limited
 */

/**
 * @swagger
 * /api/admin/auth/verify:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Verify admin token
 *     description: Check if the current admin session is valid
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid or expired token
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get dashboard statistics
 *     description: Retrieve admin dashboard stats including reservations, drivers, revenue
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalReservations:
 *                       type: integer
 *                     pendingReservations:
 *                       type: integer
 *                     activeTrips:
 *                       type: integer
 *                     completedTrips:
 *                       type: integer
 *                     totalDrivers:
 *                       type: integer
 *                     availableDrivers:
 *                       type: integer
 *                     totalRevenue:
 *                       type: number
 *                     todayReservations:
 *                       type: integer
 *                 recentReservations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reservation'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/reservations:
 *   get:
 *     tags:
 *       - Reservations
 *     summary: Get all reservations
 *     description: Retrieve list of all reservations (admin only)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of reservations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reservations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reservation'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/admin/reservations/{id}:
 *   patch:
 *     tags:
 *       - Reservations
 *     summary: Update reservation
 *     description: Update reservation status or details
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, ON THE WAY, ARRIVED, CIC, DONE]
 *     responses:
 *       200:
 *         description: Reservation updated
 *       404:
 *         description: Reservation not found
 *   delete:
 *     tags:
 *       - Reservations
 *     summary: Delete reservation
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation deleted
 *       404:
 *         description: Reservation not found
 */

/**
 * @swagger
 * /api/admin/reservations/assign:
 *   post:
 *     tags:
 *       - Reservations
 *     summary: Assign driver to reservation
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - driverId
 *             properties:
 *               bookingId:
 *                 type: string
 *               driverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver assigned successfully
 *       400:
 *         description: Invalid request
 */

/**
 * @swagger
 * /api/admin/drivers:
 *   get:
 *     tags:
 *       - Drivers
 *     summary: Get all drivers
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 drivers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Driver'
 *   post:
 *     tags:
 *       - Drivers
 *     summary: Add new driver
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - vehicle
 *               - vehiclePlate
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               vehicle:
 *                 type: string
 *               vehiclePlate:
 *                 type: string
 *               photo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver added successfully
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/admin/drivers/{id}:
 *   patch:
 *     tags:
 *       - Drivers
 *     summary: Update driver
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [available, on_trip, offline]
 *     responses:
 *       200:
 *         description: Driver updated
 *   delete:
 *     tags:
 *       - Drivers
 *     summary: Delete driver
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver deleted
 */

/**
 * @swagger
 * /api/admin/quotes:
 *   get:
 *     tags:
 *       - Quotes
 *     summary: Get all quote requests
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of quotes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 quotes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Quote'
 */

/**
 * @swagger
 * /api/admin/customers:
 *   get:
 *     tags:
 *       - Customers
 *     summary: Get all customers
 *     description: Get unique customers from reservations
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       totalBookings:
 *                         type: integer
 */

/**
 * @swagger
 * /api/stripe/setup-intent:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create Stripe setup intent
 *     description: Create a setup intent for saving card details
 *     responses:
 *       200:
 *         description: Setup intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 */

/**
 * @swagger
 * /api/stripe/charge:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Charge a payment
 *     description: Process a payment for a reservation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *               - amount
 *               - bookingId
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *               amount:
 *                 type: number
 *               bookingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed
 *       400:
 *         description: Payment failed
 */

/**
 * @swagger
 * /api/create-payment-intent:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create payment intent
 *     description: Create a Stripe payment intent for processing payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in dollars
 *               customerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 */

/**
 * @swagger
 * /api/driver-register:
 *   post:
 *     tags:
 *       - Drivers
 *     summary: Driver registration
 *     description: Register a new driver with invite token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - name
 *               - email
 *               - phone
 *               - vehicle
 *               - vehiclePlate
 *             properties:
 *               token:
 *                 type: string
 *                 description: Invite token
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               vehicle:
 *                 type: string
 *               vehiclePlate:
 *                 type: string
 *               photo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver registered successfully
 *       400:
 *         description: Invalid or expired token
 */

export {};
