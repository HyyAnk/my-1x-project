import { useEffect, useRef, useState } from "react";
import { CaretDown, Check, Globe, MagnifyingGlass } from "@phosphor-icons/react";
import { TARGET_COUNTRY_OPTIONS, getCountryDefaultLanguage, getCountryOption } from "@studio/shared";
import { CountryFlag } from "../../../components/CountryFlag";
import { useTranslation } from "../../../i18n";

export interface CountrySelectDropdownProps {
  selectedCountry: string;
  onSelectCountry: (countryCode: string, defaultLanguage: string) => void;
}

export function CountrySelectDropdown({ selectedCountry, onSelectCountry }: CountrySelectDropdownProps) {
  const { t, language } = useTranslation();
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
      c.nameVi.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.defaultLanguage.toLowerCase().includes(q) ||
      c.languageNameVi.toLowerCase().includes(q) ||
      String(c.rank).includes(q)
    );
  });

  const selectedCountryOption = getCountryOption(selectedCountry) || TARGET_COUNTRY_OPTIONS[0];

  const handleSelect = (code: string) => {
    const opt = getCountryOption(code);
    const lang = opt ? opt.defaultLanguage : getCountryDefaultLanguage(code);
    onSelectCountry(code, lang);
    setDropdownOpen(false);
    setCountrySearch("");
  };

  const selectedCountryName =
    language === "vi"
      ? selectedCountryOption?.nameVi || selectedCountryOption?.name || selectedCountry
      : selectedCountryOption?.nameEn || selectedCountryOption?.name || selectedCountry;

  return (
    <div className="channel-create-field" ref={dropdownRef}>
      <label>{t("channels.countryFieldLabel")}</label>
      <div className="country-select-wrapper">
        <button
          type="button"
          className="country-select-trigger"
          onClick={() => setDropdownOpen((prev) => !prev)}
          aria-expanded={dropdownOpen}
        >
          <div className="country-select-trigger-content">
            <CountryFlag code={selectedCountry} size={20} className="country-flag-icon" />
            <div className="country-select-trigger-info">
              <span className="country-name">{selectedCountryName}</span>
              <span className="country-sub">
                {selectedCountry} · {language === "vi" ? selectedCountryOption?.languageNameVi : selectedCountryOption?.defaultLanguage}
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
                const cName = language === "vi" ? c.nameVi : c.nameEn;
                const cLang = language === "vi" ? c.languageNameVi : c.defaultLanguage;
                return (
                  <button
                    key={c.code}
                    type="button"
                    className={`country-option-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelect(c.code)}
                  >
                    <div className="country-option-content">
                      <CountryFlag code={c.code} size={18} className="country-flag-icon" />
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
