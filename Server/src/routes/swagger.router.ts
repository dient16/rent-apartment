import type { Request, Response, Router } from 'express';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { generateOpenAPIDocument } from '@/api-docs/openAPIDocumentGenerator';

export const swaggerRouter: Router = (() => {
  const router = express.Router();
  const openAPIDocument = generateOpenAPIDocument();

  router.get('/swagger.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openAPIDocument);
  });

  router.use(
    '/',
    swaggerUi.serve,
    swaggerUi.setup(openAPIDocument, {
      customSiteTitle: 'Rent Apartment API',
      swaggerOptions: {
        // Keep the Bearer token across page reloads while testing.
        persistAuthorization: true,
        // Group by tag in the order declared, collapse everything by default.
        docExpansion: 'none',
        tagsSorter: 'none',
        operationsSorter: 'alpha',
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: false,
        // Needed for the refresh-token cookie to be sent on "Try it out".
        withCredentials: true,
      },
    })
  );

  return router;
})();
