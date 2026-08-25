import * as LucideIcons from 'lucide-react';
import { HelpCircle, LayoutGrid } from 'lucide-react';

export default function DynamicIcon({ name, size = 18, className = '', strokeWidth = 2 }) {
  if (!name) {
    return <LayoutGrid size={size} className={className} strokeWidth={strokeWidth} />;
  }

  // Normalize icon name format (kebab-case or PascalCase)
  const pascalName = name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const IconComponent = LucideIcons[pascalName] || LucideIcons[name] || LayoutGrid;

  return <IconComponent size={size} className={className} strokeWidth={strokeWidth} />;
}
