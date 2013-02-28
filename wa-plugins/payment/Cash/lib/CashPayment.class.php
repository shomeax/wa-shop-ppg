<?php
class CashPayment extends waPayment implements waIPayment
{
    public function payment($payment_form_data, $order_data, $transaction_type)
    {
        return '';
    }
}
