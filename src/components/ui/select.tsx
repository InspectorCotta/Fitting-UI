import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

export type SelectOption = { value: string; label: string; disabled?: boolean };
export type SelectGroup = { label?: string; options: SelectOption[] };

/** Shared, keyboard-accessible picker; its portal uses the same theme as other menus. */
export function Select({
  id,
  value,
  onValueChange,
  groups,
  placeholder,
  className = '',
  'aria-label': label,
  onOpenChange,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  groups: SelectGroup[];
  placeholder?: string;
  className?: string;
  'aria-label': string;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} onOpenChange={onOpenChange}>
      <SelectPrimitive.Trigger id={id} aria-label={label} className={`select-trigger ${className}`}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={12} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="menu-surface select-content"
          aria-label={label}
          position="popper"
          sideOffset={8}
          collisionPadding={12}
        >
          <SelectPrimitive.ScrollUpButton className="select-scroll">
            <ChevronUp size={12} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="select-viewport">
            {groups.map((group, index) => (
              <SelectPrimitive.Group key={group.label || index}>
                {group.label && (
                  <SelectPrimitive.Label className="menu-label">
                    {group.label}
                  </SelectPrimitive.Label>
                )}
                {group.options.map((option) => (
                  <SelectPrimitive.Item
                    className="select-item"
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="select-indicator">
                      <Check size={13} />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="select-scroll">
            <ChevronDown size={12} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
