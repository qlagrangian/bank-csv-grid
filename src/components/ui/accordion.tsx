import React, { createContext, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type AccordionContextValue = {
  openItem: string | null;
  toggle: (value: string) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

type AccordionProps = {
  defaultValue?: string;
  collapsible?: boolean;
  type?: "single";
  children: React.ReactNode;
  className?: string;
};

const Accordion: React.FC<AccordionProps> = ({
  defaultValue = null,
  collapsible = true,
  children,
  className,
}) => {
  const [openItem, setOpenItem] = useState<string | null>(defaultValue);

  const value = useMemo(
    () => ({
      openItem,
      toggle: (val: string) => {
        setOpenItem((prev) => {
          if (prev === val) {
            return collapsible ? null : prev;
          }
          return val;
        });
      },
    }),
    [openItem, collapsible]
  );

  return (
    <div className={cn("divide-y rounded border", className)}>
      <AccordionContext.Provider value={value}>
        {children}
      </AccordionContext.Provider>
    </div>
  );
};

type ItemProps = {
  value: string;
  children: React.ReactNode;
  className?: string;
};

const ItemContext = createContext<string | null>(null);

const AccordionItem: React.FC<ItemProps> = ({ children, className, value }) => (
  <ItemContext.Provider value={value}>
    <div className={cn("py-1", className)}>{children}</div>
  </ItemContext.Provider>
);

type TriggerProps = {
  children: React.ReactNode;
  value?: string;
  className?: string;
};

const AccordionTrigger: React.FC<TriggerProps> = ({
  children,
  value,
  className,
}) => {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionTrigger must be used within Accordion");
  const itemValue = value ?? useContext(ItemContext);
  if (!itemValue) throw new Error("AccordionTrigger missing value");
  const isOpen = ctx.openItem === itemValue;
  return (
    <button
      type="button"
      onClick={() => ctx.toggle(itemValue)}
      className={cn(
        "flex w-full items-center justify-between py-3 text-left text-sm font-medium hover:underline",
        className
      )}
      aria-expanded={isOpen}
    >
      {children}
      <span className="ml-2 text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
    </button>
  );
};

type ContentProps = {
  children: React.ReactNode;
  value?: string;
  className?: string;
};

const AccordionContent: React.FC<ContentProps> = ({
  children,
  value,
  className,
}) => {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionContent must be used within Accordion");
  const itemValue = value ?? useContext(ItemContext);
  if (!itemValue) throw new Error("AccordionContent missing value");
  const isOpen = ctx.openItem === itemValue;
  if (!isOpen) return null;
  return <div className={cn("pb-3", className)}>{children}</div>;
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
