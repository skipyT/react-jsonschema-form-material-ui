/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable no-tabs */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-shadow */
/* eslint-disable no-return-assign */
/* eslint-disable no-param-reassign */
/* eslint-disable no-mixed-operators */
/* eslint-disable no-void */
/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
import without from 'lodash/without';
import { serializer } from '../components/lib/RichText';
import getProps from './get-props';
import getInputType from './get-input-type';
import valuesToOptions from './values-to-options';

const toNumber = (v, options = false) => {
  if (v === '' || v === undefined) return v;
  if (options && options.useLocaleString) return v.replace(/[^\d,.]/g, '');
  const n = Number(v);
  return (!Number.isNaN(n) ? n : v);
};

const stringify = (val, depth, replacer, space, onGetObjID) => {
  depth = isNaN(+depth) ? 1 : depth;
  const recursMap = new WeakMap();

  function _build(val, depth, o, a, r) {
    return !val || typeof val !== 'object' ? val
      : (r = recursMap.has(val),
        recursMap.set(val, true),
        a = Array.isArray(val),
        r ? (o = onGetObjID && onGetObjID(val) || null) : JSON.stringify(val, (k, v) => {
          if (a || depth > 0) {
            if (replacer) v = replacer(k, v);
            if (!k) return (a = Array.isArray(v), val = v);
            !o && (o = a ? [] : {});
            o[k] = _build(v, a ? depth : depth - 1);
          }
        }),
        o === void 0 ? {} : o);
  }

  const stageVal = _build(val, depth);
  const finalVal = (JSON.stringify(stageVal) === '{}') ? null : stageVal;
  return JSON.stringify(finalVal, null, space);
};

const coerceValue = (type, value, options = false) => {
  switch (type) {
    case 'string':
      return (typeof value === 'string' ? value : String(value));
    case 'number':
    case 'integer':
    case 'double':
    case 'float':
    case 'decimal':
      return toNumber(value, options);
    default:
      return value;
  }
};

const formatDateValue = (val) => val && val.format && val.format() || '';

const parseCurrencyValue = (value, useLocaleString) => {
  let n = 1.1;
  n = n.toLocaleString(useLocaleString)
    .substring(1, 2);
  const whatDecimalSeparatorRegex = n === '.' ? /[^\d]/g : /[^\d,.]/g;
  return n === '.' ? value.replace(whatDecimalSeparatorRegex, '') : value.replace(whatDecimalSeparatorRegex, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
};

const onChangeHandler = (onChange, type, widget, options, isCustomComponent) => (e) => {
  const value = (type === 'material-date' || type === 'material-time' || type === 'material-datetime')
    ? formatDateValue(e)
    : (widget === 'material-multiselect' || widget === 'material-select' || widget === 'creatable-select')
      ? coerceValue(type, stringify(e))
      : (type === 'upload') ? coerceValue(type, e) : (options === 'rich-text-editor') ? serializer.serialize(e) : coerceValue(type, e.target.value, options);
  if (value !== undefined) onChange(value);
};

const onCheckboxChangeHandler = (onChange, title) => (e) => {
  const spec = {};
  if (e) {
    spec.$push = [title];
  }
  else {
    spec.$apply = (arr) => without(arr, title);
  }
  return onChange(spec);
};

export default ({ schema = {}, uiSchema = {}, isCustomComponent, inputValue, onChange, onKeyDown, creatableSelectValue, onCreatableSelectChange, onInputChange, htmlid, data, objectData }) => {
  const widget = uiSchema['ui:widget'];
  const options = uiSchema['ui:options'] || {};
  const { type } = schema;

  const rv = isCustomComponent
    ? {
      type: getInputType(type, uiSchema),
      onChange:
        !isCustomComponent
        && onChange
        && onChangeHandler(onChange, type, widget, options),
      onKeyDown,
      ...isCustomComponent({ onChange }).props,
      ...getProps(uiSchema),
      ...getProps(uiSchema, 'custom')
    }
    : {
      type: getInputType(type, uiSchema),
      onChange:
        !isCustomComponent
        && onChange
        && onChangeHandler(onChange, type, widget, options),
      onKeyDown,
      ...getProps(uiSchema)
    };

  if (
    isCustomComponent
    && isCustomComponent({ onChange })
    && isCustomComponent({ onChange }).props
    && isCustomComponent({ onChange }).props.onChange
  ) {
    rv.onChange = isCustomComponent({ onChange }).props.onChange;
  }
  else {
    if (schema.enum) {
      if (widget === 'radio') {
        if (options.inline) {
          rv.row = true;
        }
      }
      else if (widget === 'checkboxes') {
        rv.onChange = onChange && onCheckboxChangeHandler(onChange, schema.title);
        rv.label = schema.title;
      }
      else {
        rv.nullOption = 'Please select...';
      }
      rv.label = schema.title || '';
      if (widget === 'material-select' || widget === 'material-multiselect') {
        rv.multiSelect = widget === 'material-multiselect';
        rv.isClearable = uiSchema['ui:isClearable'] || false;
      }

      if (widget === 'creatable-select') {
        rv.optionsOnly = true;
      }

      rv.options = valuesToOptions(schema.enum);
    }
    else if (type === 'boolean') {
      rv.label = schema.title;
      rv.onChange = onChange;
    }
    else if (type === 'upload') {
      rv.label = schema.title;
      rv.buttonType = widget || 'outlined';
      rv.acceptValues = uiSchema['ui:accept'] || '*';
      rv.isMulti = uiSchema['ui:isMulti'] || false;
      rv.buttonIcon = uiSchema['ui:icon'] || 'add_circle';
      rv.buttonTitle = uiSchema['ui:buttonTitle'] || 'Upload';
    }
    else {
      rv.label = schema.title || '';
      rv.inputProps = {
        id: htmlid,
      };
    }
    if (widget === 'textarea') {
      rv.multiline = true;
      rv.rows = 5;
    }

    if (options.useLocaleString) {
      rv.onBlur = (event) => {
        const { value } = event.target;
        return (
          value
          && onChange(
            Number(
              parseCurrencyValue(value, options.useLocaleString),
            )
              .toLocaleString(options.useLocaleString),
          )
        );
      };
    }

    if (options.disabled) {
      if (typeof options.disabled === 'boolean') {
        rv.disabled = options.disabled;
      }
      else if (typeof options.disabled === 'function') {
        rv.disabled = options.disabled.call(null, data, objectData);
      }
    }
  }

  rv.htmlid = htmlid;

  return rv;
};
