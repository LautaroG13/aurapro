// Sin dependencia de clsx/tailwind-merge -- con la cantidad de
// variantes de este set de componentes, un join simple alcanza y no
// hay clases conflictivas que deduplicar.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
