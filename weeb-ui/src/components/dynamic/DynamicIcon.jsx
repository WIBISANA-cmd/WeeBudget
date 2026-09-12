// Named imports only: `import * as LucideIcons` pulls all ~1500 icons into the main bundle.
// Menu/schema icons come from a curated picker, so an explicit registry covers every real name.
import {
  Activity, Archive, ArrowRightLeft, BellRing, Bookmark, Boxes, Briefcase, Building,
  Calculator, ChartNoAxesCombined, Compass, Database, FileText, Folder, Gift, Globe,
  HeartHandshake, HelpCircle, Landmark, Layers, LayoutDashboard, LayoutGrid, Lightbulb,
  List, ListChecks, MapPin, Package, Receipt, Repeat, Shield, ShieldAlert, ShieldCheck,
  ShoppingBag, ShoppingCart, Sliders, SlidersHorizontal, Sparkles, Tag, Target,
  UserCheck, Users, WalletCards,
} from 'lucide-react';

const ICONS = {
  Activity, Archive, ArrowRightLeft, BellRing, Bookmark, Boxes, Briefcase, Building,
  Calculator, ChartNoAxesCombined, Compass, Database, FileText, Folder, Gift, Globe,
  HeartHandshake, HelpCircle, Landmark, Layers, LayoutDashboard, LayoutGrid, Lightbulb,
  List, ListChecks, MapPin, Package, Receipt, Repeat, Shield, ShieldAlert, ShieldCheck,
  ShoppingBag, ShoppingCart, Sliders, SlidersHorizontal, Sparkles, Tag, Target,
  UserCheck, Users, WalletCards,
};

export default function DynamicIcon({ name, size = 18, className = '', strokeWidth = 2 }) {
  // Normalize icon name format (kebab-case or PascalCase)
  const pascalName = String(name || '')
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const IconComponent = ICONS[pascalName] || ICONS[name] || LayoutGrid;

  return <IconComponent size={size} className={className} strokeWidth={strokeWidth} />;
}
