# Location-Based Promotion System - Backend

A comprehensive Node.js + Express.js backend with PostgreSQL for managing location-based promotions for businesses.

## Features

- **Authentication & Authorization**: JWT-based auth for users, businesses, and admins
- **User Management**: User registration, login, wishlist management
- **Business Management**: Business registration, promotion creation, dashboard analytics
- **Admin Panel**: User/business management, promotion oversight
- **Payment Integration**: Stripe payment processing
- **Automated Tasks**: Cron jobs for deactivating expired promotions
- **Location-based**: Timezone support and location filtering
- **Analytics**: Dashboard statistics for businesses and admins

## Tech Stack

- **Node.js** & **Express.js**
- **PostgreSQL** with **Sequelize ORM**
- **JWT** for authentication
- **Stripe** for payments
- **bcryptjs** for password hashing
- **node-cron** for scheduled tasks

## Project Structure

```
backend/
│
├── config/
│   ├── db.js               # PostgreSQL connection
│   ├── stripe.js           # Stripe configuration
│   └── cronJobs.js         # Cron jobs for promotions
│
├── controllers/
│   ├── authController.js   # Register, login
│   ├── userController.js   # User-related endpoints
│   ├── businessController.js  # Business endpoints
│   ├── adminController.js  # Admin endpoints
│   ├── promotionController.js  # Promotion CRUD
│   └── paymentController.js    # Stripe payment handling
│
├── middleware/
│   ├── authMiddleware.js   # JWT auth & role checks
│   ├── errorMiddleware.js  # Error handling
│   └── validationMiddleware.js # Request validation
│
├── models/
│   ├── User.js
│   ├── Business.js
│   ├── Promotion.js
│   └── Template.js
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── businessRoutes.js
│   ├── adminRoutes.js
│   ├── promotionRoutes.js
│   └── paymentRoutes.js
│
├── utils/
│   ├── calculatePrice.js   # Price calculation logic
│   ├── timezoneAPI.js      # Timezone helpers
│   └── dateUtils.js        # Date/time utilities
│
├── app.js                  # Express app setup
├── server.js               # Server entry point
├── package.json
└── .env                    # Environment variables
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Stripe account

### Steps

1. **Clone the repository**

```bash
git clone <repository-url>
cd backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup PostgreSQL database**

Create a new PostgreSQL database:

```sql
CREATE DATABASE promotion_system;
```

4. **Configure environment variables**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your credentials:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=promotion_system
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000

# Base Price
BASE_PRICE_PER_DAY=10
```

5. **Run the server**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/register/business` - Register new business
- `POST /api/auth/login` - Login user/business

### User Endpoints

- `GET /api/users/profile` - Get user profile (Protected)
- `PUT /api/users/profile` - Update user profile (Protected)
- `POST /api/users/wishlist` - Add to wishlist (Protected)
- `GET /api/users/wishlist` - Get wishlist (Protected)
- `DELETE /api/users/wishlist/:promotionId` - Remove from wishlist (Protected)

### Business Endpoints

- `GET /api/business/dashboard` - Get dashboard stats (Protected)
- `POST /api/business/promotions` - Create promotion (Protected)
- `GET /api/business/promotions` - List business promotions (Protected)
- `PUT /api/business/promotions/:id` - Update promotion (Protected)
- `DELETE /api/business/promotions/:id` - Delete promotion (Protected)

### Promotion Endpoints (Public)

- `GET /api/promotions` - List all active promotions (with filters)
- `GET /api/promotions/:id` - Get single promotion
- `POST /api/promotions/calculate-price` - Calculate promotion price
- `GET /api/promotions/templates` - Get all templates
- `POST /api/promotions/:id/click` - Increment click count

### Admin Endpoints

- `GET /api/admin/dashboard` - Get admin dashboard stats (Protected, Admin)
- `GET /api/admin/users` - List all users (Protected, Admin)
- `GET /api/admin/businesses` - List all businesses (Protected, Admin)
- `PUT /api/admin/users/:id/block` - Block/unblock user (Protected, Admin)
- `PUT /api/admin/businesses/:id/block` - Block/unblock business (Protected, Admin)
- `GET /api/admin/promotions` - List all promotions (Protected, Admin)
- `DELETE /api/admin/promotions/:id` - Delete promotion (Protected, Admin)

### Payment Endpoints

- `POST /api/payment/stripe` - Create Stripe checkout session (Protected, Business)
- `POST /api/payment/webhook` - Stripe webhook handler (Public, Stripe only)
- `GET /api/payment/verify/:sessionId` - Verify payment status (Protected, Business)

## Database Models

### User
```javascript
{
  id: UUID,
  name: String,
  email: String,
  password: String (hashed),
  wishlist: Array[UUID],
  city: String,
  state: String,
  timezone: String,
  role: ENUM('user', 'business', 'admin'),
  isBlocked: Boolean
}
```

### Business
```javascript
{
  id: UUID,
  name: String,
  email: String,
  password: String (hashed),
  phone: String,
  category: String,
  state: String,
  isBlocked: Boolean
}
```

### Promotion
```javascript
{
  id: UUID,
  businessId: UUID,
  templateId: UUID,
  imageUrl: String,
  text: JSONB [{content, x, y, color, fontSize}],
  category: String,
  city: String,
  state: String,
  runDate: DATE,
  stopDate: DATE,
  runTime: TIME,
  stopTime: TIME,
  month: Integer,
  timezone: String,
  price: Decimal,
  status: ENUM('active', 'inactive', 'pending'),
  views: Integer,
  clicks: Integer,
  stripePaymentId: String
}
```

### Template
```javascript
{
  id: UUID,
  name: String,
  defaultImageUrl: String,
  isDefault: Boolean
}
```

## Price Calculation

The system calculates promotion prices based on:

- **Duration**: Number of days between run and stop dates
- **Time of day**: Peak hours (9 AM - 9 PM) get a 20% premium
- **Month length**: Adjustments for February (10% increase) and 30-day months (5% increase)
- **Volume discounts**: 
  - 7-13 days: 5% discount
  - 14-29 days: 10% discount
  - 30+ days: 15% discount

Base price per day is configurable via `BASE_PRICE_PER_DAY` environment variable.

## Cron Jobs

The system runs a daily cron job at midnight to:
- Deactivate expired promotions
- Check promotion status based on current date/time

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

Token payload includes:
- `id`: User/Business ID
- `type`: 'user' or 'business'

## Error Handling

All errors return a JSON response with the following structure:

```json
{
  "message": "Error message",
  "stack": "Stack trace (only in development)",
  "errors": []
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Running Tests

```bash
npm test
```

### Database Migrations

The application uses Sequelize with `sync()` in development mode. For production, use proper migrations:

```bash
npx sequelize-cli migration:generate --name migration-name
npx sequelize-cli db:migrate
```

## Deployment

1. Set `NODE_ENV=production` in your environment
2. Set up PostgreSQL database
3. Configure Stripe webhook endpoint
4. Set all required environment variables
5. Run `npm start`

## Security

- Passwords are hashed using bcryptjs
- JWT tokens expire after 7 days (configurable)
- Rate limiting on API endpoints (100 requests per 15 minutes)
- Helmet.js for security headers
- CORS configured for specific frontend origin
- Input validation on all endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
