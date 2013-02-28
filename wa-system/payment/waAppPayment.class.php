<?php

/*
 * This file is part of Webasyst framework.
 *
 * Licensed under the terms of the GNU Lesser General Public License (LGPL).
 * http://www.webasyst.com/framework/license/
 *
 * @link http://www.webasyst.com/
 * @author Webasyst LLC
 * @copyright 2011 Webasyst LLC
 * @package wa-system
 * @subpackage payment
 */
abstract class waAppPayment
{
    protected $merchant_id;
    protected $app_id;

    function __construct($merchant_id)
    {
        $this->merchant_id = $merchant_id;
    }

    /**
     *
     * @return array['order_id']string
     * @return array['customer_id']string
     * @return array['amount']float
     * @return array['currency']string
     *
     * @return array['items']array
     * @return array['items'][]['id']string
     * @return array['items'][]['name']string
     * @return array['items'][]['description']string
     * @return array['items'][]['price']float
     * @return array['items'][]['quantity']int
     * @return array['items'][]['total']float
     *
     * @return array['discount']['price']string
     */
    abstract public function getOrderData();

    /**
     *
     * @param $payment_id string
     * @param $merchant_key string
     * @return array
     */
    abstract public function getMerchantData($payment_id, $merchant_key);

    /**
     *
     * @return string
     */
    final public function getMerchantId()
    {
        return $this->merchant_id;
    }

    /**
     *
     * @return string
     */
    final public function getAppId()
    {
        return $this->app_id;
    }

    public function execTransaction($transaction, $module_id, $params)
    {
        return waPayment::execTransaction($transaction, $module_id, $this, $params);
    }

    /**
     *
     * Callback handler for waPayment
     * @param string $method one of Confirmation, Payment
     */
    public final function execCallbackHandler($method)
    {
        $args = func_get_args();
        array_shift($args);
        $method_name = "callback".ucfirst($method)."Handler";
        if (!method_exists($this, $method_name)) {
            throw new waException('Unsupported callback handler method '.$method);
        }
        return call_user_func_array(array($this, $method_name), $args);
    }

    /**
     *
     *
     * @param array $wa_transaction_data
     * @return array|null
     */
    abstract public function callbackPaymentHandler($wa_transaction_data);

    /**
     *
     *
     * @param array $wa_transaction_data
     * @return array|null
     */
    abstract public function callbackCancelHandler($wa_transaction_data);

    /**
     *
     *
     * @param array $wa_transaction_data
     * @return array|null
     */
    abstract public function callbackRefundHandler($wa_transaction_data);

    /**
     *
     *
     * @param array $wa_transaction_data
     * @return array|null
     */
    abstract public function callbackCaptureHandler($wa_transaction_data);

    /**
     *
     *
     * @param array $wa_transaction_data
     * @return array|null
     */
    abstract public function callbackChargebackHandler($wa_transaction_data);

    /**
     *
     *
     * @param array $wa_transaction_data
     * @return array|null
     */
    abstract public function callbackConfirmationHandler($wa_transaction_data);
}
