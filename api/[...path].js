import '../backend-express/server.js';

export default async function handler(req, res) {
  // This will be handled by the Express app
  const app = (await import('../backend-express/server.js')).default;
  return app(req, res);
}
