"use client";
import { useLanguage } from "./language-provider";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
type Option = {
  value: string;
  label: string;
};
type Props = {
  id?: string;
  label: string;
  options: Option[];
  icon?: ReactNode;
  className?: string;
} & (
  | {
      multiple?: false;
      value: string;
      onValueChange: (value: string) => void;
    }
  | {
      multiple: true;
      value: string[];
      onValueChange: (value: string[]) => void;
    }
);
export function CompactSelect(props: Props) {
  const { t, locale } = useLanguage();
  const { id, label, options, icon, className = "" } = props;
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement>();
  const selected = props.multiple
    ? props.value.length === 0
      ? t("All tags")
      : props.value.length === 1
        ? props.value[0]
        : t("{count} tags", { count: props.value.length })
    : options.find((option) => option.value === props.value)?.label;
  const indicator = (
    <Menu.ItemIndicator>
      <Check size={13} aria-hidden="true" />
    </Menu.ItemIndicator>
  );
  return (
    <Menu.Root
      modal={false}
      onOpenChange={(open) => {
        if (open) setContainer(trigger.current?.closest("dialog") ?? undefined);
      }}
    >
      <Menu.Trigger
        ref={trigger}
        id={id}
        aria-label={label}
        className={`compact-select ${className}`}
      >
        {icon}
        <span className="compact-select-value">{selected}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal container={container}>
        <Menu.Content
          className="compact-select-menu"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          collisionBoundary={container}
        >
          {props.multiple ? (
            <>
              <Menu.CheckboxItem
                checked={props.value.length === 0}
                onCheckedChange={() => props.onValueChange([])}
                onSelect={(event) => event.preventDefault()}
                className="compact-select-option"
              >
                <span>{t("All tags")}</span>
                {indicator}
              </Menu.CheckboxItem>
              <Menu.Separator className="compact-select-separator" />
              {options.map((option) => {
                const checked = props.value.some(
                  (value) =>
                    value.toLocaleLowerCase("es") ===
                    option.value.toLocaleLowerCase("es"),
                );
                return (
                  <Menu.CheckboxItem
                    key={option.value}
                    checked={checked}
                    textValue={option.label}
                    className="compact-select-option"
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={() =>
                      props.onValueChange(
                        checked
                          ? props.value.filter(
                              (value) =>
                                value.toLocaleLowerCase("es") !==
                                option.value.toLocaleLowerCase("es"),
                            )
                          : [...props.value, option.value],
                      )
                    }
                  >
                    <span>{option.label}</span>
                    {indicator}
                  </Menu.CheckboxItem>
                );
              })}
            </>
          ) : (
            <Menu.RadioGroup
              value={props.value}
              onValueChange={props.onValueChange}
            >
              {options.map((option) => (
                <Menu.RadioItem
                  key={option.value}
                  value={option.value}
                  textValue={option.label}
                  className="compact-select-option"
                >
                  <span>{option.label}</span>
                  {indicator}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
