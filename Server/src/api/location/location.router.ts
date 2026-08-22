import express from 'express';

import * as controller from '@/api/location/location.controller';

const router = express.Router();

router.get('/suggest', controller.suggestAddresses);

export const locationRouter = router;
