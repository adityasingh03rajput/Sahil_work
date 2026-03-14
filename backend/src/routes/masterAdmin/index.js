import { Router } from 'express';
import { masterAdminAuthRouter } from './auth.js';
import { masterAdminSubscribersRouter } from './subscribers.js';
import { masterAdminSubscriberDetailsRouter } from './subscriberDetails.js';
import { masterAdminPlansRouter } from './plans.js';
import { masterAdminLicensesRouter } from './licenses.js';
import { masterAdminLicenseKeysRouter } from './licenseKeys.js';
import { masterAdminDashboardRouter } from './dashboard.js';
import { masterAdminAuditRouter } from './audit.js';
import { masterAdminUsersRouter } from './users.js';
import { masterAdminDataRouter } from './data.js';

export const masterAdminRouter = Router();

masterAdminRouter.use('/auth', masterAdminAuthRouter);
masterAdminRouter.use('/subscribers', masterAdminSubscribersRouter);
masterAdminRouter.use('/subscribers', masterAdminSubscriberDetailsRouter);
masterAdminRouter.use('/plans', masterAdminPlansRouter);
masterAdminRouter.use('/licenses', masterAdminLicensesRouter);
masterAdminRouter.use('/license-keys', masterAdminLicenseKeysRouter);
masterAdminRouter.use('/dashboard', masterAdminDashboardRouter);
masterAdminRouter.use('/audit', masterAdminAuditRouter);
masterAdminRouter.use('/users', masterAdminUsersRouter);
masterAdminRouter.use('/data', masterAdminDataRouter);
