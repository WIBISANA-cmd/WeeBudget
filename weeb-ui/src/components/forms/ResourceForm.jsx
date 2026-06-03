import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Check, ChevronDown } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { cn } from '../../lib/utils';

function CustomSelect({ field, register, error, options, value, setValue }) {
  const buttonRef = useRef(null);
  const listboxId = useId();
  const [isOpen, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState({});
  const selectOptions = useMemo(() => field.options || options[field.optionsKey] || [], [field.options, field.optionsKey, options]);
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
      <label className="text-sm font-medium text-text-body">{field.label}</label>
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
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          style={panelStyle}
          className="custom-select-popover fixed z-[120] overflow-y-auto rounded-xl border border-border-strong bg-surface-panel p-1.5 shadow-2xl shadow-slate-950/25 outline-none"
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
        </div>
      )}
      {error?.message && <p className="text-xs font-medium text-danger-base">{error.message}</p>}
    </div>
  );
}

function Field({ field, register, error, options, value, setValue }) {
  const common = {
    label: field.label,
    error: error?.message,
    ...register(field.name, field.valueAsNumber ? { valueAsNumber: true } : {}),
  };

  if (field.type === 'select') {
    return <CustomSelect field={field} register={register} error={error} options={options} value={value} setValue={setValue} />;
  }

  if (field.type === 'textarea') {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <label className="text-sm font-medium text-text-body">{field.label}</label>
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
  } = useForm({ resolver: zodResolver(schema), defaultValues });
  const watchedValues = useWatch({ control });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <div key={field.name} className={field.full ? 'md:col-span-2' : ''}>
          <Field field={field} register={register} error={errors[field.name]} options={options} value={watchedValues?.[field.name]} setValue={setValue} />
        </div>
      ))}
      <div className="md:col-span-2">
        <Button type="submit" isLoading={isSaving}>{submitLabel}</Button>
      </div>
    </form>
  );
}
