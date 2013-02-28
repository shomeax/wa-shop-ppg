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
abstract class waPayment extends waSystemPlugin
{
    const TRANSACTION_CONFIRM = 'confirm';
    const TRANSACTION_AUTH = 'auth';
    const TRANSACTION_REFUND = 'refund';
    const TRANSACTION_CAPTURE = 'capture';
    const TRANSACTION_CANCEL = 'cancel';
    const TRANSACTION_PAYMENT = 'payment';

    /**
     *
     * Обработка оплаты
     * @var string
     */
    const CALLBACK_PAYMENT = 'payment';
    /**
     *
     * Обработка возврата
     * @var string
     */
    const CALLBACK_REFUND = 'refund';
    /**
     *
     * Валидация оплаты
     * @var string
     */
    const CALLBACK_CONFIRMATION = 'confirmation';
    /**
     *
     * Обработка подтверждения
     * @var string
     */
    const CALLBACK_CAPTURE = 'capture';
    /**
     *
     * Обработка отмены
     * @var string
     */
    const CALLBACK_CANCEL = 'cancel';
    /**
     *
     * Обработка отказа
     * @var string
     */
    const CALLBACK_CHARGEBACK = 'chargeback';

    /**
     * Operation types
     */

    /**
     *
     * Авторизация с подтверждением
     * @var string
     */
    const OPERATION_AUTH_CAPTURE = 'AUTH+CAPTURE';
    /**
     *
     * Только авторизация без подтверждения
     * @var string
     */
    const OPERATION_AUTH_ONLY = 'AUTH_ONLY';
    /**
     *
     * Подтверждение авторизованной транзакции
     * @var string
     */
    const OPERATION_CAPTURE = 'CAPTURE';
    /**
     *
     * Возврат подтвержденной транзакции
     * @var string
     */
    const OPERATION_REFUND = 'REFUND';

    /**
     *
     * Отмена неподтвержденной транзакции
     * @var string
     */
    const OPERATION_CANCEL = 'CANCEL';
    /**
     *
     * Проверка статуса оплаты по номеру заказа
     * @var string
     */
    const OPERATION_CHECK = 'CHECK';
    /**
     *
     * Прием платежных данных на текущем сервере
     * @var string
     */
    const OPERATION_INTERNAL_PAYMENT = 'INTERNAL_PAYMENT';

    /**
     *
     * Оформление заказа и оплата на стороне платежной системы
     * PayPal Express Checkout, Google Checkout
     * @todo try use HOSTED_ORDER
     * @var string
     */
    const OPERATION_HOSTED_PAYMENT_PRIOR_ORDER = 'HOSTED_PAYMENT_PRIOR_ORDER';

    /**
     *
     * Оплата заказа на стороне платежной системы
     * @todo try use HOSTED_PAYMENT
     * @var string
     */
    const OPERATION_HOSTED_PAYMENT_AFTER_ORDER = 'HOSTED_PAYMENT_AFTER_ORDER';

    const STATE_CAPTURED = 'CAPTURED';
    const STATE_AUTH = 'AUTH';
    const STATE_REFUNDED = 'REFUNDED';
    const STATE_PARTIAL_REFUNDED = 'PARTIAL_REFUNDED';
    const STATE_DECLINED = 'DECLINED';
    const STATE_VERIFIED = 'VERIFIED';

    const TYPE_CARD = 'card';
    const TYPE_ONLINE = 'online';
    const TYPE_MANUAL = 'manual';
    const TYPE_OBSOLETE = 'obsolete';

    const PLUGIN_TYPE = 'payment';

    private static $module_pool = array();
    private static $init = false;
    protected $app_id;
    protected $properties;

    /**
     *
     * @var waAppPayment
     */
    protected $app_adapter;

    /**
     *
     * Alias to plugin instance key
     * @var int
     */
    protected $merchant_id;

    /**
     *
     * Get payment plugin instance
     * @param string $id
     * @param waiPluginSettings $adapter optional
     * @param int $merchant_id Merchant key
     * @return waPayment
     */
    public static function factory($id, $adapter = null, $merchant_id = null, $type = null)
    {
        return parent::factory($id, $adapter, $merchant_id, self::PLUGIN_TYPE);
    }

    /**
     * Enumerate available payment plugins
     * @param $options array
     * @return array
     */
    final public static function enumerate($options = array(), $type = null)
    {
        return parent::enumerate($options, self::PLUGIN_TYPE);
    }

    /**
     *
     * Get plugin description
     * @param string $id
     * @return array[string]string
     * @return array['name']string
     * @return array['description']string
     * @return array['version']string
     * @return array['build']string
     * @return array['logo']string
     * @return array['icon'][int]string
     * @return array['img']string
     */
    final public static function info($id, $options = array(), $type = null)
    {
        return parent::info($id, $options, self::PLUGIN_TYPE);
    }

    protected function init()
    {
        $this->merchant_id =& $this->key;
        if (!$this->app_id) {
            $this->app_id = wa()->getApp();
        }
    }

    /**
     *
     * @return string|string[] ISO3 currency code
     */
    public function allowedCurrency()
    {
        return array();
    }

    /**
     * Execute specified transaction by payment module on $request data
     *
     * @example waPayment::execTransaction(waPayment::TRANSACTION_CAPTURE,'AuthorizeNet',$adapter,$params)
     * @param $transaction
     * @param $module_id
     * @param $adapter
     * @param $params
     * @return unknown_type
     */
    public static function execTransaction($transaction, $module_id, $adapter, $params)
    {
        $instance = self::factory($module_id);

        $transaction_method = $transaction;
        $transactions = array(
            self::TRANSACTION_CONFIRM,
            self::TRANSACTION_AUTH,
            self::TRANSACTION_REFUND,
            self::TRANSACTION_CAPTURE,
            self::TRANSACTION_CANCEL,
            self::TRANSACTION_PAYMENT,
        );
        if (!in_array($transaction_method, $transactions)) {
            throw new waException(sprintf('Unsupported transaction %s at %s', $transaction, get_class($instance)));
        }
        return $instance->transactionInit($adapter)->$transaction_method($params);
    }

    //Callback

    final public static function callback($module_id, $request = array())
    {
        self::log($module_id, $request);
        try {
            return self::factory($module_id)->callbackRoute($request)->callbackHandler($request);
        } catch (Exception $ex) {
            return array(
                'error' => $ex->getMessage(),
            );
        }
    }

    /**
     *
     * Determine target application and merchant key
     * @param array $request
     */
    protected function callbackRoute($request)
    {
        if (!$this->app_adapter) {
            if ($this->app_id && $this->merchant_id) {
                $this->app_adapter = self::getAdapter($this->app_id, $this->merchant_id);
            }
        }
        if (!$this->app_adapter || !($this->app_adapter instanceof waAppPayment)) {
            $this->app_adapter = false;
            $this->app_id = null;
            $this->merchant_id = null;
        } else {
            if (empty($this->merchant_id)) {
                $this->merchant_id = $this->app_adapter->getMerchantId();
            }
            if (empty($this->app_id)) {
                $this->app_id = $this->app_adapter->getAppId();
            }
        }
        if ($this->merchant_id && $this->app_id && $this->app_adapter) {
            $this->setSettings($this->app_adapter->getMerchantData($this->id, $this->merchant_id));
        }
        return $this;
    }

    /**
     *
     * @param $request array
     * @return void
     */
    protected function callbackHandler($request)
    {
        ;
    }

    /**
     *
     * Enter description here ...
     * @param unknown_type $method
     * @param unknown_type $transaction_data
     * @return array[string]mixed
     * @return array['order_id']int
     */
    protected function execAppCallback($method, $transaction_data)
    {
        $default = array(
            'order_id'    => null,
            'customer_id' => null,
        );
        try {
            $result = $this->app_adapter->execCallbackHandler($method, $transaction_data, $this->id, $this->merchant_id);
        } catch (Exception $ex) {
            $result = array('error' => $ex->getMessage());
        }
        return array_merge($default, $result);
    }

    /**
     *
     * @return array
     */
    public function supportedOperations()
    {
        return array();
    }

    final public function getSupportedTransactions()
    {
        $transactions = array(
            self::TRANSACTION_CONFIRM,
            self::TRANSACTION_AUTH,
            self::TRANSACTION_REFUND,
            self::TRANSACTION_CAPTURE,
            self::TRANSACTION_CANCEL,
            self::TRANSACTION_PAYMENT,
        );
        return array_intersect($transactions, get_class_methods(get_class($this)));
    }

    public function getCustomerPaymentFields($customer_data = null, $payment_form_data = null, $order_data = null)
    {
        ;
    }

    public function validateCustomerPaymentData($payment_form_data)
    {
        ;
    }

    /**
     * @deprecated
     * @return array()
     */
    public function getSettingsList()
    {
        throw new waException('Use getSettingsHTML instead');
    }

    protected function checkPayments()
    {

    }

    /**
     * @deprecated use enumerate instead
     * @param $options array
     * @return array
     */
    final public static function listModules($options = array())
    {
        throw new waException('Use enumerate instead');
    }

    final public static function filterModules($methods, $properties = array(), $strict = false)
    {
        if (is_array($properties) && count($properties)) {
            foreach ($methods as $id => $module) {
                foreach ($properties as $field => $value) {
                    if (!is_array($value)) {
                        $value = array($value);
                    }

                    //$field = "_{$field}";
                    if (!isset($module[$field])) {
                        if ($strict) {
                            unset($methods[$id]);
                            continue 2;
                        }
                    } elseif (!in_array($module[$field], $value)) {
                        unset($methods[$id]);
                        continue 2;
                    }
                }
            }
        }
        return $methods;
    }

    function __call($method, $params)
    {
        //XXX back compatibilty
        if (preg_match('/^([a-z]+)Transaction$/', $method, $matches)) {
            $method = $matches[1];
        }
        $class = get_class($this);
        $transactions = array(
            self::TRANSACTION_CONFIRM,
            self::TRANSACTION_AUTH,
            self::TRANSACTION_REFUND,
            self::TRANSACTION_CAPTURE,
            self::TRANSACTION_CANCEL,
            self::TRANSACTION_PAYMENT,
        );
        if (in_array($method, $transactions)) {
            throw new waException(sprintf('Unsupported transaction %s at %s', $method, $class));
        } elseif (preg_match('/^callback(.+)Transaction$/', $method, $matches)) {
            throw new waException(sprintf('Unsupported transaction callback %s at %s', $matches[1], $class));
        } else {
            throw new waException(sprintf('Unsupported method %s at %s', $method, $class));
        }
    }

    protected static function log($module_id, $data)
    {
        $filename = 'payment/'.$module_id.'Payment.log';
        $rec = "data:\n";
        if (is_array($data)) {
            foreach ($data as $key => $val) {
                $rec .= "$key=$val&\n";
            }
        } else {
            $rec .= "$data\n";
        }
        waLog::log($rec, $filename);
    }

    /**
     *
     * @param $app_id string
     * @return waAppPayment
     * @deprecated
     */
    final protected static function getAdapter($app_id, $merchant_id = null)
    {
        #Init application
        waSystem::getInstance($app_id);
        waSystem::setActive($app_id);

        #check adapter class
        $app_payment_class = $app_id.'Payment';
        if (!class_exists($app_payment_class)) {
            throw new waException(sprintf('Application payment adapter %s not found for %s', $app_payment_class, $app_id));
        }
        return new $app_payment_class($merchant_id);
    }

    /**
     *
     * @param $adapter
     * @return waPayment
     * @deprecated
     * @throws waException
     */
    final protected function transactionInit(&$adapter = null)
    {
        if (!$adapter && $this->app_id) {
            $adapter = self::getAdapter($this->app_id, $this->merchant_id);
        } elseif (!$adapter) {
            throw new waException('Unknown merchant key');
        }
        if (!($adapter instanceof waAppPayment)) {
            throw new waException('Invalid application payment adapter class: avoid waAppPayment, but get %s', is_object($adapter) ? get_class($adapter) : 'not object');
        }
        $this->app_adapter = $adapter;
        $this->merchant_id = $this->app_adapter->getMerchantId();
        $this->app_id = $this->app_adapter->getAppId();
        $this->setSettings($this->app_adapter->getMerchantData($this->id, $this->merchant_id));
        return $this;
    }

    /**
     * Saves formatted data and raw data to DB
     *
     * @param $transaction_data array
     * @param $transaction_raw_data array
     *
     * @return int - transaction_id
     *
     * @tutorial $transaction_data array format:
     * type – one of: 'AUTH+CAPTURE', 'AUTH ONLY', 'CAPTURE', 'REFUND', 'CANCEL', 'CHARGEBACK'
     * amount
     * currency_id – 3-letter ISO-code
     * date_time
     * order_id
     * customer_id
     * transaction_OK — true/false flag
     * error_description – string
     * view_data – string
     * comment - string (optional)
     * native_id - original transaction id from payment gateway
     * parent_id - primary transaction id (optional)
     */
    final protected function saveTransaction($wa_transaction_data, $transaction_raw_data = null)
    {
        $transaction_model = new waTransactionModel();

        $data = array(
            'paymentsystem_id' => $this->id,
            'application_id'   => $this->app_id,
            'merchant_id'      => $this->merchant_id,
            'update_datetime'  => date('Y-m-d H:i:s')
        );
        $data = array_merge($data, $wa_transaction_data);

        $wa_transaction_data['id'] = $transaction_model->insert($wa_transaction_data);

        if (!empty($wa_transaction_data['parent_id']) && !empty($wa_transaction_data['parent_state'])) {
            $transaction_model->updateById($wa_transaction_data['parent_id'], array(
                'state'           => $wa_transaction_data['parent_state'],
                'update_datetime' => $wa_transaction_data['update_datetime']
            ));
        }

        if ($transaction_raw_data && is_array($transaction_raw_data)) {
            $transaction_data_model = new waTransactionDataModel();
            $transaction_data_model->addGroup($wa_transaction_data['id'], $transaction_raw_data);
        }
        return $wa_transaction_data;
    }

    /**
     * Get WA transaction by ID
     * @param int $wa_transaction_id
     * @return array $transaction
     */
    final public static function getTransaction($wa_transaction_id)
    {
        $transaction_model = new waTransactionModel();
        $transaction_data_model = new waTransactionDataModel();
        $data = $transaction_model->getById($wa_transaction_id);
        $data['raw_data'] = $transaction_data_model->getByField('transaction_id', $wa_transaction_id, true);
        return $data;
    }

    /**
     * void method (optionaly used in child methods)
     * @param array $transaction_data
     * @param array $transaction_raw_data
     * @return false
     */
    protected function allowedTransactionCustomized($transaction_data, $transaction_raw_data)
    {
        return null;
    }

    /**
     * Returns available post-payment transaction types
     * @param int $wa_transaction_id
     * @return array
     */
    final public static function allowedTransaction($wa_transaction_id)
    {
        $transaction = self::getTransaction($wa_transaction_id);
        $transaction_raw_data = $transaction['raw_data'];
        unset($transaction['raw_data']);

        $instance = self::factory($id, null, $transaction['merchant_id']);

        $result = $instance->allowedTransactionCustomized($transaction, $transaction_raw_data);
        if ($result) {
            return $result;
        }

        // @TODO: parse 'result' field

        if (empty($transaction['result']) || !empty($transaction['parent_id'])) {
            return null;
        }

        $operations = $instance->supportedOperations();

        switch ($transaction['state']) {
            case self::STATE_AUTH:
                $operations = array_intersect($operations, array(self::TRANSACTION_CAPTURE, self::TRANSACTION_CANCEL));
                break;
            case self::STATE_CAPTURED:
            case self::STATE_PARTIAL_REFUNDED:
                $operations = array_intersect($operations, array(self::TRANSACTION_REFUND));
                break;
            default:
                $operations = null;
                break;
        }
        return $operations;
    }
    /**
     * Convert transaction raw data to formatted data
     * @TODO: must be abstract
     * @param array $transaction_raw_data
     * @return array $transaction_data
     */
    protected function formalizeData($transaction_raw_data)
    {
    }

    /**
     * Adds order [and customer] info to wa_transaction DB table (for cases like Google Checkout)
     * @param $wa_transaction_id
     * @param $result
     * @param $order_id
     * @param $customer_id
     * @return bool result
     */
    final public static function addTransactionData($wa_transaction_id, $order_id = null, $customer_id = null, $state = null)
    {
        $transaction_model = new waTransactionModel();
        $data = array();
        if ($order_id) {
            $data['order_id'] = $order_id;
        }
        if ($customer_id) {
            $data['customer_id'] = $customer_id;
        }
        if ($state) {
            $data['state'] = $state;
        }
        return $transaction_model->updateById($wa_transaction_id, $data);
    }

    /**
     * Get transactions list
     * @param array $conditions - $key=>$value pairs
     * @return array $transactions - transactions list
     */
    final public static function getTransactionsByFields($conditions)
    {
        $transaction_model = new waTransactionModel();
        $transaction_data_model = new waTransactionDataModel();

        $transactions = $transaction_model->getByFields($conditions);
        $transactions_data = $transaction_data_model->getByField('transaction_id', array_keys($transactions), true);

        foreach ($transactions_data as $key => $row) {
            $transactions[$row['transaction_id']]['raw_data'][$row['field_id']] = $row['value'];
        }
        return $transactions;
    }

    /**
     * @return string callback relay url
     */
    public final function getRelayUrl()
    {
        return str_replace('http://', 'https://', wa()->getRootUrl(true)).'payments.php/'.$this->id.'/';
    }

    /**
     * Handle callback from payment gateway
     *
     * @example waPayment::execTransactionCallback(waPayment::TRANSACTION_CAPTURE,'AuthorizeNet',$request)
     * @param $module_id string Module identity
     * @param $request array
     * @return unknown_type
     * @deprecated
     */
    public static function execTransactionCallback($request, $module_id)
    {
        return self::callback($module, $request);
    }

}
interface waIPayment
{
    /**
     * @return string HTML payment form
     */
    public function payment($payment_form_data, $order_data, $transaction_type);
}

interface waIPaymentCancel
{
    /**
     *
     * @param array[string]mixed $transaction_raw_data['order_data']
     * @param array[string]mixed $transaction_raw_data['transaction_type']
     * @param array[string]mixed $transaction_raw_data['customer_data']
     * @param array[string]mixed $transaction_raw_data['transaction']
     * @param array[string]mixed $transaction_raw_data['refund_amount']
     */
    public function cancel($transaction_raw_data);
}

interface waIPaymentCapture
{
    /**
     *
     * @param array[string]mixed $transaction_raw_data['order_data']
     * @param array[string]mixed $transaction_raw_data['transaction_type']
     * @param array[string]mixed $transaction_raw_data['customer_data']
     * @param array[string]mixed $transaction_raw_data['transaction']
     * @param array[string]mixed $transaction_raw_data['refund_amount']
     */
    public function capture($transaction_raw_data);
}

interface waIPaymentRefund
{
    /**
     *
     * @param array[string]mixed $transaction_raw_data['order_data']
     * @param array[string]mixed $transaction_raw_data['transaction_type']
     * @param array[string]mixed $transaction_raw_data['customer_data']
     * @param array[string]mixed $transaction_raw_data['transaction']
     * @param array[string]mixed $transaction_raw_data['refund_amount']
     */
    public function refund($transaction_raw_data);
}
