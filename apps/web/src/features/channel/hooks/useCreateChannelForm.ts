import { useRef, useState } from "react";
import { TARGET_COUNTRY_OPTIONS, getCountryOption, type Task } from "@studio/shared";
import { api } from "../../../api";
import { useTranslation } from "../../../i18n";
import type { CreateChannelFormData } from "../components/create/types";

export interface UseCreateChannelFormProps {
  onCreated: (channelId: string, message: string, task: Task | null) => Promise<void>;
  onError: (error: unknown) => void;
}

export function useCreateChannelForm({ onCreated, onError }: UseCreateChannelFormProps) {
  const { t } = useTranslation();
  const defaultCountry = TARGET_COUNTRY_OPTIONS[0] || {
    code: "AU",
    defaultLanguage: "English",
  };

  const [form, setForm] = useState<CreateChannelFormData>({
    name: "",
    description: "",
    target_audience: "Children and families",
    language: defaultCountry.defaultLanguage,
    country: defaultCountry.code,
    market: "",
    dna_mode: "ai",
    dna_content: "",
  });

  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  const handleCountrySelect = (code: string) => {
    const matched = getCountryOption(code);
    setForm((current) => ({
      ...current,
      country: code,
      language: matched?.defaultLanguage || current.language,
    }));
  };

  const handleLanguageChange = (val: string) => {
    setForm((current) => ({ ...current, language: val }));
  };

  const handleAudienceSelect = (audienceVal: string) => {
    setForm((current) => ({
      ...current,
      target_audience: current.target_audience === audienceVal ? "" : audienceVal,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current || !form.name.trim()) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      const result = await api.createChannel({
        name: form.name.trim(),
        description: form.description.trim(),
        target_audience: form.target_audience.trim(),
        language: form.language.trim() || "English",
        country: form.country || "AU",
        market: "",
        dna_mode: "ai",
        dna_content: "",
      });
      const message = t("channels.channelCreatedNotice") || "Channel created and DNA generation queued";
      await onCreated(result.channel.channel_id, message, result.task);
    } catch (error) {
      onError(error);
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return {
    form,
    setForm,
    busy,
    handleCountrySelect,
    handleLanguageChange,
    handleAudienceSelect,
    submit,
  };
}
