<?php

/*
 * This file is part of Webasyst framework.
 *
 * Licensed under the terms of the GNU Lesser General Public License (LGPL).
 * http://www.webasyst.com/framework/license/
 *
 * @link http://www.webasyst.com/
 * @author Webasyst LLC
 * @copyright 2013 Webasyst LLC
 * @package wa-system
 * @subpackage shipping
 */
abstract class waShipping extends waSystemPlugin
{

    const PLUGIN_TYPE = 'shipping';

    private $address = array();

    private $items = array();

    private $params = array();

    /**
     *
     * Sets destination address
     * @param array $address
     * @return waShipping
     */
    public function setAddress($address)
    {
        $this->address = $address;
        return $this;
    }

    /**
     *
     * @param array $item
     * @param array[string]mixed $item package item
     * @param array[string]string $item['id'] ID of package item
     * @param array[string]string $item['name'] name of package item
     * @param array[string]mixed $item['weight'] weight of package item
     * @param array[string]mixed $item['price'] price of package item
     * @param array[string]mixed $item['quantity'] quantity of packate item
     * @return waShipping
     */
    public function addItem($item)
    {
        $this->items[] = $item;
        return $this;
    }

    /**
     *
     * @param array $items
     * @param array[][string]mixed $items package item
     * @param array[][string]string $items['id'] ID of package item
     * @param array[][string]string $items['name'] name of package item
     * @param array[][string]mixed $items['weight'] weight of package item
     * @param array[][string]mixed $items['price'] price of package item
     * @param array[][string]mixed $items['quantity'] quantity of packate item
     * @return waShipping
     */
    public function addItems($items)
    {
        foreach ($items as $item) {
            $this->addItem($item);
        }
        return $this;
    }

    protected function getPackageProperty($property)
    {
        $property_value = null;
        switch ($property) {
            case 'price':
                /*TODO use currency code and etc*/
            case 'weight':
                if (isset($this->params['total_'.$property])) {
                    $property_value = $this->params['total_'.$property];
                } else {
                    foreach ($this->items as $item) {
                        $property_value += $item[$property] * $item['quantity'];
                    }
                }
                break;
        }
        return $property_value;
    }

    protected function getTotalWeight()
    {
        return $this->getPackageProperty('weight');
    }

    protected function getTotalPrice()
    {
        return $this->getPackageProperty('price');
    }

    protected function getAddress($field = null)
    {
        return ($field === null) ? $this->address : (isset($this->address[$field]) ? $this->address[$field] : null);
    }

    /**
     *
     * Returns available shipping options info, rates, and estimated delivery times
     * @param array $items
     * @param array[][string]mixed $items package item
     * @param array[][string]string $items['id'] ID of package item
     * @param array[][string]string $items['name'] name of package item
     * @param array[][string]mixed $items['weight'] weight of package item
     * @param array[][string]mixed $items['price'] price of package item
     * @param array[][string]mixed $items['quantity'] quantity of packate item
     *
     * @param array[string]string $address shipping adress
     *
     *
     * @param array[mixed]mixed $params
     * @param array[string]float $params['total_price'] package total price
     * @param array[string]float $params['total_weight'] package total weight
     *
     * @return string
     * @return array[string]array
     * @return array[string]['name']string
     * @return array[string]['desription']string
     * @return array[string]['estimated_delivery_date']string
     * @return array[string]['currency']string
     * @return array[string]['rate_min']string
     * @return array[string]['rate_max']string
     * @return array[string]['rate']string
     */
    public function getRates($items = array(), $address = array(), $params = array())
    {
        if (!empty($address)) {
            $this->address = $address;
        }
        $this->params = array_merge($this->params, $params);
        return $this->addItems($items)->calculate();
    }

    /**
     * @return array[string]array
     * @return array[string]['name']string название печатной формы
     * @return array[string]['desription']string описание печатной формы
     */
    public function getPrintForms()
    {
        return array();
    }

    /**
     *
     * Displays printable form content (HTML) by id
     * @param string $id
     * @param array $items
     * @param array $address
     * @param array $params
     */
    public function displayPrintForm($id, $items = null, $address = null, $params = array())
    {

    }

    /**
     *
     * @return waShipping
     */
    public function flush()
    {
        $this->items = array();
        $this->params = array();
        $this->address = array();
        return $this;
    }

    /**
     *
     * @return string ISO3 currency code or array of ISO3 codes
     */
    abstract public function allowedCurrency();

    /**
     *
     * @return string Weight units or array of weight units
     */
    abstract public function allowedWeightUnit();

    public function allowedAddress()
    {
        return array();
    }

    /**
     *
     */
    abstract protected function calculate();

    /**
     *
     * Returns shipment current tracking info
     * @return string Tracking information (HTML)
     */
    public function tracking($tracking_id = null)
    {
        return null;
    }

    /**
     *
     * External shipping service callback handler
     * @param array $params
     * @param string $module_id
     */
    public static function execCallback($params, $module_id)
    {
        ;
    }

    public static function settingCurrencySelect()
    {
        $options = array();
        $options[''] = '-';
        $app_config = wa()->getConfig();
        if (method_exists($app_config, 'getCurrencies')) {
            $currencies = $app_config->getCurrencies();
            foreach ($currencies as $code => $currency) {
                $options[$code] = array(
                    'value'       => $code,
                    'title'       => $currency['title'],
                    'description' => $currency['code'],
                );
            }
        } else {
            $currencies = waCurrency::getAll();
            foreach ($currencies as $code => $currency_name) {
                $options[$code] = array(
                    'value'       => $code,
                    'title'       => $currency_name,
                    'description' => $code,
                );
            }
        }
        return $options;
    }

    public static function settingCountryControl($name, $params = array())
    {

    }

    /**
     *
     * Get shipping plugin
     * @param string $id
     * @param waiPluginSettings $adapter
     * @return waShipping
     */
    public static function factory($id, $adapter = null, $key = null, $type = null)
    {
        return parent::factory($id, $adapter, $key, self::PLUGIN_TYPE);
    }

    /**
     * The list of available shipping options
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

}
