<?php

require_once dirname(__FILE__) . '/../wa-system/autoload/waAutoload.class.php';
waAutoload::register();

waAutoload::getInstance()->add(array(
    'myRouting' => 'wa-apps/warehouse/lib/site/myRouting.class.php',
    'siteConfig' => 'wa-apps/site/lib/config/siteConfig.class.php',
    'mySiteConfig' => 'wa-apps/warehouse/lib/site/mySiteConfig.class.php',
    'myFrontController' => 'wa-apps/warehouse/lib/site/myFrontController.class.php',
    'mySiteFrontendController' => 'wa-apps/warehouse/lib/site/mySiteFrontend.controller.php',
    'mySiteFrontendLayout' => 'wa-apps/warehouse/lib/site/mySiteFrontendLayout.class.php',
    'siteFrontendSidebarAction' => 'wa-apps/warehouse/lib/site/siteFrontendSidebar.action.php',
));

class SystemConfig extends waSystemConfig {

    public static function getAppConfig($application, $environment = null, $root_path = null, $locale = null) {
        //hook creating app's config and create proxy config over siteConfig
        if ($application == 'site') {
            if ($root_path === null) {
                $root_path = realpath(dirname(__FILE__) . '/..');
            }

            if ($environment === null) {
                $environment = waSystem::getInstance()->getEnv();
            }

            return new mySiteConfig($environment, $root_path, $application, $locale);
        }

        return parent::getAppConfig($application, $environment, $root_path, $locale);
    }

}