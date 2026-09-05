/**
 * Catálogo controlado de ícones (Master Document, Seção 13 e 48).
 *
 * Categorias, tags e a navegação usam um `icon_key` (string estável, persistida
 * no banco) que resolve para um ícone deste catálogo — nunca um SVG arbitrário
 * fornecido pelo usuário. Biblioteca única e consistente: lucide-react.
 *
 * Ao adicionar um novo ícone ao catálogo de categorias, adicione a chave aqui
 * primeiro; o restante do app (seletor, transações, relatórios, Cockpit,
 * breakdowns) consome sempre a mesma chave — nunca duplicar ícone por
 * natureza financeira (Seção 48).
 */
import {
  Banknote,
  Bus,
  Car,
  CreditCard,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  type LucideIcon,
  PawPrint,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Utensils,
  Wallet,
  Wrench,
} from 'lucide-react';

export const ICON_CATALOG = {
  wallet: Wallet,
  banknote: Banknote,
  'credit-card': CreditCard,
  home: Home,
  cart: ShoppingCart,
  bag: ShoppingBag,
  utensils: Utensils,
  car: Car,
  bus: Bus,
  plane: Plane,
  heart: Heart,
  'graduation-cap': GraduationCap,
  gift: Gift,
  'paw-print': PawPrint,
  smartphone: Smartphone,
  wrench: Wrench,
  receipt: Receipt,
  landmark: Landmark,
  sparkles: Sparkles,
  tag: Tag,
} as const satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICON_CATALOG;

export const ICON_KEYS = Object.keys(ICON_CATALOG) as IconKey[];

/** Ícone padrão de tag (Seção 13: "Tags usam ícone padrão de tag"). */
export const DEFAULT_TAG_ICON_KEY: IconKey = 'tag';

/** Fallback seguro para um icon_key desconhecido/corrompido vindo do banco. */
export function resolveIcon(iconKey: string | null | undefined): LucideIcon {
  if (iconKey && iconKey in ICON_CATALOG) {
    return ICON_CATALOG[iconKey as IconKey];
  }
  return Wallet;
}
