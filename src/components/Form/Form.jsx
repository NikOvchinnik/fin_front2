import { useForm, Controller } from 'react-hook-form';
import style from './Form.module.css';
import {
  TextField,
  Checkbox,
  RadioGroup,
  Radio,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  createTheme,
  ThemeProvider,
  FormHelperText,
  Tooltip,
  Autocomplete,
} from '@mui/material';

const Form = ({
  title = null,
  fields,
  buttons = [],
  onSubmit,
  defaultValues,
  styleForm = 'formContainer',
  fontSize = 16,
}) => {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues });

  const theme = createTheme({
    typography: {
      fontFamily: 'IBM Plex Sans, serif',
      lineHeight: 1.5,
      fontSize: 14,
      h1: {
        fontWeight: 700,
        color: '#1a1a1a',
      },
      h2: {
        fontWeight: 700,
        color: '#1a1a1a',
      },
      body1: {
        fontWeight: 500,
        color: '#999',
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontSize: `${fontSize}px`,
              color: '#474747',
              '& textarea': {
                overflow: 'hidden',
                resize: 'vertical',
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
          },
          select: {
            fontSize: `${fontSize}px`,
            color: '#474747',
          },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: {
          label: {
            fontSize: `${fontSize}px`,
            color: '#474747',
          },
        },
      },
    },
  });

  const InputWrapper = ({ field, children }) => (
    <div className={style.inputWrapper}>
      {children}
      {field.button && (
        <button
          type={field.button.type || 'button'}
          className={`${style[field.button.className] || ''}`}
          onClick={field.button.onClick}
        >
          {field.button.label}
        </button>
      )}
    </div>
  );

  const renderField = field => {
    switch (field.type) {
      case 'text':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={field.validation}
            render={({ field: input }) => (
              <InputWrapper field={field}>
                <TextField
                  {...input}
                  label={field.label || ''}
                  placeholder={field.placeholder || ''}
                  fullWidth
                  error={!!errors[field.name]}
                  helperText={errors[field.name]?.message}
                  onChange={e => {
                    input.onChange(e);
                    field.onChange && field.onChange(e.target.value);
                  }}
                  slotProps={{
                    input: {
                      readOnly: field.readOnly || false,
                      style: field.readOnly
                        ? { color: '#999', backgroundColor: '#f5f5f5' }
                        : {},
                    },
                  }}
                />
              </InputWrapper>
            )}
          />
        );
      case 'text-group':
        return (
          <div className={style.inputRow}>
            {field.inputs.map((subField, index) => (
              <Controller
                key={index}
                name={subField.name}
                control={control}
                rules={subField.validation}
                render={({ field: input }) => (
                  <TextField
                    {...input}
                    label={subField.label || ''}
                    placeholder={subField.placeholder || ''}
                    fullWidth
                    error={!!errors[subField.name]}
                    helperText={errors[subField.name]?.message}
                    onChange={e => {
                      input.onChange(e);
                      field.onChange && field.onChange(e.target.value);
                    }}
                    slotProps={{
                      input: {
                        readOnly: subField.readOnly || false,
                        style: subField.readOnly
                          ? { color: '#999', backgroundColor: '#f5f5f5' }
                          : {},
                      },
                    }}
                  />
                )}
              />
            ))}
          </div>
        );
      case 'autocomplete-select':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={field.validation}
            render={({ field: input }) => (
              <Autocomplete
                options={field.options || []}
                disabled={field.readOnly || false}
                getOptionLabel={option => option.label || ''}
                value={
                  field.options.find(opt => opt.value === input.value) || null
                }
                onChange={(_, newValue) => {
                  input.onChange(newValue ? newValue.value : '');
                  field.onChange && field.onChange(newValue);
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label={field.label || ''}
                    placeholder={field.placeholder || ''}
                    error={!!errors[field.name]}
                    helperText={errors[field.name]?.message}
                  />
                )}
              />
            )}
          />
        );
      case 'number':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={{
              ...field.validation,
              pattern: {
                value: /^\d+$/,
                message: 'Only numbers',
              },
            }}
            render={({ field: input }) => (
              <InputWrapper field={field}>
                <TextField
                  {...input}
                  label={field.label || ''}
                  placeholder={field.placeholder || ''}
                  fullWidth
                  error={!!errors[field.name]}
                  helperText={errors[field.name]?.message}
                  disabled={field.readOnly || false}
                  onChange={e => {
                    input.onChange(e);
                    field.onChange && field.onChange(e.target.value);
                  }}
                  slotProps={{
                    input: {
                      inputMode: 'numeric',
                      pattern: '\\d*',
                      maxLength: field.maxLength || 10,
                      onInput: e =>
                        (e.target.value = e.target.value.replace(/\D/g, '')),
                    },
                  }}
                />
              </InputWrapper>
            )}
          />
        );
      case 'date':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={field.validation}
            render={({ field: input }) => (
              <InputWrapper field={field}>
                <TextField
                  {...input}
                  type="date"
                  label={field.label || ''}
                  placeholder={field.placeholder || ''}
                  fullWidth
                  error={!!errors[field.name]}
                  helperText={errors[field.name]?.message}
                  onChange={e => {
                    input.onChange(e);
                    field.onChange && field.onChange(e.target.value);
                  }}
                  slotProps={{
                    input: {
                      min: field.min || '',
                      max: field.max || '',
                      readOnly: field.readOnly || false,
                      style: field.readOnly
                        ? { color: '#999', backgroundColor: '#f5f5f5' }
                        : {},
                    },
                  }}
                />
              </InputWrapper>
            )}
          />
        );
      case 'textarea':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={field.validation}
            render={({ field: input }) => (
              <InputWrapper field={field}>
                <Tooltip title={input.value || ''} arrow>
                  <TextField
                    {...input}
                    label={field.label || ''}
                    placeholder={field.placeholder || ''}
                    fullWidth
                    multiline
                    rows={field.rows || 2}
                    error={!!errors[field.name]}
                    helperText={errors[field.name]?.message}
                    onChange={e => {
                      input.onChange(e);
                      field.onChange && field.onChange(e.target.value);
                    }}
                    onFocus={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    slotProps={{
                      input: {
                        readOnly: field.readOnly || false,
                        style: field.readOnly
                          ? { color: '#999', backgroundColor: '#f5f5f5' }
                          : {},
                      },
                    }}
                  />
                </Tooltip>
              </InputWrapper>
            )}
          />
        );
      case 'checkbox':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={field.validation}
            render={({ field: input }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    {...input}
                    checked={field.checked ?? !!input.value}
                    disabled={field.readOnly || false}
                    onChange={e => {
                      const newChecked = e.target.checked;
                      input.onChange(newChecked);
                      field.onChange && field.onChange(newChecked);
                    }}
                  />
                }
                label={field.label || ''}
              />
            )}
          />
        );
      case 'checkbox-group':
        return (
          <InputWrapper field={field}>
            <div className={style.checkboxContainer}>
              {field.checkboxes.map((checkbox, index) => (
                <Controller
                  key={index}
                  name={checkbox.name}
                  control={control}
                  rules={checkbox.validation}
                  render={({ field: input }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...input}
                          checked={!!input.value}
                          disabled={checkbox.readOnly || false}
                          onChange={e => {
                            const newChecked = e.target.checked;
                            input.onChange(newChecked);
                            field.onChange &&
                              field.onChange(checkbox.name, newChecked);
                          }}
                        />
                      }
                      label={checkbox.label}
                    />
                  )}
                />
              ))}
            </div>
          </InputWrapper>
        );
      case 'radio':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={field.validation}
            render={({ field: input }) => (
              <RadioGroup
                {...input}
                value={input.value || ''}
                onChange={e => {
                  input.onChange(e);
                  field.onChange && field.onChange(e.target.value);
                }}
                disabled={field.readOnly || false}
              >
                {field.options.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    value={option.value}
                    control={<Radio />}
                    label={option.label}
                    disabled={field.readOnly || false}
                  />
                ))}
              </RadioGroup>
            )}
          />
        );
      case 'select':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={field.validation}
            render={({ field: input }) => (
              <InputWrapper field={field}>
                <FormControl fullWidth error={!!errors[field.name]}>
                  {field.label && <InputLabel>{field.label}</InputLabel>}
                  <Select
                    {...input}
                    label={field.label || ''}
                    disabled={field.disabled || field.readOnly || false}
                    onChange={e => {
                      input.onChange(e);
                      field.onChange && field.onChange(e.target.value);
                    }}
                  >
                    {field.options.map((option, index) => (
                      <MenuItem key={index} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors[field.name] && (
                    <FormHelperText>
                      {errors[field.name]?.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </InputWrapper>
            )}
          />
        );
      case 'select-group':
        return (
          <div className={style.inputRow}>
            {field.inputs.map((subField, index) => (
              <Controller
                key={index}
                name={subField.name}
                control={control}
                rules={subField.validation}
                render={({ field: input }) => (
                  <FormControl fullWidth error={!!errors[subField.name]}>
                    {subField.label && (
                      <InputLabel>{subField.label}</InputLabel>
                    )}
                    <Select
                      {...input}
                      label={subField.label || ''}
                      disabled={subField.readOnly || false}
                      onChange={e => {
                        input.onChange(e);
                        subField.onChange && subField.onChange(e.target.value);
                      }}
                    >
                      {subField.options.map((option, i) => (
                        <MenuItem key={i} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors[subField.name] && (
                      <FormHelperText>
                        {errors[subField.name]?.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            ))}
          </div>
        );
      case 'text-select-group':
        return (
          <div className={style.inputRow}>
            <Controller
              name={field.text.name}
              control={control}
              rules={field.text.validation}
              render={({ field: input }) => (
                <TextField
                  {...input}
                  label={field.text.label || ''}
                  placeholder={field.text.placeholder || ''}
                  fullWidth
                  error={!!errors[field.text.name]}
                  helperText={errors[field.text.name]?.message}
                  slotProps={{
                    input: {
                      readOnly: field.readOnly || false,
                      style: field.readOnly
                        ? { color: '#999', backgroundColor: '#f5f5f5' }
                        : {},
                    },
                  }}
                />
              )}
            />
            <Controller
              name={field.select.name}
              control={control}
              rules={field.select.validation}
              render={({ field: input }) => (
                <FormControl fullWidth error={!!errors[field.select.name]}>
                  {field.select.label && (
                    <InputLabel>{field.select.label}</InputLabel>
                  )}
                  <Select
                    {...input}
                    disabled={field.select.readOnly || false}
                    onChange={e => {
                      input.onChange(e);
                      field.select.onChange &&
                        field.select.onChange(e.target.value);
                    }}
                  >
                    {field.select.options.map((option, i) => (
                      <MenuItem key={i} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors[field.select.name] && (
                    <FormHelperText>
                      {errors[field.select.name]?.message}
                    </FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </div>
        );
      case 'number-select-group':
        return (
          <div className={style.inputRow}>
            <Controller
              name={field.number.name}
              control={control}
              rules={field.number.validation}
              render={({ field: input }) => (
                <TextField
                  {...input}
                  type="number"
                  step="0.01"
                  label={field.number.label || ''}
                  placeholder={field.number.placeholder || ''}
                  fullWidth
                  error={!!errors[field.number.name]}
                  helperText={errors[field.number.name]?.message}
                  slotProps={{
                    input: {
                      readOnly: field.number.readOnly || false,
                      style: field.number.readOnly
                        ? { color: '#999', backgroundColor: '#f5f5f5' }
                        : {},
                    },
                  }}
                />
              )}
            />
            <Controller
              name={field.select.name}
              control={control}
              rules={field.select.validation}
              render={({ field: input }) => (
                <FormControl fullWidth error={!!errors[field.select.name]}>
                  {field.select.label && (
                    <InputLabel>{field.select.label}</InputLabel>
                  )}
                  <Select
                    {...input}
                    label={field.select.label}
                    disabled={field.select.readOnly || false}
                    onChange={e => {
                      input.onChange(e);
                      field.select.onChange &&
                        field.select.onChange(e.target.value);
                    }}
                  >
                    {field.select.options.map((option, i) => (
                      <MenuItem key={i} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors[field.select.name] && (
                    <FormHelperText>
                      {errors[field.select.name]?.message}
                    </FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </div>
        );
      case 'file':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={field.validation}
            render={({ field: input }) => (
              <InputWrapper field={field}>
                <input
                  type="file"
                  multiple
                  disabled={field.readOnly || false}
                  onChange={e => {
                    const files = Array.from(e.target.files);
                    input.onChange(files);
                    field.onChange && field.onChange(files);
                  }}
                />
                {errors[field.name] && (
                  <p className={style.errorText}>
                    {errors[field.name]?.message}
                  </p>
                )}
              </InputWrapper>
            )}
          />
        );
      case 'multiselect':
        return (
          <Controller
            name={field.name}
            control={control}
            rules={field.validation}
            render={({ field: input }) => (
              <InputWrapper field={field}>
                <FormControl fullWidth error={!!errors[field.name]}>
                  {field.label && (
                    <InputLabel id={`${field.name}-label`}>
                      {field.label}
                    </InputLabel>
                  )}
                  <Select
                    labelId={`${field.name}-label`}
                    label={field.label || ''}
                    multiple
                    value={input.value || []}
                    disabled={field.readOnly || false}
                    onChange={e => {
                      input.onChange(e.target.value);
                      field.onChange && field.onChange(e.target.value);
                    }}
                    renderValue={selected => {
                      const selectedLabels = selected.map(val => {
                        const option = field.options.find(o => o.value === val);
                        return option ? option.label : val;
                      });
                      return selectedLabels.join(', ');
                    }}
                  >
                    {field.options.map((option, i) => (
                      <MenuItem key={i} value={option.value}>
                        <Checkbox
                          checked={input.value?.includes(option.value)}
                        />
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors[field.name] && (
                    <FormHelperText>
                      {errors[field.name]?.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </InputWrapper>
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      {title && <h2 className={style.title}>{title}</h2>}
      <form className={style[styleForm]} onSubmit={handleSubmit(onSubmit)}>
        {fields.map((field, index) => (
          <div key={index} className={style.inputContainer}>
            {renderField(field)}
          </div>
        ))}
        {buttons.length >= 1 ? (
          <div className={style.buttonContainer}>
            {buttons.map((button, index) => (
              <button
                key={index}
                type={button.type || 'button'}
                className={`${style[button.className] || ''}`}
                onClick={button.onClick}
              >
                {button.label}
              </button>
            ))}
          </div>
        ) : null}
      </form>
    </ThemeProvider>
  );
};

export default Form;
