import swaggerAutogen from 'swagger-autogen';

const outputFile = './swagger/output.json';

// Use a dedicated minimal entry file so swagger-autogen can trace route
// registrations without encountering database or file-system side effects.
const endpointsFiles = ['./swagger/entry.ts'];

const doc = {
  openapi: '3.0.0',
  info: {
    title: 'Tripdeck API',
    version: '1.0.0',
    description: 'REST API for the Tripdeck travel planning application.',
  },
  // Paths already include the /api prefix (set in entry.ts),
  // so the server URL points to the root.
  servers: [{ url: 'http://localhost:3001', description: 'Local' }],
};

swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc);
