
import { Router } from 'express';

// import agentRoutes from './agent.routes.js';
import finalTrialBalanceRoutes from './FinalTrialBalance.routes.js';
import userSettingsRoutes from './userSettings.routes.js';
import newPartyRoutes from './newParty.routes.js';
import selfIdRoutes from './selfId.routes.js';
import auth from './auth.routes.js';


const router = Router();

// router.use('/agent', agentRoutes);
router.use('/final-trial-balance', finalTrialBalanceRoutes);
router.use('/settings', userSettingsRoutes);
router.use('/new-party', newPartyRoutes);
router.use('/self-id', selfIdRoutes);
router.use('/authentication', auth);

export default router;
