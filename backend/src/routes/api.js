import { Router } from 'express';
import verifyPasskey from '../controllers/authController.js';
import { getLocations } from '../controllers/locationController.js';
import { getRoster, getStats, searchMembers } from '../controllers/searchController.js';

const router = Router();

router.post('/auth/verify', verifyPasskey);
router.get('/locations', getLocations);
router.get('/search', searchMembers);
router.get('/roster/:hhid', getRoster);
router.get('/stats', getStats);

export default router;
