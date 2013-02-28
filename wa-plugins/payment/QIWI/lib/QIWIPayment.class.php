<?php
/**
 * @version draft
 * @package waPlugins
 * @subpackage Payment
 * @name QIWI
 * @description QIWI payment module
 * @type ???????
 * @apps shop,orders
 *
 * @property-read string $login
 * @property-read string $password
 * @property-read string $lifetime
 * @property-read string $alarm
 * @property-read string $prefix
 * @property-read string $customer_phone
 * @property-read string $TESTMODE
 *
 */
class QIWIPayment extends waPayment implements waIPayment, waIPaymentCapture, waIPaymentCancel
{
    private $url = 'https://ishop.qiwi.ru/services/ishop';
    private $http_url = 'https://w.qiwi.ru/setInetBill_utf.do';

    public function allowedCurrency()
    {
        return 'RUB';
    }

    public function payment($payment_form_data, $order_data, $transaction_type)
    {
        if ($order_data['currency_id'] != 'RUB') {
            return array(
                'type' => 'error',
                'data' => _w('Order currency is not RUB but payment gateway provide only RUB transactions'),
            );
        }
        $mobile_phone = '';
        if (!empty($order_data['customer_contact_id'])) {
            $contact = new waContact($order_data['customer_contact_id']);
            $mobile_phone = preg_replace('/^\s*\+\s*7/', '', $contact->get('phone.mobile', 'default'));
            $mobile_phone = preg_replace('/[^\d]/', '', $mobile_phone);
        }
        $hidden_fields = array(
            'from'      => $this->login,
            'summ'      => number_format($order_data['amount'], 2, '.', ''),
            'com'       => _w('Order').' '._w('#').$order_data['order_id'],
            'lifetime'  => $this->lifetime,
            'check_agt' => 'false',
            'txn_id'    => $this->getInvoiceId($order_data['order_id']),
        );

        $view = wa()->getView();

        $view->assign('mobile_phone', $mobile_phone);
        $view->assign('url', wa()->getRootUrl());
        $view->assign('payment_type', preg_replace('/[^a-z]+/', '_', $transaction_type));
        $view->assign('hidden_fields', $hidden_fields);
        $view->assign('form_url', $this->getEndpointUrl('html'));

        return $view->fetch($this->path.'/templates/payment.html');
    }

    /**
     * @todo test and complete code
     */
    public function capture($transaction_raw_data)
    {
        $result = '';
        try {
            //$order_id, $amount, $phone_number, $description;
            $soap_client = $this->getQiwiSoapClient();

            $parameters = new createBill();

            $contact = new waContact($order_data['customer_id']);
            $mobile_phone = preg_replace('/^\s*\+\s*7/', '', $contact->get('phone.mobile', 'default'));
            //TODO verify phone
            $mobile_phone = preg_replace('/[\D]+/', '', $mobile_phone);

            $parameters->login = $this->login; # логин (id) магазина;
            $parameters->password = $this->password; # пароль для магазина;
            $parameters->user = $phone_number; # идентификатор пользователя (номер телефона);
            $parameters->amount = $amount; # сумма, на которую выставляется счет (разделитель «.»);
            $parameters->comment = $description; # комментарий к счету, который увидит пользователь (максимальная длина 255 байт);
            $parameters->txn = $this->getInvoiceId($transaction_raw_data['order_id']); # уникальный идентификатор счета (максимальная длина 30 байт);
            $parameters->lifetime = date('d.m.Y H:i:s', time() + 3600 * max(1, (int) $this->lifetime)); # время действия счета (в формате dd.MM.yyyy HH:mm:ss);
            $parameters->alarm = $this->alarm; # отправить оповещение пользователю (1 - уведомление SMS-сообщением, 2 - уведомление звонком, 0 - не оповещать);
            # ПРИМЕЧАНИЕ
            # Уведомления доступны только магазинам, зарегистрированным по схеме "Именной кошелек". Для магазинов, зарегистрированных по схеме "Прием платежей", уведомления заблокированы.
            $parameters->create = 1; # флаг для создания нового пользователя (если он не зарегистрирован в системе).
            # В ответ возвращается результат выполнения функции (см. Справочник кодов завершения).

            $response = $soap_client->createBill($parameters);
            self::log($this->id, $soap_client->getDebug());
            if ($response->createBillResult) {
                $result = $this->getResponseCodeDescription($response->createBillResult);
                self::log($this->id, array(__METHOD__." #{$order_id}\tphone:{$phone_number}\t{$result}"));
            }
        } catch (SoapFault $sf) {
            $result = $sf->getMessage();
            self::log($this->id, $sf->getMessage());
            self::log($this->id, $soap_client->getDebug());
        }
        return $result;
    }

    /**
     * @todo test it
     */
    public function cancel($transaction_raw_data)
    {
        try {
            $soap_client = $this->getQiwiSoapClient();
            $order_id = null;

            $parameters = new cancelBill();

            $parameters->login = $this->login; # логин (id) магазина;
            $parameters->password = $this->password; # пароль для магазина;

            $parameters->txn = $this->getInvoiceId($transaction_raw_data['order_id']); # уникальный идентификатор счета (максимальная длина 30 байт);

            $response = $soap_client->cancelBill($parameters);

            $result = array(
                'result'      => $response->cancelBillResult ? 0 : 1,
                'description' => $this->getResponseCodeDescription($response->cancelBillResult),
            );
            self::log($this->id, array(__METHOD__." #{$order_id}\tphone:{$phone_number}\t{$result}"));
        } catch (SoapFault $sf) {
            $result = array(
                'result'      => - 1,
                'description' => $sf->getMessage(),
            );
            self::log($this->id, $sf->getMessage());
            self::log($this->id, $soap_client->getDebug());
        }
        return $result;
    }

    /**
     *
     * @param $data - get from gateway
     * @return void
     */
    protected function callbackHandler($data)
    {
        $s = $this->getQiwiSoapServer('soap');
        $s->setHandler($this);

        $this->post = !empty($GLOBALS['HTTP_RAW_POST_DATA']) ? $GLOBALS['HTTP_RAW_POST_DATA'] : null;

        $s->service($this->post); // sets $this->txn

        if (!empty($this->txn)) {

            if ($result = $this->checkBill($this->txn)) {
                $transaction_data = $this->formalizeData($result);
                $callback_method = null;

                switch (intval($result->status)) {
                    case 60:
                        $transaction_data['type'] = self::OPERATION_AUTH_CAPTURE;

                        $transaction_data['result'] = 1;
                        $transaction_data = $this->saveTransaction($transaction_data, $data);
                        $callback_method = self::CALLBACK_PAYMENT;
                        break;
                    case 150:
                    case 151:
                    case 160:
                    case 161:
                        $transaction_data['type'] = self::OPERATION_CANCEL;
                        $transaction_data['result'] = 1;
                        $transaction_data = $this->saveTransaction($transaction_data, $data);
                        $callback_method = self::CALLBACK_CANCEL;
                        break;
                    default:
                        self::log($this->id, array('error' => 'callbackHandler checkBill staus: '.$result->status));
                        break;
                }
                if ($callback_method) {
                    $callback = $this->execAppCallback($callback_method, $transaction_data);

                    if (!empty($callback['order_id'])) {
                        self::addTransactionData($transaction_data['id'], $callback['order_id'], $callback['customer_id'], self::STATE_CAPTURED);
                    }
                }
            }
        }
        return array('template' => false);
    }

    private function getInvoiceId($id)
    {
        $id = $this->app_id.'_'.$this->merchant_id.'_'.$id;
        if ($this->prefix) {
            $id = $this->prefix.'_'.$id;
        }
        return $id;
    }

    protected function formalizeData($result)
    {
        $transaction_data = array(
            'native_id'        => $this->txn,
            'amount'           => is_object($result) && property_exists(get_class($result), 'amount') && !empty($result->amount) ? str_replace(',', '.', $result->amount) : 0,
            'currency_id'      => 'RUB',
            'order_id'         => $this->order_id,
            'paymentsystem_id' => $this->id,
        );
        if (is_object($result) && property_exists(get_class($result), 'user') && !empty($result->user)) {
            $data['phone'] = $result->user;
            $transaction_data['view_data'] = 'Phone: '.$result->user;
        }
        if (is_object($result) && property_exists(get_class($result), 'status') && !empty($result->status)) {
            $transaction_data['view_status'] = $this->getBillCodeDescription(intval($result->status));
        }
        return $transaction_data;
    }

    protected function init()
    {
        $autload = waAutoload::getInstance();
        $autload->add("IShopServerWSService", "wa-plugins/payment/QIWI/vendors/qiwi/IShopServerWSService.php");
        $autload->add("IShopClientWSService", "wa-plugins/payment/QIWI/vendors/qiwi/IShopClientWSService.php");
        $autload->add("nusoap_base", "wa-plugins/payment/QIWI/vendors/nusoap/nusoap.php");
        parent::init();
    }

    protected function getEndpointUrl($type = 'soap')
    {
        return ($type == 'soap') ? $this->url : $this->http_url;
    }

    public function supportedOperations()
    {
        return array(
            self::OPERATION_AUTH_CAPTURE,
            self::OPERATION_HOSTED_PAYMENT_AFTER_ORDER,
        );
    }

    public static function _getAlarmVariants()
    {
        $alarms = array();
        $alarms[] = array('title' => 'не оповещать', 'value' => 0);
        $alarms[] = array('title' => 'уведомление SMS-сообщением', 'value' => 1);
        $alarms[] = array('title' => 'уведомление звонком', 'value' => 2);
        return $alarms;
    }

    /**
     *
     * @return IShopServerWSService
     */
    private function getQiwiSoapClient($type = 'soap')
    {
        if (!class_exists('nusoap_base', false)) {
            class_exists('nusoap_base');
        }
        //TODO init proxy settings
        $options = array();
        $options['location'] = $this->getEndpointUrl($type);
        $options['trace'] = 1;
        $instance = new IShopServerWSService($this->path.'/vendors/qiwi/'.'IShopServerWS.wsdl', $options);
        //        $instance->setDebugLevel(9);
        $instance->soap_defencoding = 'UTF-8';
        return $instance;
    }

    /**
     *
     * @return IShopClientWSService
     */
    private function getQiwiSoapServer($type = 'soap')
    {
        if (!class_exists('nusoap_base', false)) {
            class_exists('nusoap_base');
        }
        $options = array();
        $options['location'] = $this->getEndpointUrl($type);
        $options['trace'] = 1;
        $instance = new IShopClientWSService($this->path.'/vendors/qiwi/'.'IShopClientWS.wsdl', $options);
        $instance->soap_defencoding = 'UTF-8';
        return $instance;
    }

    /**
     *
     *
     * SOAP callback method
     * @param updateBill $parameters
     * @return updateBillResponse
     */
    public function updateBill($login = null, $password = null, $txn = null, $status = null)
    {
        $result = new updateBillResponse();
        $result->updateBillResult = 300;
        if ($this->TESTMODE) {
            self::log($this->id, array($login, $password, $txn, $status));
        }
        try {
            if ($this->prefix) {
                $metacharacters = array('?', '+', '*', '.', '(', ')', '[', ']', '{', '}', '<', '>', '^', '$', '@');
                foreach ($metacharacters as & $char) {
                    $char = "\\{$char}";
                    unset($char);
                }
                $cleanup_pattern = '@('.implode('|', $metacharacters).')@';
                $pattern = preg_replace($cleanup_pattern, '\\\\$1', $this->prefix);
                $pattern = "@^{$pattern}_([a-z]+)_(\d+)_(\d+)@";
            } else {
                $pattern = "@^([a-z]+)_(\d+)_(\d+)@";
            }

            if ($txn && preg_match($pattern, $txn, $match)) {
                $this->app_id = $match[1];
                $this->merchant_id = $match[2];
                $this->order_id = $match[3];
                $this->callbackRoute($match);
            } else {
                self::log($this->id, array('error' => 'updateBill: invalid invoice number', 'txn' => $txn, 'pattern' => $pattern));
                $result->updateBillResult = 210;
                return $result;
            }
        } catch (Exception $ex) {
            self::log($this->id, array('error' => 'updateBill: empty merchant data', 'txn' => $txn));
            $result->updateBillResult = 210;
            return $result;
        }
        if (!$this->login || !$this->password) {
            self::log($this->id, array('error' => 'updateBill: empty merchant data', 'txn' => $txn));
            $result->updateBillResult = 298;
            return $result;
        }
        if ($this->login != $login) {
            self::log($this->id, array('error' => 'updateBill: invalid login: '.$login.', expected: '.$this->login, 'txn' => $txn));
            $result->updateBillResult = 150;
            return $result;
        }

        $pass = $this->getPassword($this->order_id);
        if ($password != $pass) {
            self::log($this->id, array('error' => 'updateBill: invalid password: '.$password.', expected: '.$pass, 'txn' => $txn));
            if ($this->TESTMODE) {
                $result->updateBillResult = 150;
            } else {
                $result->updateBillResult = 150;
            }
            return $result;
        }

        $result->updateBillResult = 0;

        $this->txn = $txn;
        $this->status = $status;

        # login – логин (id) магазина;
        # password – пароль. Данный параметр может быть сформирован 2 способами:
        # − С использованием подписи WSS X.509, когда каждое уведомление подписывается сервером ОСМП. Данный варинт более сложен в реализации, однако намного безопаснее;
        # − С пользованием упрощенного алгоритма. В поле записывается специально вычисленное по следующему алгоритму значение:
        # uppercase(md5(txn + uppercase(md5(пароля))))
        # Все строки, от которых вычисляется функция md5, преобразуются в байты в кодировке windows-1251. Данный вариант в реализации проще, однако, менее надежен.
        # Пример 1. Пример вычисления значения поля password по упрощенному алгоритму
        # Пусть заказ="Заказ1", а пароль="Пароль магазина", тогда функция
        # MD5("Пароль магазина")=936638421CA12C3E15E72FA7B75E03CE.
        # В поле password будет записано следующее значение:
        # MD5("Заказ1"+MD5("Пароль магазина"))=MD5("Заказ1"+"936638421CA12C3E15E72FA7B75E03CE")= EC19350E3051D8A9834E5A2CF25FD0D9
        # txn – уникальный идентификатор счета (максимальная длина 30 байт);
        # status – новый статус счета (см. Справочник статусов счетов).
        # В ответ возвращается результат выполнения запроса (см. Коды завершения).
        return $result;
    }

    /**
     * SOAP callback method
     * @param $txn (native transaction ID)
     * @return checkBillResponse
     */
    private function checkBill($txn)
    {
        try {

            $soap_client = $this->getQiwiSoapClient();

            try {

                if ($txn && preg_match('/^([a-z]+)_(\d+)_(\d+)$/', $txn, $match)) {
                    $this->app_id = $match[1];
                    $this->merchant_id = $match[2];
                    $this->order_id = $match[3];
                    $this->callbackRoute($request);
                } else {
                    self::log($this->id, array('error' => 'updateBill: invalid invoice number', 'txn' => $txn));
                    $result->updateBillResult = 210;
                    return false;
                }

            } catch (Exception $ex) {
                self::log($this->id, array('error' => 'updateBill: empty merchant data', 'txn' => $txn));
                $result->updateBillResult = 210;
                return false;
            }

            $params = new checkBill();
            $params->login = $this->login; # логин (идентификатор) магазина;
            $params->password = $this->password; # пароль для магазина;
            $params->txn = $txn; # уникальный идентификатор счета (максимальная длина 30 байт).

            $result = $soap_client->checkBill($params);

            self::log($this->id, (array) $result);

            return $result;

        } catch (SoapFault $sf) {
            self::log($this->id, array('checkBill: error' => $sf->getMessage()));
            return false;
        }

        ## Результаты выполнения функции:
        # user – идентификатор пользователя (номер телефона);
        # amount – сумма, на которую выставлен счет (разделитель «.»);
        # date – дата выставления счета (в формате dd.MM.yyyy HH:mm:ss);
        # lifetime – время действия счета (в формате dd.MM.yyyy HH:mm:ss);
        # status – статус счета (см. Справочник статусов счетов)

        //TODO update order status and write changelog
        }

    /**
     * SOAP callback method
     * optional future
     * @todo
     * @return void
     */
    private function cancelBill()
    {
        # login – логин (идентификатор) магазина;
        # password – пароль для магазина;
        # txn – уникальный идентификатор счета (максимальная длина 30 байт).
        ;
    }

    /**
     *
     * Internal method to describe response codes
     * @param int $response_code
     */
    private function getResponseCodeDescription($response_code)
    {
        $codes = array();
        $codes[-1] = "Неизвестный код ответа [{$response_code}]";
        $codes[0] = 'Успех';
        $codes[13] = 'Сервер занят, повторите запрос позже';
        $codes[150] = 'Ошибка авторизации (неверный логин/пароль)';
        $codes[210] = 'Счет не найден';
        $codes[215] = 'Счет с таким txn-id уже существует';
        $codes[241] = 'Сумма слишком мала';
        $codes[242] = 'Превышена максимальная сумма платежа – 15 000р.';
        $codes[278] = 'Превышение максимального интервала получения списка счетов';
        $codes[298] = 'Агента не существует в системе';
        $codes[300] = 'Неизвестная ошибка';
        $codes[330] = 'Ошибка шифрования';
        $codes[370] = 'Превышено максимальное кол-во одновременно выполняемых запросов';
        return isset($codes[$response_code]) ? $codes[$response_code] : $codes[-1];
    }

    /**
     *
     * Internal method to describe response codes
     * @param int $response_code
     */
    private function getBillCodeDescription($response_code)
    {
        if ($response_code < 0) {
            return $this->getResponseCodeDescription(-$response_code);
        }
        $codes = array();
        $codes[-1] = "Неизвестный код статуса счета [{$response_code}]";
        $codes[50] = 'Выставлен';
        $codes[52] = 'Проводится';
        $codes[60] = 'Оплачен';
        $codes[150] = 'Отменен (ошибка на терминале)';
        $codes[151] = 'Отменен (ошибка авторизации: недостаточно средств на балансе, отклонен абонентом при оплате с лицевого счета оператора сотовой связи и т.п.).';
        $codes[160] = 'Отменен';
        $codes[161] = 'Отменен (Истекло время)';
        return isset($codes[$response_code]) ? $codes[$response_code] : $codes[-1];
    }

    private function getPassword($order_id)
    {
        if (setlocale(LC_CTYPE, 'ru_RU.CP-1251', 'ru_RU.CP1251', 'ru_RU.win', 'ru_RU.1251', 'Russian_Russia.1251', 'Russian_Russia.CP-1251', 'Russian_Russia.CP1251', 'Russian_Russia.win') === false) {
            self::log($this->id, __METHOD__."\tsetLocale failed");
        }
        $txn = $this->app_id.'_'.$this->merchant_id.'_'.$this->prefix.$order_id;
        $string = $txn.strtoupper(md5(iconv('utf-8', 'cp1251', $this->password)));
        $hash = strtoupper(md5(iconv('utf-8', 'cp1251', $string)));
        return $hash;
    }

}
