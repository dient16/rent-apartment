import { writeFileSync } from 'node:fs';
import { generateOpenAPIDocument } from '@/api-docs/openAPIDocumentGenerator';
const doc = generateOpenAPIDocument();
writeFileSync(process.argv[2] ?? 'openapi.json', JSON.stringify(doc, null, 2));
console.log(
  'paths:',
  Object.keys(doc.paths ?? {}).length,
  'schemas:',
  Object.keys(doc.components?.schemas ?? {}).length
);
process.exit(0);
