import { ChangeEvent, TextareaHTMLAttributes, useEffect, useState } from 'react';

interface TextInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (value: string) => { valid: boolean; message?: string };
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  validateOnChange?: boolean;
  autoFocus?: boolean;
}

const TextInput = ({
  value,
  onChange,
  onValidate,
  minLength = 0,
  maxLength = 500,
  placeholder = 'Type your answer here...',
  validateOnChange = false,
  autoFocus = false,
  ...props
}: TextInputProps) => {
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message?: string }>({ valid: true });
  const [charCount, setCharCount] = useState<number>(value.length);
  
  useEffect(() => {
    setCharCount(value.length);
    
    if (validateOnChange && onValidate) {
      setValidationResult(onValidate(value));
    }
  }, [value, validateOnChange, onValidate]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Only allow changes that don't exceed maxLength
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const handleBlur = () => {
    if (onValidate) {
      setValidationResult(onValidate(value));
    }
  };

  return (
    <div className="text-input w-full">
      <div className="relative">
        <textarea
          className={`w-full p-3 border ${
            validationResult.valid ? 'border-gray-300' : 'border-red-300'
          } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[100px]`}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoFocus={autoFocus}
          {...props}
        />
      </div>
      
      <div className="flex justify-between text-xs mt-1">
        {validationResult.valid === false && (
          <p className="text-red-500">{validationResult.message}</p>
        )}
        
        <div className="ml-auto flex items-center text-gray-500">
          <span className={charCount < minLength ? 'text-red-500' : ''}>
            {charCount}
          </span>
          <span>/</span>
          <span>{maxLength}</span>
        </div>
      </div>
    </div>
  );
};

export default TextInput; 