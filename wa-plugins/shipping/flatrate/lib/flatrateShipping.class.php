<?php

/**
 *
 * @property-read float $cost
 * @property-read string $currency
 * @property-read string $delivery
 *
 */
class flatrateShipping extends waShipping
{
    /**
     * Core shipping rate calculation method.
     * Returns the list (array) of estimated shipping rates and transit times
     *
     * Useful parent class (waShipping) methods to be used in calculate():
     * $price = $this->getTotalPrice();
     * $weight = $this->getTotalWeight();
     */
    public function calculate()
    {
        return array(
            'ground' => array(
                'name' => /*_wp*/('Ground shipping'),
                'description' => /*_wp*/(''),
                'est_delivery' => waDateTime::format('humandate',  strtotime($this->delivery) ), //string
                'currency' => $this->currency,
                'rate' => $this->cost,
            ),
/*
            //ADD AS MANY SHIPPING OPTIONS AS YOU LIKE
            'priority' => array(
                'name' => 'Priority shipping',
                'description' => '',
                'estimated_delivery_date' => strtotime($this->delivery),
                'currency' => $this->currency,
                'rate_min' => $this->cost,
                'rate_max' => $this->cost,
                'rate' => $this->cost,
            ),
            'expedited' => array(
                'name' => 'Expedited shipping',
                'description' => '',
                'estimated_delivery_date' => strtotime($this->delivery),
                'currency' => $this->currency,
                'rate_min' => $this->cost,
                'rate_max' => $this->cost,
                'rate' => $this->cost,
            ),
*/
        );
    }

    /**
     * Returns ISO3 code of the currency this module can work with (or array of ISO3 codes)
     * @see waShipping::allowedCurrency()
     */
    public function allowedCurrency()
    {
        return $this->currency; // return array('USD','EUR');

    }

    /**
     * Returns the weight unit this module work with (or array of weight units)
     * @see waShipping::allowedWeightUnit()
     */
    public function allowedWeightUnit()
    {
        return 'kg'; // return array('kg','lbs');

    }

    /**
     * Returns the general tracking information (HTML)
     * @see waShipping::allowedWeightUnit()
     */
    public function tracking($tracking_id = null)
    {
        return ''; // return 'Online shipment tracking: <a href="link">link</a>';
    }

    /**
     * Returns the list of printable forms this module offers
     */
    public function getPrintForms()
    {
        return array(
            'flatrate_form' => array(
                'name' => /*_wp*/('Sample consignment note'),
                'description' => /*_wp*/(''),
            ),
        );
    }

    /**
     * Displays the print form content (HTML).
     * Form id list is defined in getPrintForms() method
     */
    public function displayPrintForm($id, $items = null, $address = null, $params = array())
    {
        if ($id = 'flatrate_form') {
            $view = wa()->getView();
            $view->assign('currency', $this->currency);
            $view->assign('items', $items);
            $view->assign('address', $address);
            $view->assign('params', $params);
            return $view->fetch($this->path.'/templates/form.html');
        } else {
            throw new waException(/*_wp*/('Printable form not found'));
        }
    }

    /**
     * Sets mask for destination addresses that this shipping module allows shipping to
     */
    public function allowedAddress()
    {
        return array(

        );
    }
}
