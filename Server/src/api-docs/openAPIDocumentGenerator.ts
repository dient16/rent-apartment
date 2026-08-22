import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { amenityRegistry } from '@/api/amenity/amenity.router';
import { apartmentRegistry } from '@/api/apartment/apartment.router';
import { authRegistry } from '@/api/auth/auth.router';
import { bookingRegistry } from '@/api/booking/booking.router';
import { healthRegistry } from '@/api/health/health.router';
import { imageRegistry } from '@/api/image/image.router';
import { roomRegistry } from '@/api/room/room.router';
import { userRegistry } from '@/api/user/user.router';

export function generateOpenAPIDocument() {
  const registry = new OpenAPIRegistry([
    healthRegistry,
    userRegistry,
    authRegistry,
    apartmentRegistry,
    amenityRegistry,
    bookingRegistry,
    imageRegistry,
    roomRegistry,
  ]);

  registry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'Swagger API',
    },
    externalDocs: {
      description: 'View the raw OpenAPI Specification in JSON format',
      url: '/swagger.json',
    },
    security: [{ BearerAuth: [] }],
  });
}
