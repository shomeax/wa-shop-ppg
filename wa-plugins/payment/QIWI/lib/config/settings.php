<?php
return array(
    'login'          => array(
        'value'        => '',
        'title'        => 'Идентификатор (логин)',
        'description'  => '',
        'control_type' => 'input',
    ),
    'password'       => array(
        'value'        => '',
        'title'        => 'Пароль',
        'description'  => '',
        'control_type' => 'password',
    ),
    'lifetime'       => array(
        'value'        => 24,
        'title'        => 'Время жизни счета',
        'description'  => 'Укажите срок оплаты счета в часах',
        'control_type' => 'input',
    ),
    'alarm'          => array(
        'value'        => 0,
        'title'        => 'Уведомления',
        'description'  => 'Параметры отправки уведомлений',
        'control_type' => 'select QIWIPayment::_getAlarmVariants',
    ),
    'prefix'         => array(
        'value'        => '',
        'title'        => 'Префикс счета',
        'description'  => 'Используйте цифры и латинские буквы для ввода префикса номера счета в системе QIWI',
        'control_type' => 'input',
    ),
    'customer_phone' => array(
        'value'        => 'phone',
        'title'        => 'Телефон покупателя',
        'description'  => 'Выберите поле вашей формы регистрации, соответствующее телефонному номеру покупателя',
        'control_type' => 'contactfield',
    ),
    'TESTMODE'       => array(
        'value'        => false,
        'title'        => 'Обрабатывать запросы без пароля',
        'description'  => 'Используйте этот режим для обработки запросов, инициированных вручную из личного кабинета QIWI.',
        'control_type' => 'checkbox',
    ),
);
