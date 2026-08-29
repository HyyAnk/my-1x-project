import { useState, useRef, useEffect } from "react";
import { CaretDown, Check, CircleNotch, FloppyDisk, Globe, MagnifyingGlass, Translate, X } from "@phosphor-icons/react";
import {
  TARGET_COUNTRY_OPTIONS,
  getCountryDefaultLanguage,
  getCountryDefaultLanguageVi,
  getCountryOption,
  type Channel,
} from "@studio/shared";
import { api } from "../../../api";
import { CountryFlag } from "../../../components/CountryFlag";
import { useTranslation } from "../../../i18n";
import type { Notice } from "../../../components/types";

type EditChannelModalProps = {
  channel: Channel;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function EditChannelModal({ channel, onClose, onSaved, onNotice }: EditChannelModalProps) {
  const { t, language } = useTranslation();

  const [form, setForm] = useState({
    display_name: channel.display_name,
    description: channel.description || "",
    target_audience: channel.target_audience || "",
    country: channel.country || channel.market || "GLOBAL",
    language: channel.language || "English",
  });

  const [busy, setBusy] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      language: lang,
    }));
    setCountryDropdownOpen(false);
    setCountrySearch("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.display_name.trim()) return;
    setBusy(true);
    try {
      await api.updateChannel(channel.channel_id, {
        display_name: form.display_name.trim(),
        description: form.description.trim(),
        target_audience: form.target_audience.trim(),
        country: form.country,
        market: form.country,
        language: form.language,
      });
      onNotice({ tone: "good", message: t("channelDetail.channelUpdatedNotice") });
      await onSaved();
      onClose();
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to update channel" });
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
        <div className="channel-create-header">
          <div className="channel-create-header-info">
            <h2>{t("channelDetail.editProfileModalTitle")}</h2>
          </div>
          <button type="button" className="channel-create-close-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        <div className="channel-create-body">
          <div className="channel-create-field">
            <label htmlFor="edit-channel-name-input" className="channel-create-label">
              <span>{t("channelDetail.channelName")}</span>
              <span className="required-star">*</span>
            </label>
            <input
              id="edit-channel-name-input"
              required
              autoFocus
              className="channel-create-input"
              value={form.display_name}
              onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
            />
          </div>

          <div className="channel-create-field">
            <label htmlFor="edit-channel-desc-input" className="channel-create-label">
              <span>{t("channelDetail.description")}</span>
            </label>
            <textarea
              id="edit-channel-desc-input"
              rows={2}
              className="channel-create-textarea"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={t("channels.descriptionPlaceholder")}
            />
          </div>

          <div className="channel-create-field">
            <label htmlFor="edit-channel-audience-input" className="channel-create-label">
              <span>{t("channelDetail.targetAudience")}</span>
            </label>
            <input
              id="edit-channel-audience-input"
              className="channel-create-input"
              value={form.target_audience}
              onChange={(event) => setForm((current) => ({ ...current, target_audience: event.target.value }))}
              placeholder={t("channels.targetAudiencePlaceholder")}
            />
          </div>

          <div className="channel-create-field">
            <label className="channel-create-label">
              <div className="channel-create-label-with-icon">
                <Globe size={14} weight="bold" />
                <span>{t("channelDetail.country")}</span>
              </div>
            </label>

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

        <div className="channel-create-actions">
          <button type="button" className="quiet-button channel-cancel-btn" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="primary-button channel-submit-btn" disabled={busy || !form.display_name.trim()}>
            {busy ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} weight="bold" />}
            <span>{busy ? t("channelDetail.savingChannel") : t("channelDetail.saveChanges")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
