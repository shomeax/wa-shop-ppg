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
    const URL_SUCCESS = 'success';
    const URL_DECLINE = 'decline';
    const URL_FAIL = 'fail';
    const URL_CHECKOUT = 'checkout';
    /**
     *
     *
     * Merchant identity alias
     * @var int
     */
    protected $merchant_id;
    protected $app_id;

    final function __construct()
    {
        $this->init();
    }

    protected function init()
    {
        if (!$this->app_id) {
            $this->app_id = wa()->getApp();
        }
        $this->merchant_id =& $this->key;
    }

    /**
     *
     * @return string
     */
    final public function getAppId()
    {
        return $this->app_id;
    }

    /**
     *
     * @param $plugin_id string
     * @param $key string
     * @return array
     */
    abstract public function getSettings($plugin_id, $key);

    /**
     *
     * @param $plugin_id string
     * @param $key string
     * @param $settings array key-value
     * @return array
     */
    abstract public function setSettings($plugin_id, $key, $settings);

    /**
     *
     * Callback method handler for plugin
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
     * @return string
     */
    final public function getMerchantId()
    {
        return $this->getPluginKey();
    }

    /**
     *
     * Get application page for transaction result
     * @param string $type
     * @param array $transaction_data formalized transaction data
     */
    public function getBackUrl($type = self::URL_SUCCESS, $transaction_data = array())
    {
        return false;
    }

    /**
     * Execute specified transaction by payment module on $request data
     *
     * @example waPayment::execTransaction(waPayment::TRANSACTION_CAPTURE,'AuthorizeNet',$adapter,$params)
     * @param $transaction
     * @param $module_id
     * @param $merchant_id
     * @param $params
     * @return mixed
     */
    public function execTransaction($transaction, $module_id, $merchant_id, $params)
    {
        $plugin = waPayment::factory($module_id, $merchant_id, $this);
        return call_user_func_array(array($plugin, $transaction), $params);
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
    abstract public function callbackDeclineHandler($wa_transaction_data);

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
