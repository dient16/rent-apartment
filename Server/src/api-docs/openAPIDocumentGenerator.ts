import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { env } from '@/config/env.config';
import { amenityRegistry } from '@/modules/amenity/amenity.router';
import { apartmentRegistry } from '@/modules/apartment/apartment.router';
import { authRegistry } from '@/modules/auth/auth.router';
import { bookingRegistry } from '@/modules/booking/booking.router';
import { healthRegistry } from '@/modules/health/health.router';
import { imageRegistry } from '@/modules/image/image.router';
import { locationRegistry } from '@/modules/location/location.router';
import { messageRegistry } from '@/modules/message/message.router';
import { notificationRegistry } from '@/modules/notification/notification.router';
import { paymentRegistry } from '@/modules/payment/payment.router';
import { pricingRegistry } from '@/modules/pricing/pricing.router';
import { reviewRegistry } from '@/modules/review/review.router';
import { roomRegistry } from '@/modules/room/room.router';
import { userRegistry } from '@/modules/user/user.router';

/** Tag order here is the order the groups appear in Swagger UI. */
export const API_TAGS = [
  { name: 'Health Check', description: 'Liveness probe' },
  { name: 'Auth', description: 'Register, login, OAuth (Google / Facebook) and token lifecycle' },
  { name: 'User', description: 'Current user profile and favorites' },
  { name: 'Apartment', description: 'Apartments (listings), search and host management' },
  { name: 'Room', description: 'Rooms belonging to an apartment' },
  { name: 'Amenity', description: 'Room amenities (admin managed)' },
  { name: 'Pricing', description: 'Per-date room price overrides' },
  { name: 'Booking', description: 'Guest bookings and host booking management' },
  { name: 'Payment', description: 'Stripe payment intents' },
  { name: 'Review', description: 'Apartment reviews and ratings' },
  { name: 'Message', description: 'Guest / host conversations' },
  { name: 'Notification', description: 'In-app notifications' },
  { name: 'Image', description: 'Image upload and download (GridFS)' },
  { name: 'Location', description: 'Address suggestion and geocoding (OpenStreetMap)' },
];

const DESCRIPTION = `REST API for the Rent Apartment platform: apartments, rooms, bookings, payments, reviews and messaging.

### Response envelope
Every JSON response uses the same shape:

\`\`\`json
{ "success": true, "message": "...", "data": { ... }, "statusCode": 200 }
\`\`\`

On failure \`success\` is \`false\`, \`data\` is omitted and \`message\` explains the error.

### Authentication
Protected routes require an access token from **POST /api/auth/login**, sent as \`Authorization: Bearer <token>\`.
The refresh token is set as an \`httpOnly\` cookie and used by **POST /api/auth/refresh-token** and **GET /api/auth/logout**.
Routes marked with an open padlock are public.

### Images
Image fields hold a GridFS filename; fetch the file from **GET /api/image/{filename}**.`;

export function generateOpenAPIDocument() {
  const registry = new OpenAPIRegistry([
    healthRegistry,
    authRegistry,
    userRegistry,
    apartmentRegistry,
    roomRegistry,
    amenityRegistry,
    pricingRegistry,
    bookingRegistry,
    paymentRegistry,
    reviewRegistry,
    messageRegistry,
    notificationRegistry,
    imageRegistry,
    locationRegistry,
  ]);

  registry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Access token returned by `POST /api/auth/login`.',
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);

  const localUrl = `http://localhost:${env.PORT}`;
  const servers = [{ url: env.SERVER_URL, description: 'Configured server (SERVER_URL)' }];
  if (env.SERVER_URL !== localUrl) servers.push({ url: localUrl, description: 'Local development' });

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      version: '1.0.0',
      title: 'Rent Apartment API',
      description: DESCRIPTION,
    },
    servers,
    tags: API_TAGS,
    externalDocs: {
      description: 'Raw OpenAPI specification (JSON)',
      url: '/api-docs/swagger.json',
    },
    security: [{ BearerAuth: [] }],
  });
}
