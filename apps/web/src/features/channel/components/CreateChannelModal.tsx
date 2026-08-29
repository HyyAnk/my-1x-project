import { useState, useRef, useEffect } from "react";
import { CaretDown, Check, CircleNotch, Globe, MagnifyingGlass, Plus, Translate, X } from "@phosphor-icons/react";
import {
  TARGET_COUNTRY_OPTIONS,
  getCountryDefaultLanguage,
  getCountryDefaultLanguageVi,
  getCountryOption,
  type Task,
} from "@studio/shared";
import { api } from "../../../api";
import type { ChannelGroupId } from "../../../components/ChannelList";
import { CountryFlag } from "../../../components/CountryFlag";
import { useTranslation } from "../../../i18n";

type CreateChannelForm = {
  name: string;
  description: string;
  target_audience: string;
  language: string;
  country: string;
  market: string;
  group_id: ChannelGroupId;
  dna_mode: "example" | "ai" | "upload";
  dna_content: string;
};

export function CreateChannelModal({
  initialGroupId = "quiz",
  onClose,
  onCreated,
  onError,
}: {
  initialGroupId?: ChannelGroupId;
  onClose: () => void;
  onCreated: (channelId: string, message: string, task: Task | null) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const { t, language } = useTranslation();
  const defaultCountry = TARGET_COUNTRY_OPTIONS[0] || {
    code: "AU",
    defaultLanguage: "English",
  };

  const [form, setForm] = useState<CreateChannelForm>({
    name: "",
    description: "",
    target_audience: "Children and families",
    language: defaultCountry.defaultLanguage,
    country: defaultCountry.code,
    market: defaultCountry.code,
    group_id: initialGroupId,
    dna_mode: "ai",
    dna_content: "",
  });

  const [busy, setBusy] = useState(false);

  // Country dropdown interactive state
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
    }
    if (countryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [countryDropdownOpen]);

  // Filter countries by search keyword
  const filteredCountries = TARGET_COUNTRY_OPTIONS.filter((c) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameVi.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.defaultLanguage.toLowerCase().includes(q) ||
      c.languageNameVi.toLowerCase().includes(q) ||
      String(c.rank).includes(q)
    );
  });

  const selectedCountryOption = getCountryOption(form.country) || TARGET_COUNTRY_OPTIONS[0];

  const selectCountry = (code: string) => {
    const opt = getCountryOption(code);
    const lang = opt ? opt.defaultLanguage : getCountryDefaultLanguage(code);
    setForm((current) => ({
      ...current,
      country: code,
      market: code,
      language: lang,
    }));
    setCountryDropdownOpen(false);
    setCountrySearch("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.createChannel({
        ...form,
        dna_mode: "ai",
      });
      const message = t("channels.channelCreatedNotice") || "Channel created and DNA generation queued";
      await onCreated(result.channel.channel_id, message, result.task);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  const selectedCountryName =
    language === "vi"
      ? selectedCountryOption?.nameVi || selectedCountryOption?.name || form.country
      : selectedCountryOption?.nameEn || selectedCountryOption?.name || form.country;

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal channel-create-modal" onSubmit={(event) => void submit(event)}>
        {/* Header */}
        <div className="channel-create-header">
          <div className="channel-create-header-info">
            <h2>{t("channels.createChannelTitle")}</h2>
          </div>
          <button type="button" className="channel-create-close-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="channel-create-body">
          {/* Channel Name */}
          <div className="channel-create-field">
            <label htmlFor="channel-name-input" className="channel-create-label">
              <span>{t("channels.channelNameLabel")}</span>
              <span className="required-star">*</span>
            </label>
            <input
              id="channel-name-input"
              required
              autoFocus
              className="channel-create-input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t("channels.channelNamePlaceholder")}
            />
          </div>

          {/* Description */}
          <div className="channel-create-field">
            <label htmlFor="channel-desc-input" className="channel-create-label">
              <span>{t("channels.descriptionLabel")}</span>
            </label>
            <textarea
              id="channel-desc-input"
              rows={2}
              className="channel-create-textarea"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={t("channels.descriptionPlaceholder")}
            />
          </div>

          {/* Target Country with Auto Language */}
          <div className="channel-create-field">
            <label className="channel-create-label">
              <div className="channel-create-label-with-icon">
                <Globe size={14} weight="bold" />
                <span>{t("channels.countryLabel")}</span>
              </div>
            </label>

            {/* Custom Interactive Country Selector */}
            <div className="channel-country-picker" ref={dropdownRef}>
              <button
                type="button"
                className={`channel-country-trigger ${countryDropdownOpen ? "is-active" : ""}`}
                onClick={() => setCountryDropdownOpen((open) => !open)}
              >
                <div className="channel-country-trigger-left">
                  <CountryFlag code={selectedCountryOption?.code || form.country} size={18} />
                  <span className="channel-country-rank-tag">#{selectedCountryOption?.rank || 1}</span>
                  <span className="channel-country-trigger-name">{selectedCountryName}</span>
                </div>
                <div className="channel-country-trigger-right">
                  <span className="channel-country-code-pill">{form.country}</span>
                  <CaretDown size={14} className={`picker-caret ${countryDropdownOpen ? "is-flipped" : ""}`} />
                </div>
              </button>

              {/* Dropdown Menu */}
              {countryDropdownOpen && (
                <div className="channel-country-menu">
                  <div className="channel-country-search-wrap">
                    <MagnifyingGlass size={15} className="country-search-icon" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="channel-country-search-input"
                      placeholder={t("channels.searchCountryPlaceholder")}
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                    />
                    {countrySearch && (
                      <button type="button" className="country-search-clear" onClick={() => setCountrySearch("")}>
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="channel-country-list">
                    {filteredCountries.length === 0 ? (
                      <div className="channel-country-empty">
                        <span>{t("channels.noMatchingCountry")}</span>
                      </div>
                    ) : (
                      filteredCountries.map((c) => {
                        const isSelected = c.code === form.country;
                        const countryItemName = language === "vi" ? c.nameVi || c.name : c.nameEn || c.name;
                        const countryLangTag = language === "vi" ? `${c.languageNameVi} (${c.defaultLanguage})` : c.defaultLanguage;
                        return (
                          <button
                            key={c.code}
                            type="button"
                            className={`channel-country-item ${isSelected ? "is-selected" : ""}`}
                            onClick={() => selectCountry(c.code)}
                          >
                            <div className="channel-country-item-left">
                              <span className="country-item-rank">#{c.rank}</span>
                              <CountryFlag code={c.code} size={18} />
                              <div className="country-item-names">
                                <span className="country-item-primary">{countryItemName}</span>
                              </div>
                            </div>
                            <div className="channel-country-item-right">
                              <span className="country-item-lang-tag">{countryLangTag}</span>
                              {isSelected && <Check size={16} weight="bold" className="country-item-check" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Auto-Synchronized Language Indicator */}
            <div className="channel-auto-lang-card">
              <div className="channel-auto-lang-icon">
                <Translate size={16} weight="bold" />
              </div>
              <div className="channel-auto-lang-content">
                <div className="channel-auto-lang-row">
                  <span className="channel-auto-lang-label">{t("channels.contentLanguage")}:</span>
                  <span className="channel-auto-lang-value">
                    {language === "vi" ? `${getCountryDefaultLanguageVi(form.country)} (${form.language})` : form.language}
                  </span>
                  <span className="channel-auto-lang-badge">⚡ {t("channels.autoLanguageBadge")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="channel-create-actions">
          <button type="button" className="quiet-button channel-cancel-btn" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="primary-button channel-submit-btn" disabled={busy || !form.name.trim()}>
            {busy ? <CircleNotch className="spin" size={16} /> : <Plus size={16} weight="bold" />}
            <span>{busy ? t("channels.creatingChannel") || "Creating channel…" : t("channels.createFirstChannel")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
