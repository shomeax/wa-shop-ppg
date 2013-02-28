<?php
abstract class waSystemPlugin
{

    private $settings = null;
    private $config;
    protected $path;

    /**
     *
     * Plugin class id
     * @var string
     */
    protected $id;
    protected $key;
    /*
     * @var waiPluginSettings
     */
    private $adapter;

    /**
     *
     * Enter description here ...
     * @param waiPluginSettings $model
     * @param string $key
     * @throws waException
     */
    protected function __construct(waiPluginSettings $model = null, $key = null)
    {
        $this->adapter = $model;
        $this->key = $key;
        $this->init();
    }

    protected function init()
    {
    }

    private function __clone()
    {
    }

    /**
     * Список доступных плагинов
     * @param $options array
     * @return array
     */
    public static function enumerate($options = array(), $type = null)
    {
        $plugins = array();
        foreach (waFiles::listdir(self::getPath($type)) as $id) {
            if ($info = self::info($id, $options = array(), $type)) {
                $plugins[$id] = $info;
            }
        }
        return $plugins;
    }

    protected static function getPath($type, $id = null)
    {
        if (!$type) {
            throw new waException('Invalid method usage');
        }
        $path = waSystem::getInstance()->getConfig()->getPath('plugins');
        $path .= DIRECTORY_SEPARATOR.$type;
        if ($id) {
            if (!preg_match('@^[a-z][a-z0-9_]*$@i', $id)) {
                return null;
            }
            $path .= DIRECTORY_SEPARATOR.$id;

        }
        return $path;
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
    public static function info($id, $options = array(), $type = null)
    {
        $base_path = self::getPath($type, $id);
        $config_path = $base_path.DIRECTORY_SEPARATOR.'lib'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'plugin.php';

        $plugin = null;
        if ($config_path && file_exists($config_path) && ($config = include($config_path))) {
            $default = array(
                'name'        => preg_replace('@[A-Z]@', ' $1', $id),
                'description' => '',
            );
            if (!is_array($config)) {
                $config = array();
            }
            $build_file = $base_path.DIRECTORY_SEPARATOR.'lib'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'build.php';
            if (file_exists($build_file)) {
                $config['build'] = include($build_file);
            } else {
                if (SystemConfig::isDebug()) {
                    $config['build'] = time();
                } else {
                    $config['build'] = 0;
                }
            }
            if (!empty($config['version'])) {
                $config['version'] .= '.'.$config['build'];
            }
            if (!empty($config['icon'])) {
                if (is_array($config['icon'])) {
                    foreach ($config['icon'] as $size => $url) {
                        $config['icon'][$size] = wa()->getRootUrl().'wa-plugins/'.$type.'/'.$id.'/'.$url;
                    }
                } else {
                    $config['icon'] = array(
                        48 => wa()->getRootUrl().'wa-plugins/'.$type.'/'.$id.'/'.$config['icon'],
                    );
                }
            } else {
                $config['icon'] = array();
            }
            if (!empty($config['img'])) {
                $config['img'] = wa()->getRootUrl().'wa-plugins/'.$type.'/'.$id.'/'.$config['img'];
            } else {
                $config['img'] = isset($config['icon'][48]) ? $config['icon'][48] : false;
            }
            if (!isset($config['icon'][48])) {
                $config['icon'][48] = $config['img'];
            }
            if (!isset($config['icon'][24])) {
                $config['icon'][24] = $config['icon'][48];
            }
            if (!isset($config['icon'][16])) {
                $config['icon'][16] = $config['icon'][24];
            }
            if (!isset($config['logo'])) {
                $config['logo'] = $config['icon'][48];
            } elseif (!empty($config['logo'])) {
                $config['logo'] = wa()->getRootUrl().'wa-plugins/'.$type.'/'.$id.'/'.$config['logo'];
            }
            $plugin = array_merge($default, $config);
        }
        return $plugin;
    }

    /**
     *
     * Получение списка настраиваемых значений модуля доставки
     */
    public function getSettings($name = null)
    {
        if ($this->settings === null) {
            $this->settings = array();
            if ($config = $this->config()) {
                $model = $this->adapter();
                $this->settings = $model->get($this->key);
                foreach ($config as $key => $default) {
                    if (!isset($this->settings[$key])) {
                        $this->settings[$key] = isset($default['value']) ? $default['value'] : null;
                    } elseif ($json = json_decode($this->settings[$key], true)) {
                        $this->settings[$key] = $json;
                    }
                }
            }
        }
        if ($name === null) {
            return $this->settings;
        } else {
            return isset($this->settings[$name]) ? $this->settings[$name] : null;
        }
    }

    protected function setSettings($settings = array())
    {
        $this->settings = array();
        if ($config = $this->config()) {
            $this->settings = $settings;
            foreach ($config as $key => $default) {
                if (!isset($this->settings[$key])) {
                    $this->settings[$key] = isset($default['value']) ? $default['value'] : null;
                }
            }
        }
    }

    /**
     *
     * @return string
     */
    final public function getId()
    {
        return $this->id;
    }

    /**
     *
     * Return plugin property, described at plugin config
     * @param string $property
     */
    final public function getProperties($property = null)
    {
        if (!isset($this->properties)) {
            $this->properties = $this->info($this->id);
        }
        return isset($property) ? (isset($this->properties[$property]) ? $this->properties[$property] : false) : $this->properties;
    }

    /**
     * @return string
     */
    final public function getName()
    {
        return $this->getProperties('name');
    }

    final public function getDescription()
    {
        return $this->getProperties('description');
    }

    final public function getType()
    {
        return $this->getProperties('type');
    }

    public function __get($name)
    {
        return $this->getSettings($name);
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
        $base_path = self::getPath($type, $id);
        if (!$base_path) {
            throw new waException(sprintf('Invalid module ID %s', $id));
        }
        $path = $base_path.sprintf('%2$slib%2$s%1$s%3$s.class.php', $id, DIRECTORY_SEPARATOR, ucfirst($type));
        if (file_exists($path)) {
            require_once($path);
        }
        $class = $id.ucfirst($type);

        if (class_exists($class)) {
            $plugin = new $class($adapter, $key);
            if (!($plugin instanceof self)) {
                throw new waException('Invalid parent class');
            }
            $plugin->path = $base_path;
            $plugin->id = $id;
        } else {
            throw new waException(sprintf("%s plugin class %s not found ", $type, $class));
        }
        return $plugin;
    }

    protected function initControls()
    {
    }

    /**
     * Register user input control
     * @param string $type
     * @param callback $callback
     * @return waShipping Current object
     */
    protected function registerControl($type, $callback = null)
    {
        if (is_null($callback)) {
            $callback = array(get_class($this), "setting{$type}");
        }
        waHtmlControl::registerControl($type, $callback);
        return $this;
    }

    /**
     *
     * Получение массива элементов настроек
     * @param array[string]mixed $params
     * @param array[string]string $params['namespace']
     * @param array[string]string $params['value']'
     * @return string
     */
    public function getSettingsHTML($params = array())
    {
        $this->initControls();
        $controls = array();
        $default = array(
            'instance'            => & $this,
            'title_wrapper'       => '%s',
            'description_wrapper' => '<br><span class="hint">%s</span>',
            'control_wrapper'     => '
<div class="field">
    <div class="name">%s</div>
    <div class="value">%s%s</div>
</div>
',
        );
        $params = array_merge($default, $params);
        foreach ($this->config() as $name => $row) {
            $row = array_merge($row, $params);
            $row['value'] = $this->getSettings($name);
            if (isset($params['value']) && isset($params['value'][$name])) {
                $row['value'] = $params['value'][$name];
            }
            if (!empty($row['control_type'])) {
                $controls[$name] = waHtmlControl::getControl($row['control_type'], $name, $row);
            }
        }
        return implode("\n", $controls);
    }

    private function config()
    {
        if ($this->config === null) {
            $path = $this->path.'/lib/config/settings.php';
            if (file_exists($path)) {
                $this->config = include($path);

            }
            if (!is_array($this->config )) {
                $this->config = array();
            }
        }
        return $this->config;
    }

    /**
     *
     * Инициализация значений настроек модуля доставки
     */

    public function saveSettings($settings = array())
    {
        $settings_config = $this->config();
        $data = array();
        foreach ($settings_config as $name => $row) {
            // remove
            if (!isset($settings[$name])) {
                $this->settings[$name] = isset($row['value']) ? $row['value'] : null;
                $this->adapter()->del($this->key, $name);
            }
        }
        foreach ($settings as $name => $value) {
            $this->settings[$name] = $value;
            // save to db
            $this->adapter()->set($this->key, $name, is_array($value) ? json_encode($value) : $value);
        }
        return $data;
    }

    /**
     * @return waiPluginSettings
     */
    private function adapter()
    {
        if (!$this->adapter) {
            $this->adapter = new waAppSettingsModel();
        }
        return $this->adapter;
    }
}
