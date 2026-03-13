import { Router } from 'express';
import { masterAdminAuthRouter } from './auth.js';
import { masterAdminTenantsRouter } from './tenants.js';
import { masterAdminPlansRouter } from './plans.js';
import { masterAdminLicensesRouter } from './licenses.js';
import { masterAdminDashboardRouter } from './dashboard.js';
import { masterAdminAuditRouter } from './audit.js';
import { masterAdminUsersRouter } from './users.js';
import { masterAdminDataRouter } from './data.js';

export const masterAdminRouter = Router();

masterAdminRouter.use('/auth', masterAdminAuthRouter);
masterAdminRouter.use('/tenants', masterAdminTenantsRouter);
masterAdminRouter.use('/plans', masterAdminPlansRouter);
masterAdminRouter.use('/licenses', masterAdminLicensesRouter);
masterAdminRouter.use('/dashboard', masterAdminDashboardRouter);
masterAdminRouter.use('/audit', masterAdminAuditRouter);
masterAdminRouter.use('/users', masterAdminUsersRouter);
masterAdminRouter.use('/data', masterAdminDataRouter);
