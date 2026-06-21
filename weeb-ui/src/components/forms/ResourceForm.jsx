import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useWatch } from 'react-hook-form';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { cn } from '../../lib/utils';

const moneyNamePattern = /(amount|balance|income|expense|price|budget|target|estimate|estimated)/i;
const moneyLabelPattern = /(nominal|saldo|pemasukan|pengeluaran|budget|target|terkumpul|harga|penghasilan|gaji|aman harian)/i;
const plainNumberNamePattern = /(day|days|priority|percent)/i;

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeMoneyValue(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';

  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'nan') return '';
  if (/^\d+\.\d{1,2}$/.test(raw)) return Number(raw);
  if (/^\d+$/.test(raw)) return Number(raw);

  const digits = onlyDigits(raw);
  return digits ? Number(digits) : '';
}

function formatThousands(value) {
  const normalized = normalizeMoneyValue(value);
  return normalized === '' ? '' : new Intl.NumberFormat('id-ID').format(normalized);
}

function isMoneyField(field) {
  if (field.currency) return true;
  if (field.currency === false || field.type !== 'number' || !field.valueAsNumber) return false;
  if (plainNumberNamePattern.test(field.name)) return false;

  return moneyNamePattern.test(field.name) || moneyLabelPattern.test(field.label || '');
}

function shouldRenderField(field, values) {
  if (!field.showWhen) return true;
  if (typeof field.showWhen === 'function') return field.showWhen(values);

  return Object.entries(field.showWhen).every(([name, expected]) => {
    const currentValue = values?.[name];
    return Array.isArray(expected)
      ? expected.includes(currentValue)
      : currentValue === expected;
  });
}

function resolveFieldLabel(field, values, options) {
  if (typeof field.getLabel === 'function') {
    return field.getLabel(values, options);
  }

  return field.label;
}

function CustomSelect({ field, register, error, options, value, values, setValue }) {
  const buttonRef = useRef(null);
  const listboxId = useId();
  const [isOpen, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState({});
  const selectOptions = useMemo(() => {
    const baseOptions = field.options || options[field.optionsKey] || [];
    return field.getOptions ? field.getOptions({ options: baseOptions, allOptions: options, values }) : baseOptions;
  }, [field, options, values]);
  const selectedIndex = selectOptions.findIndex((option) => String(option.value) === String(value ?? ''));
  const selectedOption = selectedIndex >= 0 ? selectOptions[selectedIndex] : null;

  const updatePanelPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportPadding = 16;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const openAbove = availableBelow < 220 && availableAbove > availableBelow;
    const maxHeight = Math.max(180, Math.min(320, openAbove ? availableAbove - 8 : availableBelow - 8));
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - viewportPadding * 2);
    const left = Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - width - viewportPadding);
    const top = openAbove ? rect.top - maxHeight - 8 : rect.bottom + 8;

    setPanelStyle({
      left,
      top: Math.max(viewportPadding, top),
      width,
      maxHeight,
    });
  };

  const openDropdown = () => {
    updatePanelPosition();
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const closeDropdown = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const chooseOption = (option) => {
    setValue(field.name, option.value, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    field.clearFieldsOnChange?.forEach((fieldName) => {
      setValue(fieldName, '', { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    });
    closeDropdown();
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!buttonRef.current?.contains(event.target) && !document.getElementById(listboxId)?.contains(event.target)) {
        closeDropdown();
      }
    };

    const handleResize = () => updatePanelPosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, listboxId]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
      return;
    }

    if (!isOpen && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openDropdown();
      return;
    }

    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (selectOptions.length === 0) return;
      setActiveIndex((current) => (current + 1) % selectOptions.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (selectOptions.length === 0) return;
      setActiveIndex((current) => (current <= 0 ? selectOptions.length - 1 : current - 1));
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const option = selectOptions[activeIndex];
      if (option) chooseOption(option);
    }
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="text-sm font-medium text-text-body">{resolveFieldLabel(field, values, options)}</label>
      <input type="hidden" {...register(field.name)} />
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-surface-panel px-4 py-3 text-left text-sm shadow-sm shadow-card-soft transition-all duration-200',
          'hover:border-primary-400 hover:shadow-md hover:shadow-primary-500/10 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20',
          error ? 'border-danger-base focus-visible:border-danger-base focus-visible:ring-danger-base/20' : 'border-border-subtle',
        )}
      >
        <span className={cn('truncate', selectedOption ? 'font-medium text-text-title' : 'text-text-muted')}>
          {selectedOption?.label || 'Pilih...'}
        </span>
        <ChevronDown size={18} className={cn('shrink-0 text-primary-600 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          id={listboxId}
          role="listbox"
          style={panelStyle}
          className="custom-select-popover fixed z-[9999] overflow-y-auto rounded-xl border border-border-strong bg-surface-panel p-1.5 shadow-2xl shadow-slate-950/25 outline-none"
        >
          {selectOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-muted">Tidak ada opsi</div>
          ) : (
            selectOptions.map((option, index) => {
              const isSelected = String(option.value) === String(value ?? '');
              const isActive = index === activeIndex;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseOption(option)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150',
                    isSelected && 'bg-[rgb(15,60,113)] text-white',
                    !isSelected && isActive && 'bg-primary-500/10 text-primary-600',
                    !isSelected && !isActive && 'text-text-body hover:bg-primary-500/10 hover:text-primary-600',
                  )}
                >
                  <span className="min-w-0 truncate font-medium">{option.label}</span>
                  <Check size={16} className={cn('shrink-0 transition-opacity', isSelected ? 'opacity-100' : 'opacity-0')} />
                </button>
              );
            })
          )}
        </div>,
        document.body
      )}
      {error?.message && <p className="text-xs font-medium text-danger-base">{error.message}</p>}
    </div>
  );
}

function MoneyInput({ field, register, error, value, setValue }) {
  const displayValue = formatThousands(value);

  const handleChange = (event) => {
    const digits = onlyDigits(event.target.value);
    setValue(field.name, digits ? Number(digits) : '', { shouldDirty: true, shouldValidate: true, shouldTouch: true });
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="text-sm font-medium text-text-body">{field.label}</label>
      <input type="hidden" {...register(field.name)} />
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={field.placeholder}
          className={cn(
            'flex w-full rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-text-title shadow-sm shadow-card-soft transition-colors placeholder:text-text-muted',
            'focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20',
            error && 'border-danger-base focus-visible:border-danger-base focus-visible:ring-danger-base',
          )}
        />
      </div>
      {error?.message && <p className="text-xs font-medium text-danger-base">{error.message}</p>}
    </div>
  );
}

function ListInput({ field, error, value, values, options, setValue }) {
  const [draft, setDraft] = useState('');
  const items = Array.isArray(value) ? value : [];
  const placeholder = typeof field.getPlaceholder === 'function' ? field.getPlaceholder(values) : field.placeholder;
  const maxItems = typeof field.getMaxItems === 'function' ? field.getMaxItems(values, options) : field.maxItems;
  const canAddMore = !maxItems || items.length < maxItems;

  const updateItems = (nextItems) => {
    setValue(field.name, nextItems, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
  };

  const addItem = () => {
    const normalized = draft.trim();
    if (!normalized || !canAddMore) return;
    if (items.includes(normalized)) {
      setDraft('');
      return;
    }

    updateItems([...items, normalized]);
    setDraft('');
  };

  const removeItem = (index) => {
    updateItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addItem();
      return;
    }

    if (event.key === 'Backspace' && !draft && items.length > 0) {
      event.preventDefault();
      removeItem(items.length - 1);
    }
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="text-sm font-medium text-text-body">{resolveFieldLabel(field, values, options)}</label>
      <div className="rounded-xl border border-border-subtle bg-surface-panel p-3 shadow-sm shadow-card-soft">
        {items.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {items.map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3 py-1 text-sm font-medium text-primary-700">
                {item}
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="rounded-full text-primary-700 transition-colors hover:text-danger-base"
                  aria-label={`Hapus ${item}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={!canAddMore}
            className={cn(
              'flex w-full rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-text-title shadow-sm shadow-card-soft transition-colors placeholder:text-text-muted',
              'focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20',
              error && 'border-danger-base focus-visible:border-danger-base focus-visible:ring-danger-base',
            )}
          />
          <Button type="button" variant="secondary" onClick={addItem} className="sm:w-auto" disabled={!canAddMore}>
            <Plus size={16} className="mr-2" />
            Tambah
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          {maxItems === 1
            ? 'Mode edit hanya mengubah satu nama kategori.'
            : 'Tekan `Enter` atau klik tambah untuk memasukkan pilihan baru.'}
        </p>
      </div>
      {error?.message && <p className="text-xs font-medium text-danger-base">{error.message}</p>}
    </div>
  );
}

function Field({ field, register, error, options, value, values, setValue }) {
  const common = {
    label: resolveFieldLabel(field, values, options),
    error: error?.message,
    ...register(field.name, field.valueAsNumber ? { valueAsNumber: true } : {}),
  };

  if (field.type === 'hidden') {
    return <input type="hidden" {...register(field.name)} />;
  }

  if (field.type === 'select') {
    return <CustomSelect field={field} register={register} error={error} options={options} value={value} values={values} setValue={setValue} />;
  }

  if (isMoneyField(field)) {
    return <MoneyInput field={field} register={register} error={error} value={value} setValue={setValue} />;
  }

  if (field.type === 'list') {
    return <ListInput field={field} error={error} value={value} values={values} options={options} setValue={setValue} />;
  }

  if (field.type === 'textarea') {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <label className="text-sm font-medium text-text-body">{resolveFieldLabel(field, values, options)}</label>
        <textarea rows={3} className="rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-text-title shadow-sm shadow-card-soft placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" {...register(field.name)} />
        {error?.message && <p className="text-xs font-medium text-danger-base">{error.message}</p>}
      </div>
    );
  }

  return <Input type={field.type || 'text'} {...common} />;
}

export default function ResourceForm({ schema, fields, defaultValues, options = {}, onSubmit, isSaving, submitLabel = 'Simpan' }) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues, shouldUnregister: true });
  const watchedValues = useWatch({ control });
  const visibleFields = useMemo(
    () => fields.filter((field) => shouldRenderField(field, watchedValues)),
    [fields, watchedValues]
  );

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      {visibleFields.map((field) => (
        <div key={field.name} className={field.full ? 'md:col-span-2' : ''}>
          <Field field={field} register={register} error={errors[field.name]} options={options} value={watchedValues?.[field.name]} values={watchedValues} setValue={setValue} />
        </div>
      ))}
      <div className="md:col-span-2 -mx-4 mt-2 border-t border-border-subtle bg-surface-panel/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-4 backdrop-blur md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-2">
        <Button type="submit" isLoading={isSaving} className="w-full md:w-auto">{submitLabel}</Button>
      </div>
    </form>
  );
}
