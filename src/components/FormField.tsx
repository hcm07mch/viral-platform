'use client';

import { useState } from 'react';
import '@/styles/formField.css';

export type FieldType = 
  | 'NUMBER' 
  | 'TEXT' 
  | 'TEXTAREA'
  | 'IMAGE' 
  | 'URL' 
  | 'DATE' 
  | 'SELECT' 
  | 'MULTISELECT' 
  | 'FILE';

export interface FormFieldProps {
  id: string;
  type: FieldType;
  label: string;
  helpText?: string;
  placeholder?: string;
  value?: any;
  onChange?: (value: any) => void;
  required?: boolean;
  options?: { value: string; label: string }[]; // SELECT, MULTISELECT용
  accept?: string; // FILE, IMAGE용
  min?: number | string; // NUMBER, DATE용
  max?: number | string; // NUMBER, DATE용
  disabled?: boolean;
}

export default function FormField({
  id,
  type,
  label,
  helpText,
  placeholder,
  value,
  onChange,
  required = false,
  options = [],
  accept,
  min,
  max,
  disabled = false,
}: FormFieldProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const handleChange = (newValue: any) => {
    if (onChange && !disabled) {
      onChange(newValue);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      handleChange(file);
    }
  };

  const handleMultiSelectChange = (optionValue: string) => {
    const currentValues = Array.isArray(value) ? value : [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue];
    handleChange(newValues);
  };

  const handleQuickAdd = (amount: number) => {
    const currentValue = parseInt(value || '0');
    const newValue = currentValue + amount;
    handleChange(newValue.toString());
  };

  const handleReset = () => {
    handleChange('');
  };

  const renderInput = () => {
    switch (type) {
      case 'NUMBER':
        // 필드별 quick add 값 설정
        const getQuickAddValues = () => {
          if (id === 'daily_qty') {
            return [5, 10, 50, 100];
          } else if (id === 'weeks') {
            return [1, 2, 5, 10];
          }
          return [1, 5, 10, 50]; // 기본값
        };

        const quickAddValues = getQuickAddValues();

        return (
          <div className="number-field-container">
            <div className="number-input-with-reset">
              <input
                type="number"
                id={id}
                className="field-input number-input"
                placeholder={placeholder}
                value={value || ''}
                onChange={(e) => handleChange(e.target.value)}
                min={min}
                max={max}
                disabled={disabled}
                required={required}
              />
              <button
                type="button"
                className="reset-btn"
                onClick={handleReset}
                disabled={disabled || !value}
                title="초기화"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="quick-add-buttons">
              {quickAddValues.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="quick-add-btn"
                  onClick={() => handleQuickAdd(amount)}
                  disabled={disabled}
                >
                  +{amount}
                </button>
              ))}
            </div>
          </div>
        );

      case 'TEXT':
        return (
          <input
            type="text"
            id={id}
            className="field-input"
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            required={required}
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            id={id}
            className="field-input field-textarea"
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            required={required}
            rows={4}
          />
        );

      case 'URL':
        return (
          <input
            type="url"
            id={id}
            className="field-input"
            placeholder={placeholder || 'https://example.com'}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            required={required}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            id={id}
            className="field-input"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            min={typeof min === 'string' ? min : undefined}
            max={typeof max === 'string' ? max : undefined}
            disabled={disabled}
            required={required}
          />
        );

      case 'SELECT':
        return (
          <select
            id={id}
            className="field-input field-select"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            required={required}
          >
            <option value="">{placeholder || '선택하세요'}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'MULTISELECT':
        return (
          <div className="field-multiselect">
            {options.map((opt) => (
              <label key={opt.value} className="multiselect-option">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(opt.value)}
                  onChange={() => handleMultiSelectChange(opt.value)}
                  disabled={disabled}
                />
                <span className="multiselect-label">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case 'FILE':
      case 'IMAGE':
        return (
          <div className="field-file-wrapper">
            <input
              type="file"
              id={id}
              className="field-file-input"
              accept={accept || (type === 'IMAGE' ? 'image/*' : undefined)}
              onChange={handleFileChange}
              disabled={disabled}
              required={required}
            />
            <label htmlFor={id} className="field-file-label">
              <svg
                className="file-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="file-text">
                {fileName || placeholder || '파일을 선택하거나 드래그하세요'}
              </span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`form-field ${disabled ? 'form-field-disabled' : ''}`}>
      <div className="field-label-row">
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="field-required">*</span>}
        </label>
        {helpText && (
          <>
            <div
              className="help-icon"
              onMouseEnter={() => setShowHelp(true)}
              onMouseLeave={() => setShowHelp(false)}
            >
              ?
            </div>
            {showHelp && (
              <div className="help-tooltip">{helpText}</div>
            )}
          </>
        )}
      </div>
      {renderInput()}
    </div>
  );
}
