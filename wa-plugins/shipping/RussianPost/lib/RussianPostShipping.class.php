<?php

/**
 *
 * @property region
 * @property halfkilocost
 * @property currency
 * @property overhalfkilocost
 * @property $caution
 * @property $max_weight
 * @property $complex_calculation_weight
 * @property $commission
 *
 */
class RussianPostShipping extends waShipping
{
    protected function initControls()
    {
        $this
            ->registerControl('WeightCosts')
            ->registerControl('RegionRatesControl');
        parent::initControls();
    }

    public static function settingWeightCosts($name, $params = array())
    {
        foreach ($params as $field => $param) {
            if (strpos($field, 'wrapper')) {
                unset($params[$field]);
            }
        }
        $control = '';
        if (!isset($params['value']) || !is_array($params['value'])) {
            $params['value'] = array();
        }
        $costs = $params['value'];

        waHtmlControl::addNamespace($params, $name);
        $control .= '<table class="zebra">';
        $params['description_wrapper'] = '%s';
        $currency = waCurrency::getInfo('RUB');
        $params['title_wrapper'] = '%s';
        $params['control_wrapper'] = '<tr title="%3$s"><td>%1$s</td><td>&rarr;</td><td>%2$s '.$currency['sign'].'</td></tr>';
        $params['size'] = 6;
        for ($zone = 1; $zone <= 5; $zone++) {
            $params['value'] = floatval(isset($costs[$zone]) ? $costs[$zone] : 0.0);
            $params['title'] = "Пояс {$zone}";
            $control .= waHtmlControl::getControl(waHtmlControl::INPUT, $zone, $params);
        }
        $control .= "</table>";

        return $control;
    }

    public static function settingRegionRatesControl($name, $params = array())
    {
        foreach ($params as $field => $param) {
            if (strpos($field, 'wrapper')) {
                unset($params[$field]);
            }
        }

        if (empty($params['value']) || !is_array($params['value'])) {
            $params['value'] = array();
        }
        $control = '';

        waHtmlControl::addNamespace($params, $name);

        $cm = new waCountryModel();

        $countries = $cm->all();

        $rm = new waRegionModel();
        if ($regions = $rm->getByCountry('rus')) {

            $control .= "<table class=\"zebra\"><thead>";
            $control .= "<tr class=\"gridsheader\"><th colspan=\"3\">";
            $control .= htmlentities('Распределите регионы по тарифным поясам Почты России', ENT_QUOTES, 'utf-8');
            $control .= "</th>";
            $control .= "<th>Только авиа</th>";
            $control .= "</th></tr></thead><tbody>";

            $params['control_wrapper'] = '<tr><td>%s</td><td>&rarr;</td><td>%s</td><td>%s</td></tr>';
            $params['title_wrapper'] = '%s';
            $params['description_wrapper'] = '%s';
            $params['options'] = array();
            $params['options'][0] = _wp('*** пояс не выбран ***');
            for ($region = 1; $region <= 5; $region++) {
                $params['options'][$region] = sprintf(_wp('Пояс %d'), $region);
            }
            $avia_params = $params;
            $avia_params['control_wrapper'] = '%2$s';
            $avia_params['description_wrapper'] = false;
            $avia_params['title_wrapper'] = false;

            foreach ($regions as $region) {
                $name = 'zone';
                $id = $region['code'];
                if (empty($params['value'][$id])) {
                    $params['value'][$id] = array();
                }
                $params['value'][$id] = array_merge(array($name => 0, 'avia_only' => false), $params['value'][$id]);
                $region_params = $params;

                waHtmlControl::addNamespace($region_params, $id);
                $avia_params = array(
                    'namespace'           => $region_params['namespace'],
                    'control_wrapper'     => '%2$s',
                    'description_wrapper' => false,
                    'title_wrapper'       => false,
                    'value'               => $params['value'][$id]['avia_only'],
                );
                $region_params['value'] = max(0, min(5, $params['value'][$id][$name]));

                $region_params['description'] = waHtmlControl::getControl(waHtmlControl::CHECKBOX, 'avia_only', $avia_params);
                $region_params['title'] = $region['name'];
                if ($region['code']) {
                    $region_params['title'] .= " ({$region['code']})";
                }
                $control .= waHtmlControl::getControl(waHtmlControl::SELECT, 'zone', $region_params);
            }
            $control .= "</tbody>";
            $control .= "</table>";
        } else {
            $control .= 'Не определено ни одной области. Для работы модуля необходимо определить хотя бы одну область в России (см. раздел «Страны и области»).';
        }
        return $control;
    }

    private function verifyAddress()
    {
        $address = $this->getAddress();
        $variants = $this->allowedAddress();

        if (empty($address['country'])) {
            $address['country'] = $variants['country'];
        } elseif ($address['country'] != $variants['country']) {
            $address['country'] = false;
        }

        if (empty($address['region'])) {
            $address['region'] = true;
        } elseif (!in_array($address['region'], $variants['region'])) {
            $address['region'] = false;
        }
        return $address;
    }

    public function allowedAddress()
    {
        $address = array(
            'country' => 'rus',
            'region'  => array(),
        );
        foreach ($this->region as $region => $options) {
            if (!empty($options['zone'])) {
                $address['region'][] = $region;
            }
        }
        return $address;
    }

    private function getZoneRates($weight, $price, $zone)
    {
        $zone = max(1, min(5, $zone));
        $rate = array();
        $halfkilocost = $this->halfkilocost;
        $overhalfkilocost = $this->overhalfkilocost;

        $rate['ground'] = $this->halfkilocost[$zone] + $this->overhalfkilocost[$zone] * ceil((($weight < 0.5 ? 0.5 : $weight) - 0.5) / 0.5);

        $rate['air'] = $rate['ground'] + $this->getSettings('air');

        if ($this->getSettings('caution') || ($weight > $this->complex_calculation_weight)) {

            $rate['ground'] *= 1.3;
            $rate['air'] *= 1.3;
        }

        $rate['ground'] += $price * ($this->commission / 100);
        $rate['air'] += $price * ($this->commission / 100);
        return $rate;
    }

    public function calculate()
    {
        $address = $this->verifyAddress();
        if ($address['country'] === false) {
            return 'Доставка возможна только по территории Российской Федерации';
        } elseif ($address['region'] === false) {
            return 'Доставка в указанную область невозможна';
        } else {
            $services = array();
            $region_id = null;
            if ($address['region'] !== true) {
                $region_id = $address['region'];
            }

            $zone = null;
            $delivery_date = waDateTime::format('humandate',strtotime('+1 week')).' — '.waDateTime::format('humandate',strtotime('+2 week'));
            $weight = $this->getTotalWeight();
            if ($weight > $this->max_weight) {
                $services = sprintf("Вес отправления (%0.2f) превышает максимально допустимый (%0.2f)", $weight, $this->max_weight);
            } else {
                if ($region_id) {
                    if (!empty($this->region[$region_id]) && !empty($this->region[$region_id]['zone'])) {

                        $rate = $this->getZoneRates($weight, $this->getTotalPrice(), $this->region[$region_id]['zone']);
                        if (empty($this->region[$region_id]['avia_only'])) {
                            $services['ground'] = array(
                                'name'         => 'Наземный транспорт',
                                'id'           => 'ground',
                                'est_delivery' => $delivery_date,
                                'rate'         => $rate['ground'],
                                'currency'     => 'RUB',
                            );
                        }
                        $services['avia'] = array(
                            'name'         => 'Авиа',
                            'id'           => 'avia',
                            'est_delivery' => $delivery_date,
                            'rate'         => $rate['air'],
                            'currency'     => 'RUB',
                        );
                    } else {
                        $services = false;
                    }

                } else {
                    $price = $this->getTotalPrice();
                    $rate_min = $this->getZoneRates($weight, $price, 1);
                    $rate_max = $this->getZoneRates($weight, $price, 5);
                    $services['ground'] = array(
                        'name'                    => 'Наземный транспорт',
                        'id'                      => 'ground',
                        'est_delivery' => $delivery_date,
                        'rate'                    => array($rate_min['ground'], $rate_max['ground']),
                        'currency'                => 'RUB',
                    );
                    $services['avia'] = array(
                        'name'                    => 'Авиа',
                        'id'                      => 'avia',
                        'est_delivery' => $delivery_date,
                        'rate'                    => array($rate_min['air'], $rate_max['air']),
                        'currency'                => 'RUB',
                    );
                }
            }
            return $services;
        }
    }

    public function getPrintForms()
    {
        return array();
        //TODO
        return array(
            113 => array(
                'name'        => 'Форма №113',
                'description' => '',
            ),
            116 => array(
                'name'        => 'Форма №116',
                'description' => '',
            ),
        );
    }

    public function displayPrintForm($id, $items = null, $address = null, $params = array())
    {
        $method = 'displayPrintForm'.$id;
        if (method_exists($this, $method)) {
            return $this->$method();
        } else {
            throw new waException('Print form not found');
        }

    }

    private function displayPrintForm113()
    {
        $view = wa()->getView();
        return $view->fetch($this->path.'/templates/form113.html');
    }

    private function displayPrintForm116()
    {
        $view = wa()->getView();
        return $view->fetch($this->path.'/templates/form113.html');
    }

    public function tracking($tracking_id = null)
    {
        return 'Отслеживание отправления: <a href="http://emspost.ru/ru/tracking/?id='.$tracking_id.'">http://emspost.ru/ru/tracking/?id='.$tracking_id.'</a>';
    }

    public function allowedCurrency()
    {
        return 'RUB';
    }

    public function allowedWeightUnit()
    {
        return 'kg';
    }
}
