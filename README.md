# SR PG Management Backend

This is a Node.js REST API built using Express, MongoDB (Mongoose), and modern ES module architecture, specifically tailored for the SR PG Management System.

## Architecture & Project Structure

The project follows a clean, modular structure modeled after industry best practices and aligned with the `sriAnjaneyaRealestateBackend` architecture:

```text
sr-pg-backend/
├── config/             # Database and application configuration
│   └── db.js           # MongoDB connection handler
├── controllers/        # Request handlers & business logic
│   ├── authController.js
│   ├── managementController.js
│   ├── rentPaymentController.js
│   └── tenantController.js
├── middleware/         # Custom Express middlewares
│   ├── auth.js         # JWT verification & admin guard
│   └── authMiddleware.js # Standard alias for auth guards
├── models/             # Mongoose schemas & data models
│   ├── Admin.js
│   ├── Bed.js
│   ├── Floor.js
│   ├── RentPayment.js
│   ├── Room.js
│   └── Tenant.js
├── routes/             # Express route declarations
│   ├── authRoutes.js
│   ├── managementRoutes.js
│   ├── rentPaymentRoutes.js
│   └── tenantRoutes.js
├── scripts/            # Management & verification scripts
│   ├── resetAdminPassword.js
│   ├── seedAdmin.js
│   └── testEndpoints.js
├── utils/              # Helper utilities
│   ├── dateUtils.js
│   └── responseUtils.js
├── uploads/            # Directory for uploaded media/receipts
├── app.js              # Express app initialization, middleware & routes
├── server.js           # Server bootstrap & database listener
├── package.json        # Dependencies and NPM scripts
├── .env.example        # Environment variable template
└── .gitignore          # Git ignore specifications
```

### Key Architectural Separation: `app.js` vs `server.js`
- **`app.js`**: Pure Express application configuration (middleware, routes, error handlers). Exported as default for modularity and testing.
- **`server.js`**: Dedicated runtime entry point that initializes the database connection and binds the application to the network port.

---

## Features

- **Authentication & Security**:
  - Secure JWT-based admin authentication.
  - Password encryption using `bcryptjs`.
  - HTTP header protection via `helmet`.
  - Configurable CORS policy.
  - API rate-limiting against brute force / DoS.
- **PG Management**:
  - Floor, Room, and Bed hierarchy management with capacity controls.
  - Automated bed occupancy status tracking.
- **Tenant Management**:
  - Tenant onboarding, checkout, and room/bed assignment.
  - Due date tracking and active tenancy records.
- **Rent & Payments**:
  - Payment records with partial, full, and balance tracking.
  - Monthly rent summaries and transaction reference deduplication.

---

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your connection details:
   ```bash
   cp .env.example .env
   ```

3. **Seed Initial Admin User**:
   ```bash
   npm run seed:admin
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```

5. **Start in Production**:
   ```bash
   npm start
   ```

---

## API Endpoints Overview

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API Health & status check | No |
| `GET` | `/api/health` | Service health status | No |
| `POST` | `/api/auth/login` | Admin login & JWT generation | No |
| `GET` | `/api/auth/me` | Current admin profile | Yes |
| `POST` | `/api/management/create` | Create Floor / Room / Bed / Tenant | Yes |
| `GET` | `/api/management` | Query Floors, Rooms, or Beds | Yes |
| `PUT` | `/api/management/:id` | Update management entity | Yes |
| `DELETE`| `/api/management/:id` | Delete management entity | Yes |
| `GET` | `/api/tenants` | List tenants with computed rent | Yes |
| `GET` | `/api/tenants/filter-options` | Dropdown filter metadata | Yes |
| `PUT` | `/api/tenants/:id` | Update tenant details/bed assignment| Yes |
| `POST` | `/api/rent-payments` | Record new rent payment | Yes |
| `GET` | `/api/rent-payments` | Query payments history | Yes |
| `GET` | `/api/rent-payments/summary/:tenantId` | Tenant rent summary | Yes |

---

## Running Verification Tests

Run the complete endpoint assertion test suite:
```bash
npm run test:endpoints
```
