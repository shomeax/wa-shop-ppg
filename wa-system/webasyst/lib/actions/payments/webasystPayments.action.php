<?php

/**
 * Payments callback
 *
 * Available by URL:
 *     http://ROOT_PATH/payments.php/s:module_id/
 */
class webasystPaymentsAction extends waViewAction
{
    public function execute()
    {
        $params = waRequest::request();
        $params['result'] = true;

        $result = waPayment::callback(waRequest::param('module_id'), $params);

        if (!empty($result['template'])) {
            $this->template = $result['template'];
        } elseif (isset($result['template'])) {
            exit;
        }

        $this->view->assign('params', $params);
        $this->view->assign('result', $result);
    }
}
