import express from 'express';

import * as controller from '@/api/location/location.controller';

const router = express.Router();

router.get('/suggest', controller.suggestAddresses);
router.get('/geocode', controller.geocode);
router.get('/reverse', controller.reverseGeocode);

export const locationRouter = router;
