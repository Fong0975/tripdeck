import express from 'express';

import appRoutes from '../src/routes/appRoutes';
import checklistTemplateRoutes from '../src/routes/checklistTemplateRoutes';
import tripRoutes from '../src/routes/tripRoutes';

// Minimal app used only by swagger-autogen to trace route registrations.
// checklistTripRoutes is already mounted inside tripRoutes (/:tripId/checklist),
// so it is picked up automatically when tripRoutes is traced.
const app = express();
app.use('/api', appRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/checklist-template', checklistTemplateRoutes);

export default app;
