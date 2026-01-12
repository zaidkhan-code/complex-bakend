# Admin Features Implementation - Complete Guide

## Overview

This document outlines all the admin-side features implemented for user management, business management, promotion management, and dashboard analytics.

---

## 1. Model Changes

### User Model (`models/User.js`)

- **Changed**: `isBlocked` boolean field → `status` ENUM field
- **New Status Values**: `"active"`, `"inactive"`, `"blocked"`, `"suspended"`
- **Default**: `"active"`

### Business Model (`models/Business.js`)

- **Changed**: `isBlocked` boolean field → `status` ENUM field
- **New Status Values**: `"active"`, `"inactive"`, `"blocked"`, `"suspended"`
- **Default**: `"active"`
- **Existing Field Maintained**: `autoApprovePromotions` (boolean)

---

## 2. User List Management

### Endpoint: `GET /api/admin/users`

**Features:**

- **Pagination**: Supports `page` and `limit` query parameters (default: page=1, limit=10)
- **Search**: Search by `fullName` or `email` using `search` parameter
- **Filter by Role**: Filter by `role` parameter (user, business, admin)
- **Filter by Status**: Filter by `status` parameter (active, inactive, blocked, suspended)
- **Tabs Support**: Can be used to create tabs in UI for different statuses

**Query Example:**

```
GET /api/admin/users?search=john&role=user&status=active&page=1&limit=10
```

**Response:**

```json
{
  "users": [
    {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "wishlist": [],
      "createdAt": "2026-01-12T10:00:00Z",
      "updatedAt": "2026-01-12T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "pages": 10,
    "currentPage": 1,
    "limit": 10
  }
}
```

---

## 3. Business List Management

### Endpoint: `GET /api/admin/businesses`

**Features:**

- **Pagination**: Supports `page` and `limit` query parameters (default: page=1, limit=10)
- **Search**: Search by `name`, `email`, or `phone` using `search` parameter
- **Filter by Status**: Filter by `status` parameter (active, inactive, blocked, suspended)
- **Filter by Auto-Approve**: Filter by `autoApprove` parameter (true/false)
- **Tabs Support**: Can be used to create tabs in UI for different statuses

**Query Example:**

```
GET /api/admin/businesses?search=cafe&status=active&autoApprove=true&page=1&limit=10
```

**Response:**

```json
{
  "businesses": [
    {
      "id": "uuid",
      "name": "Cafe XYZ",
      "email": "cafe@example.com",
      "phone": "+1234567890",
      "businessType": "small",
      "categories": ["food", "beverage"],
      "personName": "John Smith",
      "businessAddress": "123 Main St",
      "state": "NY",
      "autoApprovePromotions": true,
      "status": "active",
      "createdAt": "2026-01-12T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "pages": 5,
    "currentPage": 1,
    "limit": 10
  }
}
```

---

## 4. User Status Management

### Endpoint 1: `PUT /api/admin/users/:id/status` (NEW - RECOMMENDED)

Change user status to any of: `active`, `inactive`, `blocked`, `suspended`

**Request Body:**

```json
{
  "status": "blocked"
}
```

**Response:**

```json
{
  "message": "User status updated from active to blocked",
  "user": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "status": "blocked"
  }
}
```

### Endpoint 2: `PUT /api/admin/users/:id/block` (LEGACY - STILL SUPPORTED)

Toggle between `active` and `blocked` status (for backward compatibility)

---

## 5. Business Status Management

### Endpoint 1: `PUT /api/admin/businesses/:id/status` (NEW - RECOMMENDED)

Change business status to any of: `active`, `inactive`, `blocked`, `suspended`

**Request Body:**

```json
{
  "status": "blocked"
}
```

**Response:**

```json
{
  "message": "Business status updated from active to blocked",
  "business": {
    "id": "uuid",
    "name": "Cafe XYZ",
    "email": "cafe@example.com",
    "status": "blocked"
  }
}
```

### Endpoint 2: `PUT /api/admin/businesses/:id/block` (LEGACY - STILL SUPPORTED)

Toggle between `active` and `blocked` status (for backward compatibility)

---

## 6. Promotion List Management

### Endpoint: `GET /api/admin/promotions`

**Features:**

- **Pagination**: Supports `page` and `limit` query parameters (default: page=1, limit=10)
- **Search**: Search by business `name` or `email` using `search` parameter
- **Filter by Status**: Filter by `status` parameter (active, inactive, pending)
- **Business Auto-Approve Info**: Includes `businessAutoApprove` field for each promotion
- **Admin Can Change Status**: Use the promotion status endpoint to change promotion status

**Query Example:**

```
GET /api/admin/promotions?status=pending&search=cafe&page=1&limit=10
```

**Response:**

```json
{
  "promotions": [
    {
      "id": "uuid",
      "businessId": "uuid",
      "business": {
        "id": "uuid",
        "name": "Cafe XYZ",
        "email": "cafe@example.com",
        "businessType": "small",
        "autoApprovePromotions": true,
        "status": "active"
      },
      "category": "food",
      "status": "pending",
      "price": 99.99,
      "runDate": "2026-01-15",
      "stopDate": "2026-02-15",
      "imageUrl": "https://...",
      "views": 150,
      "clicks": 20,
      "businessAutoApprove": true,
      "createdAt": "2026-01-12T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 30,
    "pages": 3,
    "currentPage": 1,
    "limit": 10
  }
}
```

---

## 7. Promotion Status Change (Admin Approval/Rejection)

### Endpoint: `PUT /api/admin/promotions/:promotionId/status`

Admin can approve, reject, or deactivate promotions

**Request Body:**

```json
{
  "status": "active"
}
```

**Valid Status Values:**

- `"active"` - Approve the promotion (sets `approvedAt` timestamp)
- `"pending"` - Keep as pending review
- `"inactive"` - Reject or deactivate the promotion

**Response:**

```json
{
  "message": "Promotion status updated from pending to active",
  "promotion": {
    "id": "uuid",
    "businessId": "uuid",
    "status": "active",
    "approvedAt": "2026-01-12T10:30:00Z",
    "createdAt": "2026-01-12T10:00:00Z"
  }
}
```

---

## 8. Business Auto-Approve Toggle

### Endpoint: `PUT /api/admin/businesses/:businessId/toggle-auto-approve`

Enable or disable automatic promotion approval for a business

**Request Body:**

```json
{
  "autoApprovePromotions": true
}
```

**Response:**

```json
{
  "message": "Business auto-approve enabled",
  "business": {
    "id": "uuid",
    "name": "Cafe XYZ",
    "autoApprovePromotions": true
  }
}
```

---

## 9. Admin Dashboard

### Endpoint: `GET /api/admin/dashboard`

Comprehensive dashboard statistics for admin overview

**Features:**

- **User Statistics**: Total, active, blocked, suspended counts
- **Business Statistics**: Total, active, blocked, auto-approve enabled counts
- **Promotion Statistics**: Total, active, pending, inactive counts
- **Revenue Analytics**: Total revenue from active promotions
- **Engagement Metrics**: Total views, clicks, and click-through rate
- **Recent Activity**: Last 5 users and last 5 promotions

**Response:**

```json
{
  "users": {
    "total": 500,
    "active": 450,
    "blocked": 30,
    "suspended": 20
  },
  "businesses": {
    "total": 100,
    "active": 85,
    "blocked": 10,
    "withAutoApprove": 25
  },
  "promotions": {
    "total": 1000,
    "active": 750,
    "pending": 150,
    "inactive": 100
  },
  "revenue": {
    "total": 45000.0
  },
  "engagement": {
    "totalViews": 50000,
    "totalClicks": 5000,
    "clickThroughRate": "10.00"
  },
  "recentActivity": {
    "users": [
      {
        "id": "uuid",
        "fullName": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "status": "active",
        "createdAt": "2026-01-12T10:00:00Z"
      }
    ],
    "promotions": [
      {
        "id": "uuid",
        "businessId": "uuid",
        "business": {
          "id": "uuid",
          "name": "Cafe XYZ"
        },
        "status": "active",
        "price": 99.99,
        "createdAt": "2026-01-12T10:00:00Z",
        "views": 250,
        "clicks": 45
      }
    ]
  }
}
```

---

## 10. API Routes Summary

| Method | Endpoint                                                | Description                                |
| ------ | ------------------------------------------------------- | ------------------------------------------ |
| GET    | `/api/admin/dashboard`                                  | Get admin dashboard statistics             |
| GET    | `/api/admin/users`                                      | Get all users with filters/pagination      |
| PUT    | `/api/admin/users/:id/status`                           | Update user status                         |
| PUT    | `/api/admin/users/:id/block`                            | Toggle user block (legacy)                 |
| GET    | `/api/admin/businesses`                                 | Get all businesses with filters/pagination |
| PUT    | `/api/admin/businesses/:id/status`                      | Update business status                     |
| PUT    | `/api/admin/businesses/:id/block`                       | Toggle business block (legacy)             |
| PUT    | `/api/admin/businesses/:businessId/toggle-auto-approve` | Toggle business auto-approve               |
| GET    | `/api/admin/promotions`                                 | Get all promotions with filters/pagination |
| DELETE | `/api/admin/promotions/:id`                             | Delete promotion                           |
| PUT    | `/api/admin/promotions/:promotionId/status`             | Change promotion status                    |
| POST   | `/api/admin/templates/upload`                           | Upload templates                           |
| GET    | `/api/admin/templates`                                  | Get all templates                          |
| DELETE | `/api/admin/templates/:id`                              | Delete template                            |

---

## 11. Frontend Implementation Tips

### User Management Tab

```javascript
// Create tabs for different user statuses
const userTabs = ["all", "active", "inactive", "blocked", "suspended"];

// Filter users by clicking tabs
const fetchUsers = (status) => {
  const params = status !== "all" ? { status } : {};
  // Call GET /api/admin/users?status=...
};
```

### Business Management

```javascript
// Toggle business auto-approve from promotion list
const toggleAutoApprove = (businessId, currentValue) => {
  // Call PUT /api/admin/businesses/:businessId/toggle-auto-approve
  // with { autoApprovePromotions: !currentValue }
};

// Change business status
const updateBusinessStatus = (businessId, newStatus) => {
  // Call PUT /api/admin/businesses/:businessId/status
  // with { status: newStatus }
};
```

### Promotion Management

```javascript
// Approve/Reject/Deactivate promotion
const updatePromotionStatus = (promotionId, newStatus) => {
  // Call PUT /api/admin/promotions/:promotionId/status
  // with { status: newStatus }
  // Valid values: 'active', 'pending', 'inactive'
};
```

---

## 12. Database Migration Notes

If you already have existing data in your database:

- Existing `isBlocked: true` users should be migrated to `status: 'blocked'`
- Existing `isBlocked: false` users should be migrated to `status: 'active'`
- Create and run migrations accordingly

---

## Summary of Changes

✅ **User Model**: `isBlocked` → `status` enum
✅ **Business Model**: `isBlocked` → `status` enum
✅ **User List API**: Complete with search, filters, pagination, and tabs support
✅ **Business List API**: Complete with search, filters, pagination, and tabs support
✅ **Promotion List API**: Complete with business auto-approve info and status management
✅ **User Status Update**: New endpoint with proper status validation
✅ **Business Status Update**: New endpoint with proper status validation
✅ **Promotion Status Change**: Enhanced with approvedAt timestamp and validation
✅ **Admin Dashboard**: Comprehensive statistics, revenue, engagement metrics, and recent activity
✅ **Routes**: All new endpoints added to admin routes

All endpoints are ready for frontend integration!
