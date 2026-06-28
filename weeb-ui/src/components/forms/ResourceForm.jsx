import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useWatch } from 'react-hook-form';
import {
  Check, ChevronDown, Plus, X,
  Coins, TrendingUp, Briefcase, Gift, Wallet,
  Utensils, Coffee, ShoppingBag, ShoppingCart,
  Car, Train, HeartPulse, GraduationCap, BookOpen,
  Clapperboard, Gamepad2, Plane, Receipt, Tv, Wifi, Phone,
  HeartHandshake, CreditCard, LayoutGrid, Sparkles, Home,
  User, Shield, Dumbbell, Scissors, Heart, HelpCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { cn } from '../../lib/utils';

const categoryIconChoices = [
  { value: 'coins', label: 'Gaji', icon: Coins },
  { value: 'wallet', label: 'Dompet', icon: Wallet },
  { value: 'utensils', label: 'Makan', icon: Utensils },
  { value: 'coffee', label: 'Ngopi', icon: Coffee },
  { value: 'shopping-bag', label: 'Belanja', icon: ShoppingBag },
  { value: 'shopping-cart', label: 'Bulanan', icon: ShoppingCart },
  { value: 'car', label: 'Transport', icon: Car },
  { value: 'train', label: 'Perjalanan', icon: Train },
  { value: 'heart-pulse', label: 'Sehat', icon: HeartPulse },
  { value: 'graduation-cap', label: 'Edukasi', icon: GraduationCap },
  { value: 'book-open', label: 'Buku', icon: BookOpen },
  { value: 'clapperboard', label: 'Hiburan', icon: Clapperboard },
  { value: 'gamepad-2', label: 'Game', icon: Gamepad2 },
  { value: 'plane', label: 'Liburan', icon: Plane },
  { value: 'receipt', label: 'Tagihan', icon: Receipt },
  { value: 'tv', label: 'TV', icon: Tv },
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'phone', label: 'Pulsa', icon: Phone },
  { value: 'heart-handshake', label: 'Sosial', icon: HeartHandshake },
  { value: 'credit-card', label: 'Cicilan', icon: CreditCard },
  { value: 'piggy-bank', label: 'Tabungan', icon: Wallet },
  { value: 'layout-grid', label: 'Umum', icon: LayoutGrid },
  { value: 'sparkles', label: 'Hobi', icon: Sparkles },
  { value: 'home', label: 'Rumah', icon: Home },
  { value: 'user', label: 'Pribadi', icon: User },
  { value: 'shield', label: 'Proteksi', icon: Shield },
  { value: 'dumbbell', label: 'Olahraga', icon: Dumbbell },
  { value: 'scissors', label: 'Salon', icon: Scissors },
  { value: 'heart', label: 'Pasangan', icon: Heart },
];

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

function getFieldOptions(field, options, values) {
  const baseOptions = field.options || options[field.optionsKey] || [];
  return field.getOptions ? field.getOptions({ options: baseOptions, allOptions: options, values }) : baseOptions;
}

function CustomSelect({ field, register, error, options, value, values, setValue }) {
  const buttonRef = useRef(null);
  const listboxId = useId();
  const [isOpen, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState({});
  const selectOptions = useMemo(() => getFieldOptions(field, options, values), [field, options, values]);
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

function TabsField({ field, error, options, value, values, setValue }) {
  const tabOptions = getFieldOptions(field, options, values);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="text-sm font-medium text-text-body">{resolveFieldLabel(field, values, options)}</label>
      <div className="flex rounded-2xl bg-surface-100 p-1">
        {tabOptions.map((option) => {
          const isActive = String(option.value) === String(value ?? '');
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setValue(field.name, option.value, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
                field.clearFieldsOnChange?.forEach((fieldName) => {
                  setValue(fieldName, '', { shouldDirty: true, shouldValidate: true, shouldTouch: true });
                });
              }}
              className={cn(
                'flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                isActive ? 'bg-surface-panel text-primary-600 shadow-sm' : 'text-text-muted hover:text-text-body'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error?.message && <p className="text-xs font-medium text-danger-base">{error.message}</p>}
    </div>
  );
}

function CardSelectField({ field, register, error, options, value, values, setValue }) {
  const cardOptions = getFieldOptions(field, options, values);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="text-sm font-medium text-text-body">{resolveFieldLabel(field, values, options)}</label>
      <input type="hidden" {...register(field.name)} />
      {cardOptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-100/60 px-4 py-5 text-sm leading-6 text-text-muted">
          Belum ada pilihan rekening yang tersedia. Tambahkan rekening dulu dari menu Rekening.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cardOptions.map((option) => {
            const isSelected = String(option.value) === String(value ?? '');
            const [title, meta] = String(option.label || '').split(' - ');
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setValue(field.name, option.value, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
                  field.clearFieldsOnChange?.forEach((fieldName) => {
                    setValue(fieldName, '', { shouldDirty: true, shouldValidate: true, shouldTouch: true });
                  });
                }}
                className={cn(
                  'rounded-2xl border px-3 py-3 text-left shadow-sm transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-500/8 shadow-primary-500/10'
                    : 'border-border-subtle bg-surface-panel hover:border-primary-400'
                )}
              >
                <span className={cn('block truncate text-sm font-semibold', isSelected ? 'text-primary-700' : 'text-text-title')}>
                  {title}
                </span>
                <span className="mt-1 block truncate text-xs text-text-muted">
                  {meta || option.description || option.purpose || '-'}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {error?.message && <p className="text-xs font-medium text-danger-base">{error.message}</p>}
    </div>
  );
}

function IconPickerField({ field, register, error, value, values, options, setValue }) {
  const iconOptions = field.options || categoryIconChoices;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="text-sm font-medium text-text-body">{resolveFieldLabel(field, values, options)}</label>
      <input type="hidden" {...register(field.name)} />
      <div className={cn(
        'grid grid-cols-5 gap-x-2 gap-y-3 sm:grid-cols-6',
        field.compactDesktop && 'md:grid-cols-7 lg:grid-cols-8'
      )}>
        {iconOptions.map((option) => {
          const IconComponent = option.icon || HelpCircle;
          const isSelected = String(option.value) === String(value ?? '');
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue(field.name, option.value, { shouldDirty: true, shouldValidate: true, shouldTouch: true })}
              className={cn(
                'flex items-center justify-center rounded-full p-2.5 text-center transition-all md:p-2',
                isSelected
                  ? 'bg-primary-500/12 text-primary-700 ring-2 ring-primary-500/30'
                  : 'text-text-muted hover:bg-surface-100 hover:text-primary-600'
              )}
              aria-label={option.label}
              title={option.label}
            >
              <IconComponent size={20} />
            </button>
          );
        })}
      </div>
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

  if (field.type === 'tabs') {
    return <TabsField field={field} error={error} options={options} value={value} values={values} setValue={setValue} />;
  }

  if (field.type === 'card-select') {
    return <CardSelectField field={field} register={register} error={error} options={options} value={value} values={values} setValue={setValue} />;
  }

  if (field.type === 'icon-picker') {
    return <IconPickerField field={field} register={register} error={error} options={options} value={value} values={values} setValue={setValue} />;
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

function getCategoryIcon(name) {
  const lowerName = String(name || '').toLowerCase();
  if (lowerName.includes('gaji') || lowerName.includes('salary') || lowerName.includes('upah')) return Coins;
  if (lowerName.includes('investasi') || lowerName.includes('saham') || lowerName.includes('dividen') || lowerName.includes('bunga')) return TrendingUp;
  if (lowerName.includes('bonus') || lowerName.includes('thr') || lowerName.includes('hadiah') || lowerName.includes('gift')) return Gift;
  if (lowerName.includes('bisnis') || lowerName.includes('freelance') || lowerName.includes('sampingan')) return Briefcase;
  if (lowerName.includes('makan') || lowerName.includes('minum') || lowerName.includes('kuliner') || lowerName.includes('food') || lowerName.includes('resto') || lowerName.includes('jajan') || lowerName.includes('kopi') || lowerName.includes('coffee')) return Utensils;
  if (lowerName.includes('belanja') || lowerName.includes('shopping') || lowerName.includes('mall') || lowerName.includes('supermarket') || lowerName.includes('pasar') || lowerName.includes('bulanan')) return ShoppingBag;
  if (lowerName.includes('transport') || lowerName.includes('bensin') || lowerName.includes('gojek') || lowerName.includes('grab') || lowerName.includes('krl') || lowerName.includes('ojek') || lowerName.includes('taksi') || lowerName.includes('mobil') || lowerName.includes('motor')) return Car;
  if (lowerName.includes('sehat') || lowerName.includes('obat') || lowerName.includes('dokter') || lowerName.includes('sakit') || lowerName.includes('klinik') || lowerName.includes('vitamin') || lowerName.includes('apotek')) return HeartPulse;
  if (lowerName.includes('didik') || lowerName.includes('sekolah') || lowerName.includes('kuliah') || lowerName.includes('buku') || lowerName.includes('kursus') || lowerName.includes('education')) return GraduationCap;
  if (lowerName.includes('hibur') || lowerName.includes('bioskop') || lowerName.includes('nonton') || lowerName.includes('netflix') || lowerName.includes('game') || lowerName.includes('wisata') || lowerName.includes('liburan') || lowerName.includes('rekreasi') || lowerName.includes('jalan-jalan')) return Clapperboard;
  if (lowerName.includes('tagihan') || lowerName.includes('listrik') || lowerName.includes('air') || lowerName.includes('wifi') || lowerName.includes('internet') || lowerName.includes('pulsa') || lowerName.includes('bpjs') || lowerName.includes('kontrakan') || lowerName.includes('kos') || lowerName.includes('sewa')) return Receipt;
  if (lowerName.includes('sedekah') || lowerName.includes('zakat') || lowerName.includes('amal') || lowerName.includes('donasi') || lowerName.includes('sosial')) return HeartHandshake;
  if (lowerName.includes('cicilan') || lowerName.includes('hutang') || lowerName.includes('pinjaman') || lowerName.includes('credit') || lowerName.includes('kredit') || lowerName.includes('paylater')) return CreditCard;
  if (lowerName.includes('rumah') || lowerName.includes('home') || lowerName.includes('kost') || lowerName.includes('properti') || lowerName.includes('perabotan')) return Home;
  if (lowerName.includes('pribadi') || lowerName.includes('diri') || lowerName.includes('skincare') || lowerName.includes('salon') || lowerName.includes('cukur')) return User;
  if (lowerName.includes('olahraga') || lowerName.includes('sport') || lowerName.includes('gym') || lowerName.includes('fitness')) return Dumbbell;
  if (lowerName.includes('hobi') || lowerName.includes('hobby')) return Sparkles;
  
  return LayoutGrid;
}

function getCategoryColor(name, isIncomeType) {
  const lowerName = String(name || '').toLowerCase();
  if (isIncomeType) {
    return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20 dark:border-emerald-500/40',
      activeBg: 'bg-emerald-500 text-white',
      activeBorder: 'border-emerald-500',
    };
  }
  if (lowerName.includes('makan') || lowerName.includes('minum') || lowerName.includes('kuliner') || lowerName.includes('jajan')) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20 dark:border-amber-500/40',
      activeBg: 'bg-amber-500 text-white',
      activeBorder: 'border-amber-500',
    };
  }
  if (lowerName.includes('belanja') || lowerName.includes('shopping') || lowerName.includes('bulanan')) {
    return {
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-500/20 dark:border-purple-500/40',
      activeBg: 'bg-purple-500 text-white',
      activeBorder: 'border-purple-500',
    };
  }
  if (lowerName.includes('transport') || lowerName.includes('bensin') || lowerName.includes('mobil') || lowerName.includes('motor')) {
    return {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/20 dark:border-blue-500/40',
      activeBg: 'bg-blue-500 text-white',
      activeBorder: 'border-blue-500',
    };
  }
  if (lowerName.includes('tagihan') || lowerName.includes('listrik') || lowerName.includes('wifi') || lowerName.includes('internet') || lowerName.includes('pulsa')) {
    return {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/20 dark:border-rose-500/40',
      activeBg: 'bg-rose-500 text-white',
      activeBorder: 'border-rose-500',
    };
  }
  if (lowerName.includes('hibur') || lowerName.includes('game') || lowerName.includes('nonton') || lowerName.includes('netflix')) {
    return {
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-500/20 dark:border-violet-500/40',
      activeBg: 'bg-violet-500 text-white',
      activeBorder: 'border-violet-500',
    };
  }
  if (lowerName.includes('sehat') || lowerName.includes('obat') || lowerName.includes('dokter')) {
    return {
      bg: 'bg-teal-500/10 dark:bg-teal-500/20',
      text: 'text-teal-600 dark:text-teal-400',
      border: 'border-teal-500/20 dark:border-teal-500/40',
      activeBg: 'bg-teal-500 text-white',
      activeBorder: 'border-teal-500',
    };
  }
  if (lowerName.includes('sedekah') || lowerName.includes('zakat') || lowerName.includes('amal')) {
    return {
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500/20 dark:border-orange-500/40',
      activeBg: 'bg-orange-500 text-white',
      activeBorder: 'border-orange-500',
    };
  }
  if (lowerName.includes('cicilan') || lowerName.includes('hutang') || lowerName.includes('kredit')) {
    return {
      bg: 'bg-red-500/10 dark:bg-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500/20 dark:border-red-500/40',
      activeBg: 'bg-red-500 text-white',
      activeBorder: 'border-red-500',
    };
  }
  return {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/20 dark:border-slate-500/40',
    activeBg: 'bg-slate-600 dark:bg-slate-500 text-white',
    activeBorder: 'border-slate-500',
  };
}

export default function ResourceForm({
  schema,
  fields,
  defaultValues,
  options = {},
  onSubmit,
  isSaving,
  submitLabel = 'Simpan',
  isTransactionForm = false,
  formLayout = 'default',
}) {
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    setIsMobile(media.matches);
    const listener = (e) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  if (isMobile && formLayout === 'categories') {
    return (
      <form className="flex h-full flex-col justify-between gap-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-5 pb-28">
          {visibleFields.map((field) => (
            <div key={field.name} className={field.full ? 'w-full' : ''}>
              <Field field={field} register={register} error={errors[field.name]} options={options} value={watchedValues?.[field.name]} values={watchedValues} setValue={setValue} />
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-border-subtle bg-gradient-to-t from-surface-panel via-surface-panel/98 to-surface-panel/90 px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
          <Button type="submit" isLoading={isSaving} className="h-12 w-full rounded-2xl text-sm font-semibold shadow-lg shadow-primary-500/15">
            {submitLabel}
          </Button>
        </div>
      </form>
    );
  }

  if (isMobile && isTransactionForm) {
    const typeField = fields.find((f) => f.name === 'transaction_type');
    const accountField = visibleFields.find((f) => f.name === 'account_id');
    const categoryField = fields.find((f) => f.name === 'category_id');
    const otherFields = visibleFields.filter((f) => !['transaction_type', 'account_id', 'category_id'].includes(f.name));

    const handleTypeChange = (nextType) => {
      setValue('transaction_type', nextType, { shouldDirty: true, shouldValidate: true });
      setValue('category_id', '', { shouldDirty: true, shouldValidate: true });
      typeField?.clearFieldsOnChange?.forEach((fieldName) => {
        setValue(fieldName, '', { shouldDirty: true, shouldValidate: true });
      });
    };

    const categoryOptions = categoryField ? (
      categoryField.options || options[categoryField.optionsKey] || []
    ) : [];
    
    const resolvedCategoryOptions = categoryField?.getOptions ? (
      categoryField.getOptions({ options: categoryOptions, allOptions: options, values: watchedValues })
    ) : categoryOptions;

    return (
      <form className="flex h-full flex-col justify-between gap-6" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('transaction_type')} />
        <input type="hidden" {...register('category_id')} />
        <div className="flex flex-col gap-6 pb-28">
          {/* 1. Transaction Type Tabs */}
          {typeField && (
            <div className="flex flex-col gap-1.5">
              <div className="flex rounded-2xl bg-surface-100 dark:bg-surface-200 p-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={cn(
                    "flex-1 py-3 text-center text-sm font-semibold rounded-xl transition-all",
                    watchedValues.transaction_type === 'expense'
                      ? "bg-surface-panel text-danger-base shadow-sm font-bold"
                      : "text-text-muted hover:text-text-body"
                  )}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={cn(
                    "flex-1 py-3 text-center text-sm font-semibold rounded-xl transition-all",
                    watchedValues.transaction_type === 'income'
                      ? "bg-surface-panel text-success-base shadow-sm font-bold"
                      : "text-text-muted hover:text-text-body"
                  )}
                >
                  Pemasukan
                </button>
              </div>
              {errors.transaction_type?.message && (
                <p className="text-xs font-medium text-danger-base">{errors.transaction_type.message}</p>
              )}
            </div>
          )}

          {accountField && (
            <div>
              <Field
                field={accountField}
                register={register}
                error={errors[accountField.name]}
                options={options}
                value={watchedValues?.[accountField.name]}
                values={watchedValues}
                setValue={setValue}
              />
            </div>
          )}

          {/* 2. Category Grid */}
          {categoryField && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-body">
                {resolveFieldLabel(categoryField, watchedValues, options)}
              </label>
              {resolvedCategoryOptions.length === 0 ? (
                <div className="text-sm text-text-muted text-center py-6 bg-surface-50 dark:bg-surface-900/20 rounded-2xl border border-dashed border-border-subtle">
                  Belum ada kategori untuk tipe ini.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {resolvedCategoryOptions.map((option) => {
                    const isSelected = String(option.value) === String(watchedValues.category_id || '');
                    const IconComponent = getCategoryIcon(option.label);
                    const activeType = watchedValues.transaction_type || defaultValues.transaction_type || 'expense';
                    const color = getCategoryColor(option.label, activeType === 'income');

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setValue('category_id', option.value, { shouldDirty: true, shouldValidate: true });
                          categoryField.clearFieldsOnChange?.forEach((fieldName) => {
                            setValue(fieldName, '', { shouldDirty: true, shouldValidate: true });
                          });
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center py-3 px-1 transition-all gap-2 duration-200 active:scale-95 rounded-2xl",
                          isSelected ? color.bg : "bg-transparent hover:bg-surface-100/30"
                        )}
                      >
                        <IconComponent
                          size={24}
                          className={cn(
                            "transition-all duration-200",
                            isSelected ? color.text : "text-text-muted"
                          )}
                        />
                        <span className={cn(
                          "text-xs font-semibold text-center truncate w-full",
                          isSelected ? "text-text-title font-bold" : "text-text-muted"
                        )}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.category_id?.message && (
                <p className="text-xs font-medium text-danger-base">{errors.category_id.message}</p>
              )}
            </div>
          )}

          {/* 3. Other Fields */}
          {otherFields.map((field) => (
            <div key={field.name}>
              <Field
                field={field}
                register={register}
                error={errors[field.name]}
                options={options}
                value={watchedValues?.[field.name]}
                values={watchedValues}
                setValue={setValue}
              />
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border-subtle bg-gradient-to-t from-surface-panel via-surface-panel/98 to-surface-panel/90 px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
          <Button type="submit" isLoading={isSaving} className="h-12 w-full rounded-2xl text-sm font-semibold shadow-lg shadow-primary-500/15">
            {submitLabel}
          </Button>
        </div>
      </form>
    );
  }

  if (formLayout === 'categories') {
    const transactionTypeField = visibleFields.find((field) => field.name === 'transaction_type');
    const accountField = visibleFields.find((field) => field.name === 'account_id');
    const needTypeField = visibleFields.find((field) => field.name === 'need_type');
    const iconField = visibleFields.find((field) => field.name === 'icon');
    const nameField = visibleFields.find((field) => field.name === 'name');
    const handledFields = new Set(['transaction_type', 'account_id', 'need_type', 'icon', 'name']);
    const remainingFields = visibleFields.filter((field) => !handledFields.has(field.name));

    return (
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <section className="space-y-5 rounded-[28px] border border-border-subtle bg-surface-panel/90 p-5 shadow-sm shadow-card-soft md:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Identitas Kategori</p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Tentukan tipe kategori dan pilih ikon yang paling mudah dikenali saat dipakai di halaman transaksi.
              </p>
            </div>
            {transactionTypeField && (
              <Field
                field={transactionTypeField}
                register={register}
                error={errors[transactionTypeField.name]}
                options={options}
                value={watchedValues?.[transactionTypeField.name]}
                values={watchedValues}
                setValue={setValue}
              />
            )}
            {iconField && (
              <div className="rounded-[24px] border border-border-subtle bg-surface-100/55 p-4 md:p-5">
                <Field
                  field={iconField}
                  register={register}
                  error={errors[iconField.name]}
                  options={options}
                  value={watchedValues?.[iconField.name]}
                  values={watchedValues}
                  setValue={setValue}
                />
              </div>
            )}
          </section>

          <section className="space-y-5 rounded-[28px] border border-border-subtle bg-gradient-to-br from-surface-panel via-surface-panel to-surface-100/55 p-5 shadow-sm shadow-card-soft md:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Konteks Penggunaan</p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Hubungkan kategori dengan rekening dan jenis pengeluarannya agar pilihan di transaksi lebih relevan.
              </p>
            </div>
            {accountField && (
              <Field
                field={accountField}
                register={register}
                error={errors[accountField.name]}
                options={options}
                value={watchedValues?.[accountField.name]}
                values={watchedValues}
                setValue={setValue}
              />
            )}
            {needTypeField && (
              <Field
                field={needTypeField}
                register={register}
                error={errors[needTypeField.name]}
                options={options}
                value={watchedValues?.[needTypeField.name]}
                values={watchedValues}
                setValue={setValue}
              />
            )}
            {nameField && (
              <Field
                field={nameField}
                register={register}
                error={errors[nameField.name]}
                options={options}
                value={watchedValues?.[nameField.name]}
                values={watchedValues}
                setValue={setValue}
              />
            )}
            {remainingFields.map((field) => (
              <div key={field.name}>
                <Field
                  field={field}
                  register={register}
                  error={errors[field.name]}
                  options={options}
                  value={watchedValues?.[field.name]}
                  values={watchedValues}
                  setValue={setValue}
                />
              </div>
            ))}
          </section>
        </div>

        <div className="flex justify-end border-t border-border-subtle pt-4">
          <Button type="submit" isLoading={isSaving} className="min-w-[190px]">
            {submitLabel}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      {visibleFields.map((field) => (
        <div key={field.name} className={field.full ? 'md:col-span-2' : ''}>
          <Field field={field} register={register} error={errors[field.name]} options={options} value={watchedValues?.[field.name]} values={watchedValues} setValue={setValue} />
        </div>
      ))}
      <div className="md:col-span-2 -mx-4 mt-2 border-t border-border-subtle bg-surface-panel/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-4 backdrop-blur md:mx-0 md:flex md:justify-end md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-2 md:backdrop-blur-0">
        <Button type="submit" isLoading={isSaving} className="w-full md:min-w-[180px] md:w-auto">{submitLabel}</Button>
      </div>
    </form>
  );
}
