import { useEffect, useRef, useState } from "react";
import { CaretDown, Check, Globe, MagnifyingGlass } from "@phosphor-icons/react";
import { TARGET_COUNTRY_OPTIONS, getCountryOption } from "@studio/shared";
import { CountryFlag } from "../../../components/CountryFlag";
import { useTranslation } from "../../../i18n";

export interface CountrySelectDropdownProps {
  selectedCountry: string;
  onSelectCountry: (countryCode: string) => void;
}

export function CountrySelectDropdown({ selectedCountry, onSelectCountry }: CountrySelectDropdownProps) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Filter countries by search keyword
  const filteredCountries = TARGET_COUNTRY_OPTIONS.filter((c) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.defaultLanguage.toLowerCase().includes(q) ||
      String(c.rank).includes(q)
    );
  });

  const selectedCountryOption = getCountryOption(selectedCountry) || TARGET_COUNTRY_OPTIONS[0];

  const handleSelect = (code: string) => {
    onSelectCountry(code);
    setDropdownOpen(false);
    setCountrySearch("");
  };

  const selectedCountryName =
    selectedCountryOption?.nameEn || selectedCountryOption?.name || selectedCountry;

  return (
    <div className="channel-create-field" ref={dropdownRef}>
      <label className="channel-field-label">
        <Globe size={14} className="field-label-icon" />
        <span>{t("channels.countryFieldLabel")}</span>
      </label>
      <div className="country-select-wrapper">
        <button
          type="button"
          className="country-select-trigger"
          onClick={() => setDropdownOpen((prev) => !prev)}
          aria-expanded={dropdownOpen}
          aria-label={t("channels.countryFieldLabel")}
        >
          <div className="country-select-trigger-content">
            {selectedCountryOption?.rank ? (
              <span className="country-rank-pill">#{selectedCountryOption.rank}</span>
            ) : null}
            <CountryFlag code={selectedCountry} size={22} className="country-flag-icon" />
            <div className="country-select-trigger-info">
              <span className="country-name">{selectedCountryName}</span>
              <span className="country-sub">
                {selectedCountry} · {selectedCountryOption?.defaultLanguage}
              </span>
            </div>
          </div>
          <CaretDown size={14} className={`country-chevron ${dropdownOpen ? "open" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="country-dropdown-menu">
            <div className="country-search-box">
              <MagnifyingGlass size={14} className="country-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder={t("channels.searchCountryPlaceholder")}
                className="country-search-input"
              />
            </div>
            <div className="country-options-list">
              {filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry;
                const cName = c.nameEn;
                const cLang = c.defaultLanguage;
                return (
                  <button
                    key={c.code}
                    type="button"
                    className={`country-option-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelect(c.code)}
                  >
                    <div className="country-option-content">
                      <span className="country-item-rank-tag">#{c.rank}</span>
                      <CountryFlag code={c.code} size={20} className="country-flag-icon" />
                      <div className="country-option-text">
                        <span className="country-option-name">{cName}</span>
                        <span className="country-option-sub">
                          {c.code} · {cLang}
                        </span>
                      </div>
                    </div>
                    {isSelected ? <Check size={14} weight="bold" className="country-check-icon" /> : null}
                  </button>
                );
              })}
              {filteredCountries.length === 0 && (
                <div className="country-no-results">
                  <Globe size={18} />
                  <span>{t("channels.noCountriesFound")}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
