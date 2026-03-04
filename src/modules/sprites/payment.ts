import { RuntimeContext } from '../../engine/composition.ts';

/**
 * $payment Sprite — Payment Request API wrapper
 * 
 * Provides declarative access to the Payment Request API for
 * processing payments through secure browser-native UI.
 *
 * Usage:
 *   $payment.request(methodData, details, [options])   — show payment UI
 *   $payment.canMakePayment(methodData)                — check availability
 */

export default function paymentFactory(runtime: RuntimeContext) {
  return {
    $payment: {
      /**
       * Check if the user can make a payment with the given methods.
       * Returns reactive { data: boolean, status, error }.
       */
      canMakePayment(methodData: PaymentMethodData[]) {
        const op = runtime.reactive<{ data: boolean; status: string; error: string | null }>({
          data: false, status: 'loading', error: null
        });

        if (typeof PaymentRequest === 'undefined') {
          op.error = 'Payment Request API not supported';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const request = new PaymentRequest(methodData, {
              total: { label: 'Check', amount: { currency: 'USD', value: '0.00' } }
            });
            op.data = await request.canMakePayment();
            op.status = 'ready';
          } catch (e) {
            op.error = e instanceof Error ? e.message : String(e);
            op.status = 'error';
          }
        })();

        return op;
      },

      /**
       * Show the payment UI and process a payment.
       * Returns reactive { data: PaymentResponse | null, status, error }.
       */
      request(
        methodData: PaymentMethodData[],
        details: PaymentDetailsInit,
        options?: PaymentOptions
      ) {
        const op = runtime.reactive<{ data: unknown; status: string; error: string | null }>({
          data: null, status: 'pending', error: null
        });

        if (typeof PaymentRequest === 'undefined') {
          op.error = 'Payment Request API not supported';
          op.status = 'error';
          return op;
        }

        (async () => {
          try {
            const request = new PaymentRequest(methodData, details, options);
            const response = await request.show();

            op.data = {
              methodName: response.methodName,
              details: response.details,
              payerName: response.payerName,
              payerEmail: response.payerEmail,
              payerPhone: response.payerPhone,
              shippingAddress: response.shippingAddress,
              shippingOption: response.shippingOption,
              complete: (result?: PaymentComplete) => response.complete(result || 'success')
            };
            op.status = 'done';
          } catch (e) {
            // User closed the payment UI or an error occurred
            op.error = e instanceof Error ? e.message : String(e);
            op.status = e instanceof Error && e.name === 'AbortError' ? 'cancelled' : 'error';
          }
        })();

        return op;
      }
    }
  };
}
