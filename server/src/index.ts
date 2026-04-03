import express from 'express';

import apiRoutes from './routes';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(express.json());
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});
