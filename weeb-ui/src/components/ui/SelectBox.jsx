import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Listbox dropdown (custom select). Standalone: value/onChange, no form library.
 * ResourceForm wraps this for its `select` fields, filters use it directly.
 */
export default function SelectBox({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Pilih...',
  error,
  hiddenInput = null,
  className,
}) {
  const buttonRef = useRef(null);
  const listboxId = useId();
  const [isOpen, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState({});
  const selectedIndex = options.findIndex((option) => String(option.value) === String(value ?? ''));
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

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
    onChange(option);
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
      if (options.length === 0) return;
      setActiveIndex((current) => (current + 1) % options.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length === 0) return;
      setActiveIndex((current) => (current <= 0 ? options.length - 1 : current - 1));
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) chooseOption(option);
    }
  };

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && <label className="text-sm font-medium text-text-body">{label}</label>}
      {hiddenInput}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={label}
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-surface-panel px-4 py-3 text-left text-sm shadow-sm shadow-card-soft transition-all duration-200',
          'hover:border-primary-400 hover:shadow-md hover:shadow-primary-500/10 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20',
          error ? 'border-danger-base focus-visible:border-danger-base focus-visible:ring-danger-base/20' : 'border-border-subtle',
        )}
      >
        <span className={cn('truncate', selectedOption ? 'font-medium text-text-title' : 'text-text-muted')}>
          {selectedOption?.label || placeholder}
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
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-muted">Tidak ada opsi</div>
          ) : (
            options.map((option, index) => {
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
      {error && <p className="text-xs font-medium text-danger-base">{error}</p>}
    </div>
  );
}
