import { useCallback, useEffect, useRef, useState } from "react";

export type RouteTabOptions<T extends string> = {
  value?: string | null;
  allowedTabs: readonly T[];
  fallback: T;
  onChange?: (tab: T) => void;
};

export function resolveRouteTab<T extends string>(value: string | null | undefined, allowedTabs: readonly T[], fallback: T): T {
  return allowedTabs.find((tab) => tab === value) ?? fallback;
}

export function useRouteTab<T extends string>({ value, allowedTabs, fallback, onChange }: RouteTabOptions<T>) {
  const resolvedValue = resolveRouteTab(value, allowedTabs, fallback);
  const [selectedTab, setSelectedTab] = useState<T>(resolvedValue);
  const lastExternalValue = useRef(value);
  const lastResolvedValue = useRef(resolvedValue);

  useEffect(() => {
    const routeValueChanged = lastExternalValue.current !== value;
    const resolvedValueChanged = lastResolvedValue.current !== resolvedValue;
    if (!routeValueChanged && !resolvedValueChanged) return;
    lastExternalValue.current = value;
    lastResolvedValue.current = resolvedValue;
    setSelectedTab(resolvedValue);
  }, [resolvedValue, value]);

  const selectTab = useCallback(
    (nextTab: T) => {
      setSelectedTab(nextTab);
      onChange?.(nextTab);
    },
    [onChange],
  );

  return [selectedTab, selectTab] as const;
}
