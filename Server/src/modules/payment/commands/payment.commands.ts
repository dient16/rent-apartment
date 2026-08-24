import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import type Stripe from 'stripe';

import { stripe } from '@/services/stripe.service';
import { logger } from '@/utils/logger';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

/** Write side: start a Stripe payment. The Stripe SDK is the data gateway here. */
export const paymentCommands = {
  async createPaymentIntent(amount: number, description: string) {
    // VND is a zero-decimal currency: Stripe rejects fractional amounts outright.
    const chargeable = Math.round(amount);
    if (!Number.isFinite(chargeable) || chargeable <= 0) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Invalid payment amount',
        null,
        StatusCodes.BAD_REQUEST
      );
    }

    const [err, paymentIntent] = await to(
      stripe.paymentIntents.create({
        amount: chargeable,
        currency: 'VND',
        description: description,
        automatic_payment_methods: { enabled: true },
      })
    );

    if (err) {
      const stripeError = err as Stripe.errors.StripeError;
      // Stripe's message embeds the API key it tried to use, so it must never be
      // forwarded to the browser — log it here and answer with something generic.
      logger.error(
        {
          err,
          stripeType: stripeError.type,
          stripeCode: stripeError.code,
          amount: chargeable,
        },
        'Stripe payment intent failed'
      );

      const isConfigError =
        stripeError.type === 'StripeAuthenticationError' || stripeError.type === 'StripePermissionError';

      return new ServiceResponse(
        ResponseStatus.Failed,
        isConfigError
          ? 'Payment is temporarily unavailable, please try again later'
          : 'Could not start the payment, please check the details and try again',
        null,
        isConfigError ? StatusCodes.SERVICE_UNAVAILABLE : StatusCodes.BAD_REQUEST
      );
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Payment intent created',
      paymentIntent.client_secret,
      StatusCodes.OK
    );
  },
};
