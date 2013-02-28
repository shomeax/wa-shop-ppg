<?php

/*
 * This file is part of Webasyst framework.
 *
 * Licensed under the terms of the GNU Lesser General Public License (LGPL).
 * http://www.webasyst.com/framework/license/
 *
 * Conditional field: show <select> with options from wa_contact_field_values, when parent field has known value;
 * otherwise, show <input type="text">.
 *
 * @link http://www.webasyst.com/
 * @author Webasyst LLC
 * @copyright 2011 Webasyst LLC
 * @package wa-system
 * @subpackage contact
 */
class waContactConditionalField extends waContactField
{
    public function getInfo()
    {
        $info = parent::getInfo();
        $info['parent_options'] = reset($this->getOptions());
        $info['parent_field'] = key($this->getOptions());
        return $info;
    }

    public function getOptions()
    {
        $id = $this->getId();
        $parent = $this->getParameter('parent_id');
        if ($parent) {
            $id = $parent.':'.$id;
        }
        static $cfdm = null;
        if (!$cfdm) {
            $cfdm = new waContactFieldValuesModel();
        }
        $result = array();
        foreach ($cfdm->where('field=?', $id)->order('sort')->query() as $row) {
            $result[$row['parent_field']][$row['parent_value']][] = $row['value'];
        }
        return $result;
    }

    protected function getInputHtml($name_input, $value, $attrs)
    {
        $name_html = $name_input === null ? ' style="display:none"' : ' name="'.htmlspecialchars($name_input).'"';
        $value_html = $value === null ? '' : ' value="'.htmlspecialchars($value).'"';
        $attrs = $attrs ? ' '.$attrs : '';
        return '<input type="text"'.$name_html.$value_html.$attrs.'>';
    }

    protected function getSelectHtml($name_input, $value, $attrs, $options)
    {
        $opts = array();
        if ($options) {
            foreach ($options as $option_value) {
                $at = ($value !== null && $value == $option_value) ? ' selected' : '';
                $option_value = htmlspecialchars($option_value);
                $opts[] = '<option value="'.$option_value.'"'.$at.'>'.$option_value.'</option>';
            }
        }
        $name_html = $name_input === null ? ' style="display:none"' : ' name="'.htmlspecialchars($name_input).'"';
        $attrs = $attrs ? ' '.$attrs : '';
        return '<select'.$name_html.$attrs.">\n\t".implode("\n\t", $opts)."\n</select>";
    }

    public function getHtmlOne($params = array(), $attrs = '')
    {
        $value = isset($params['value']) ? $params['value'] : '';
        $ext = null;
        $multi_suffix = '';
        if (is_array($value)) {
            $ext = $value['ext'];
            $value = $value['value'];
        }

        $name_input = $name = $this->getHTMLName($params);
        if ($this->isMulti()) {
            $name_input .= '[value]';
        }

        // When we're a part of a composite field, show <select> or <input>
        // depending on values of other fields.
        // Otherwise, show a simple <input>.
        $html = '';
        $parent_field = null;
        $possible_options = $this->getOptions();
        if (empty($params['composite_value'])) {
            $html = $this->getInputHtml($name_input, $value, $attrs);
            $html .= $this->getSelectHtml(null, null, $attrs, null);
        } else {
            foreach($possible_options as $p_fld => $parent_values) {
                if (!empty($params['composite_value'][$p_fld])) {
                    $parent_field = $p_fld;
                    break;
                }
            }
            if ($parent_field === null) {
                $html = $this->getInputHtml($name_input, $value, $attrs);
                $html .= $this->getSelectHtml(null, null, $attrs, null);
            } else {
                $parent_value = $params['composite_value'][$p_fld];
                if (empty($possible_options[$parent_field][$parent_value])) {
                    $html = $this->getInputHtml($name_input, $value, $attrs);
                    $html .= $this->getSelectHtml(null, null, $attrs, null);
                } else {
                    $html = $this->getInputHtml(null, null, $attrs);
                    $html .= $this->getSelectHtml($name_input, $value, $attrs, $possible_options[$parent_field][$parent_value]);
                }
            }
        }
        if (!$parent_field) {
            reset($possible_options);
            $parent_field = key($possible_options);
        }

        // JS to change field HTML when user changes country.
        $js = '';
        if ($parent_field && !empty($possible_options[$parent_field])) {
            $p = $params;
            $p['id'] = explode(':', $parent_field);
            $p['id'] = array_pop($p['id']);
            $name_parent = $this->getHTMLName($p);
            $values = json_encode($possible_options[$parent_field]);
            $js = <<<EOJS
<script>if($){ $(function() {
    var parent_field = $('[name="{$name_parent}"]');
    if (parent_field.length <= 0) {
        return;
    }
    var input_name = "{$name_input}";
    var values = {$values};
    var select;
    var input = $('[name="'+input_name+'"]');
    if (input.length <= 0) {
        return;
    }
    if (input.is('input')) {
        select = input.next();
    } else {
        select = input;
        input = select.prev();
    }

    var showInput = function() {
        if (!input[0].hasAttribute('name')) {
            input.attr('name', select.attr('name'))
            select[0].removeAttribute('name');
        }
        input.show().val('');
        select.hide();
    };

    parent_field.change(function() {
        var parent_value = $(this).val();
        if (values && values[parent_value]) {
            input.hide();
            select.show().children().remove();
            for (i = 0; i < values[parent_value].length; i++) {
                select.append($('<option></option>').attr('value', values[parent_value][i]).text(values[parent_value][i]));
            }
        } else {
            if (!input.is(':visible')) {
                showInput();
            }
        }
    });
});};</script>
EOJS;
        }

        return $html.$js;
    }
}
