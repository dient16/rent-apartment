import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { stripe } from '@/services/stripe.service';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

export const paymentService = {
  async createPaymentIntent(amount: number, description: string, source: string) {
    const [err, paymentIntent] = await to(
      stripe.paymentIntents.create({
        amount: amount,
        currency: 'VND',
        description: description,
        source: source,
        automatic_payment_methods: { enabled: true },
      })
    );

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, err.message, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Payment intent created',
      paymentIntent.client_secret,
      StatusCodes.OK
    );
  },
};
