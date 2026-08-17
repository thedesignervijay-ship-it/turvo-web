import { config } from '../config.js';

/**
 * OpenAPI 3.0 specification for /api/v1 (spec section 43).
 * Mirrors the routes registered in src/app.ts exactly.
 */

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Turvo Phase 1 API',
    description: 'REST API for the Turvo turf booking management platform (Phase 1).',
    version: '1.0.0',
  },
  servers: [{ url: `${config.supabaseUrl.replace(/\/auth.*/, '') || 'http://localhost:4000'}` }],
  tags: [
    { name: 'Auth', description: 'Authentication and current user.' },
    { name: 'Owners', description: 'Owner profile and admin owner management.' },
    { name: 'Turfs', description: 'Turf lifecycle, images, courts, availability, hours and pricing.' },
    { name: 'Master Data', description: 'Master data items and turf master items.' },
    { name: 'Bookings', description: 'Booking lifecycle and owner dashboard.' },
    { name: 'Notifications', description: 'In-app notifications.' },
    { name: 'Reports', description: 'Earnings, summary and export reports.' },
    { name: 'Admin', description: 'Admin-only audit logs and platform settings.' },
    { name: 'Health', description: 'Health checks.' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: { '200': { description: 'Service is healthy.' } },
      },
    },
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check (versioned)',
        security: [],
        responses: { '200': { description: 'Service is healthy.' } },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a turf owner (public)',
        security: [],
        responses: { '201': { description: 'Owner registered.' }, '409': { description: 'Email already registered.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current user and permissions',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Current user.' }, '401': { description: 'Unauthorized.' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out the current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Logged out.' } },
      },
    },

    '/profile': {
      get: {
        tags: ['Owners'],
        summary: 'Get the current user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile.' }, '404': { description: 'Not an owner.' } },
      },
      patch: {
        tags: ['Owners'],
        summary: 'Update the current user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile updated.' }, '422': { description: 'Validation error.' } },
      },
    },

    '/owners': {
      get: {
        tags: ['Owners'],
        summary: 'List turf owners (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Owner list.' }, '403': { description: 'Forbidden for owners.' } },
      },
    },
    '/owners/{ownerId}': {
      get: {
        tags: ['Owners'],
        summary: 'Get an owner by id (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Owner.' }, '404': { description: 'Owner not found.' } },
      },
      patch: {
        tags: ['Owners'],
        summary: 'Update an owner business profile (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Owner updated.' } },
      },
    },
    '/owners/{ownerId}/status': {
      patch: {
        tags: ['Owners'],
        summary: 'Activate or deactivate an owner (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Owner status updated.' } },
      },
    },

    '/turfs': {
      get: {
        tags: ['Turfs'],
        summary: 'List turfs (owner: own turfs; admin: all with filters)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf list.' } },
      },
      post: {
        tags: ['Turfs'],
        summary: 'Create a turf',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Turf created.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/turfs/{turfId}': {
      get: {
        tags: ['Turfs'],
        summary: 'Get a turf by id',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf.' }, '404': { description: 'Turf not found.' } },
      },
      patch: {
        tags: ['Turfs'],
        summary: 'Update a DRAFT or REJECTED turf',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf updated.' }, '409': { description: 'Turf not editable.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/turfs/{turfId}/submit': {
      post: {
        tags: ['Turfs'],
        summary: 'Submit a turf for admin review',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf submitted.' }, '400': { description: 'Incomplete turf (no court or hours).' } },
      },
    },
    '/turfs/{turfId}/approve': {
      post: {
        tags: ['Turfs'],
        summary: 'Approve a submitted turf (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf approved.' }, '403': { description: 'Forbidden for owners.' } },
      },
    },
    '/turfs/{turfId}/reject': {
      post: {
        tags: ['Turfs'],
        summary: 'Reject a submitted turf with a reason (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf rejected.' }, '403': { description: 'Forbidden for owners.' } },
      },
    },
    '/turfs/{turfId}/status': {
      patch: {
        tags: ['Turfs'],
        summary: 'Activate or deactivate an approved turf (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf status updated.' }, '403': { description: 'Forbidden for owners.' } },
      },
    },

    '/turfs/{turfId}/images': {
      get: {
        tags: ['Turfs'],
        summary: 'List turf images',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Image list.' } },
      },
      post: {
        tags: ['Turfs'],
        summary: 'Upload a turf image',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Image uploaded.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/turfs/{turfId}/images/order': {
      put: {
        tags: ['Turfs'],
        summary: 'Reorder turf images',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Image order updated.' } },
      },
    },
    '/turfs/{turfId}/images/{imageId}': {
      delete: {
        tags: ['Turfs'],
        summary: 'Delete a turf image',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Image deleted.' }, '404': { description: 'Image not found.' } },
      },
    },

    '/master-data/categories': {
      get: {
        tags: ['Master Data'],
        summary: 'List master data categories',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Category list.' } },
      },
    },
    '/master-data/items': {
      get: {
        tags: ['Master Data'],
        summary: 'List master data items (filtered by category/status)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Master data list.' } },
      },
      post: {
        tags: ['Master Data'],
        summary: 'Create a master data item (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Item created.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/master-data/items/{itemId}': {
      patch: {
        tags: ['Master Data'],
        summary: 'Update a master data item (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Item updated.' } },
      },
    },
    '/master-data/items/{itemId}/status': {
      patch: {
        tags: ['Master Data'],
        summary: 'Activate or deactivate a master data item (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Item status updated.' } },
      },
    },
    '/turfs/{turfId}/master-items': {
      get: {
        tags: ['Master Data'],
        summary: 'List active master items for a turf',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf master items.' } },
      },
      put: {
        tags: ['Master Data'],
        summary: 'Replace the turf master items (facilities/rules/equipment)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf master items replaced.' } },
      },
    },

    '/turfs/{turfId}/courts': {
      get: {
        tags: ['Turfs'],
        summary: 'List courts for a turf',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Court list.' } },
      },
      post: {
        tags: ['Turfs'],
        summary: 'Create a court for a turf',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Court created.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/courts/{courtId}': {
      patch: {
        tags: ['Turfs'],
        summary: 'Update a court',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Court updated.' } },
      },
    },
    '/courts/{courtId}/status': {
      patch: {
        tags: ['Turfs'],
        summary: 'Activate or deactivate a court',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Court status updated.' } },
      },
    },

    '/turfs/{turfId}/availability': {
      get: {
        tags: ['Turfs'],
        summary: 'Get availability for a turf (operating hours and blocks)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Availability data.' } },
      },
    },
    '/turfs/{turfId}/operating-hours': {
      put: {
        tags: ['Turfs'],
        summary: 'Replace operating hours (7 days) for a turf',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Operating hours replaced.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/turfs/{turfId}/availability-blocks': {
      post: {
        tags: ['Turfs'],
        summary: 'Create an availability block',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Block created.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/availability-blocks/{blockId}': {
      delete: {
        tags: ['Turfs'],
        summary: 'Delete an availability block',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Block deleted.' }, '404': { description: 'Block not found.' } },
      },
    },

    '/turfs/{turfId}/pricing': {
      get: {
        tags: ['Turfs'],
        summary: 'List pricing rules for a turf',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Pricing rules list.' } },
      },
      post: {
        tags: ['Turfs'],
        summary: 'Create a pricing rule',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Rule created.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/pricing/{ruleId}': {
      patch: {
        tags: ['Turfs'],
        summary: 'Update a pricing rule',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Rule updated.' } },
      },
    },
    '/pricing/{ruleId}/status': {
      patch: {
        tags: ['Turfs'],
        summary: 'Activate or deactivate a pricing rule',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Rule status updated.' } },
      },
    },

    '/bookings': {
      get: {
        tags: ['Bookings'],
        summary: 'List bookings with filters (status, court, turf, date range)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Booking list.' } },
      },
      post: {
        tags: ['Bookings'],
        summary: 'Create a manual booking (phone/in-person)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Booking created.' }, '409': { description: 'Conflict (double booking / overlap).' }, '422': { description: 'Validation error.' } },
      },
    },
    '/bookings/dashboard': {
      get: {
        tags: ['Bookings'],
        summary: 'Owner dashboard counts (today, month, completed, cancelled)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Dashboard counts.' } },
      },
    },
    '/bookings/{bookingId}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get a booking by id',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Booking.' }, '404': { description: 'Booking not found.' } },
      },
    },
    '/bookings/{bookingId}/cancel': {
      post: {
        tags: ['Bookings'],
        summary: 'Cancel a booking with a reason',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Booking cancelled.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/bookings/{bookingId}/complete': {
      post: {
        tags: ['Bookings'],
        summary: 'Mark a confirmed booking complete',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Booking completed.' }, '422': { description: 'Validation error.' } },
      },
    },

    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications for the current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notification list.' } },
      },
    },
    '/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Count unread notifications',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Unread count.' } },
      },
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications read',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'All marked read.' } },
      },
    },
    '/notifications/{notificationId}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark one notification read',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notification marked read.' }, '404': { description: 'Notification not found.' } },
      },
    },

    '/reports/booking-report': {
      get: {
        tags: ['Reports'],
        summary: 'Booking report (date range, status, source, owner filters)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Booking report.' } },
      },
    },
    '/reports/booking-report/export': {
      get: {
        tags: ['Reports'],
        summary: 'Export the booking report as CSV',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'CSV file download.' } },
      },
    },
    '/reports/earnings-summary': {
      get: {
        tags: ['Reports'],
        summary: 'Earnings summary (total, today, month, completed, cancelled)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Earnings summary.' } },
      },
    },
    '/reports/daily-summary': {
      get: {
        tags: ['Reports'],
        summary: 'Daily booking value summary',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Daily summary.' } },
      },
    },
    '/reports/cancellations': {
      get: {
        tags: ['Reports'],
        summary: 'Cancellation report with reason breakdown',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Cancellation report.' } },
      },
    },
    '/reports/owner-report': {
      get: {
        tags: ['Reports'],
        summary: 'Per-owner bookings report (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Owner report.' }, '403': { description: 'Forbidden for owners.' } },
      },
    },
    '/reports/turf-report': {
      get: {
        tags: ['Reports'],
        summary: 'Per-turf bookings report (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Turf report.' }, '403': { description: 'Forbidden for owners.' } },
      },
    },

    '/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'List audit log entries (admin, paginated and filterable)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Audit log list.' }, '403': { description: 'Forbidden for owners.' } },
      },
    },
    '/settings': {
      get: {
        tags: ['Admin'],
        summary: 'List platform settings (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Platform settings.' }, '403': { description: 'Forbidden for owners.' } },
      },
      patch: {
        tags: ['Admin'],
        summary: 'Create or update multiple settings (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Settings updated.' }, '403': { description: 'Forbidden for owners.' }, '422': { description: 'Validation error.' } },
      },
    },
    '/settings/{key}': {
      patch: {
        tags: ['Admin'],
        summary: 'Create or update a single setting (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Setting updated.' }, '403': { description: 'Forbidden for owners.' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
} as const;
