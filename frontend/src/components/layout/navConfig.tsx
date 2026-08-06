import type { ComponentType, SVGProps } from "react";

import {
  AccountsIcon,
  AdminIcon,
  CashIcon,
  CompanyIcon,
  CustomersIcon,
  HomeIcon,
  IntegrationsIcon,
  OrderNotesIcon,
  ProductsIcon,
  QuotesIcon,
  SalesIcon,
  TeamIcon,
} from "./navIcons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItemConfig {
  href: string;
  label: string;
  icon: IconComponent;
  // Sin campo -> visible para cualquier usuario logueado.
  requires?: "admin" | "superadmin";
}

export interface NavGroupConfig {
  label: string | null;
  items: NavItemConfig[];
}

// Agrupado por tipo de tarea, no por orden de creación del módulo --
// separa lo que se opera todos los días de lo que se configura una
// vez. "Inicio" queda suelto arriba porque no pertenece a ningún
// grupo temático.
export const NAV_GROUPS: NavGroupConfig[] = [
  {
    label: null,
    items: [{ href: "/", label: "Inicio", icon: HomeIcon }],
  },
  {
    label: "Operación",
    items: [
      { href: "/sales", label: "Ventas", icon: SalesIcon },
      { href: "/quotes", label: "Presupuestos", icon: QuotesIcon },
      { href: "/order-notes", label: "Notas de pedido", icon: OrderNotesIcon },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/products", label: "Productos", icon: ProductsIcon },
      { href: "/customers", label: "Clientes", icon: CustomersIcon },
    ],
  },
  {
    label: "Caja",
    items: [
      { href: "/cash", label: "Caja", icon: CashIcon },
      { href: "/accounts", label: "Cuenta corriente", icon: AccountsIcon },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/team", label: "Equipo", icon: TeamIcon, requires: "admin" },
      { href: "/company", label: "Empresa", icon: CompanyIcon, requires: "admin" },
      { href: "/integrations", label: "Integraciones", icon: IntegrationsIcon, requires: "admin" },
      { href: "/admin", label: "Admin", icon: AdminIcon, requires: "superadmin" },
    ],
  },
];

export function isNavItemVisible(item: NavItemConfig, isAdmin: boolean, isSuperadmin: boolean): boolean {
  if (item.requires === "superadmin") return isSuperadmin;
  if (item.requires === "admin") return isAdmin;
  return true;
}
