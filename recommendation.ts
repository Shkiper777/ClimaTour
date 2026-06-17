"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Link from "next/link";
import { destinations, getDestinationCopy } from "@/data/destinations";
import { getTourCopy, mockTours } from "@/data/mockTours";
import { mockWeatherByDestination } from "@/data/mockWeather";
import { formatCurrency, getDictionary, scenarioLabels } from "@/lib/i18n/dictionaries";
import { buildWeatherRecommendation, getAverageWeather } from "@/lib/weather/recommendation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TourCard } from "@/components/TourCard";
import type { Locale, SearchFilters, Tour, TravelScenario } from "@/types/travel";

const initialFilters: SearchFilters = {
  destinationId: "any",
  startDate: "2026-06-20",
  endDate: "2026-06-27",
  budget: 300000,
  scenario: null,
  minTemp: 20,
  maxTemp: 31,
  noRain: false,
  lowWind: false,
  comfortableHumidity: false
};

function filterTours(tours: Tour[], filters: SearchFilters) {
  return tours.filter((tour) => {
    const weather = mockWeatherByDestination[tour.destinationId];
    const averageWeather = getAverageWeather(weather.forecast);

    if (filters.destinationId !== "any" && tour.destinationId !== filters.destinationId) {
      return false;
    }

    if (tour.price > filters.budget) {
      return false;
    }

    // Scenario is optional — skip tag filter when null
    if (filters.scenario !== null && !tour.tags.includes(filters.scenario)) {
      return false;
    }

    if (averageWeather.temperature < filters.minTemp || averageWeather.temperature > filters.maxTemp) {
      return false;
    }

    if (filters.noRain && averageWeather.precipitationProbability > 35) {
      return false;
    }

    if (filters.lowWind && averageWeather.windSpeed > 9) {
      return false;
    }

    if (filters.comfortableHumidity && averageWeather.humidity > 75) {
      return false;
    }

    return true;
  });
}

export function HomePage() {
  const [locale, setLocale] = useState<Locale>("ru");
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const dict = getDictionary(locale);
  const filteredTours = useMemo(() => filterTours(mockTours, filters), [filters]);
  const comparedTours = compareIds
    .map((id) => mockTours.find((tour) => tour.id === id))
    .filter((tour): tour is Tour => Boolean(tour));

  function updateFilter<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleScenario(scenario: TravelScenario) {
    setFilters((current) => ({
      ...current,
      scenario: current.scenario === scenario ? null : scenario
    }));
  }

  function toggleCompare(tourId: string) {
    setCompareIds((current) => {
      if (current.includes(tourId)) {
        return current.filter((id) => id !== tourId);
      }
      return [...current.slice(-2), tourId];
    });
  }

  // Effective scenario for recommendations: fallback to "beach" if none selected
  const effectiveScenario: TravelScenario = filters.scenario ?? "beach";

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>{dict.appName}</span>
        </div>
        <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Weather-driven travel</span>
          <h1>{dict.heroTitle}</h1>
          <p>{dict.heroText}</p>
          <form className="search-panel">
            <label>
              {dict.destination}
              <select
                value={filters.destinationId}
                onChange={(event) => updateFilter("destinationId", event.target.value)}
              >
                <option value="any">{dict.anywhere}</option>
                {destinations.map((destination) => {
                  const copy = getDestinationCopy(destination, locale);
                  return (
                    <option key={destination.id} value={destination.id}>
                      {copy.country} / {copy.city}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              {dict.from}
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => updateFilter("startDate", event.target.value)}
              />
            </label>
            <label>
              {dict.to}
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => updateFilter("endDate", event.target.value)}
              />
            </label>
            <label>
              {dict.budget}
              <input
                min={70000}
                max={350000}
                step={5000}
                type="number"
                value={filters.budget}
                onChange={(event) => updateFilter("budget", Number(event.target.value))}
              />
            </label>
          </form>
        </div>
        <div className="hero-media">
          <Image
            alt="Antalya coast"
            height={760}
            src="/destinations/antalya.jpg"
            width={1000}
          />
        </div>
      </section>

      <section className="catalog-shell">
        <aside className="filters-panel">
          <div>
            <span className="eyebrow">
              {dict.scenario}
              <span style={{ fontWeight: 400, opacity: 0.6, fontSize: "0.75rem", marginLeft: "0.4rem" }}>
                {locale === "ru" ? "(необязательно)" : "(optional)"}
              </span>
            </span>
            <div className="segmented-control">
              {(["beach", "walk", "excursion", "family"] as TravelScenario[]).map((scenario) => (
                <button
                  className={scenario === filters.scenario ? "active" : ""}
                  key={scenario}
                  onClick={() => toggleScenario(scenario)}
                  type="button"
                >
                  {scenarioLabels[locale][scenario]}
                </button>
              ))}
            </div>
            {filters.scenario !== null && (
              <button
                type="button"
                onClick={() => updateFilter("scenario", null)}
                style={{
                  marginTop: "0.4rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  opacity: 0.6,
                  padding: 0,
                  textDecoration: "underline"
                }}
              >
                {locale === "ru" ? "Сбросить сценарий" : "Clear scenario"}
              </button>
            )}
          </div>

          <div className="filter-group">
            <span className="eyebrow">{dict.temperature}</span>
            <div className="range-row">
              <input
                max={38}
                min={10}
                type="number"
                value={filters.minTemp}
                onChange={(event) => updateFilter("minTemp", Number(event.target.value))}
              />
              <span>—</span>
              <input
                max={40}
                min={12}
                type="number"
                value={filters.maxTemp}
                onChange={(event) => updateFilter("maxTemp", Number(event.target.value))}
              />
            </div>
          </div>

          <label className="checkbox-row">
            <input checked={filters.noRain} onChange={(event) => updateFilter("noRain", event.target.checked)} type="checkbox" />
            <span>{dict.noRain}</span>
          </label>
          <label className="checkbox-row">
            <input checked={filters.lowWind} onChange={(event) => updateFilter("lowWind", event.target.checked)} type="checkbox" />
            <span>{dict.lowWind}</span>
          </label>
          <label className="checkbox-row">
            <input
              checked={filters.comfortableHumidity}
              onChange={(event) => updateFilter("comfortableHumidity", event.target.checked)}
            />
            <span>{dict.comfortableHumidity}</span>
          </label>

          <div className="active-filter-box">
            <span className="eyebrow">{dict.activeFilters}</span>
            <div className="chip-row">
              {filters.scenario ? (
                <span>{scenarioLabels[locale][filters.scenario]}</span>
              ) : (
                <span style={{ opacity: 0.5 }}>{locale === "ru" ? "Все сценарии" : "All scenarios"}</span>
              )}
              <span>{filters.minTemp}-{filters.maxTemp}°C</span>
              {filters.noRain && <span>{dict.noRain}</span>}
              {filters.lowWind && <span>{dict.lowWind}</span>}
              {filters.comfortableHumidity && <span>{dict.comfortableHumidity}</span>}
            </div>
          </div>
        </aside>

        <section className="catalog-content">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{dict.toursFound}</span>
              <h2>{filteredTours.length} / {mockTours.length}</h2>
            </div>
          </div>

          {filteredTours.length === 0 ? (
            <div className="empty-state">
              <h3>{dict.noResultsTitle}</h3>
              <p>{dict.noResultsText}</p>
              <button className="primary-button" onClick={() => setFilters(initialFilters)} type="button">
                {dict.clear}
              </button>
            </div>
          ) : (
            <div className="tour-grid">
              {filteredTours.map((tour) => (
                <TourCard
                  key={tour.id}
                  locale={locale}
                  onToggleCompare={toggleCompare}
                  scenario={effectiveScenario}
                  selected={compareIds.includes(tour.id)}
                  tour={tour}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      {comparedTours.length > 0 && (
        <div className="comparison-bar">
          <div>
            <span className="eyebrow">{dict.comparison}</span>
            <strong>{comparedTours.length} / 3</strong>
          </div>
          <div className="comparison-items">
            {comparedTours.map((tour) => (
              <Link href={`/tours/${tour.id}?lang=${locale}&scenario=${effectiveScenario}`} key={tour.id}>
                {getTourCopy(tour, locale).city} · {formatCurrency(tour.price, locale)}
              </Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {comparedTours.length >= 2 && (
              <button
                className="primary-button"
                onClick={() => setShowCompareModal(true)}
                type="button"
              >
                {locale === "ru" ? "Сравнить плюсы/минусы" : "Compare pros/cons"}
              </button>
            )}
            <button className="secondary-button" onClick={() => setCompareIds([])} type="button">
              {dict.clear}
            </button>
          </div>
        </div>
      )}

      {showCompareModal && comparedTours.length >= 2 && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem", overflowY: "auto"
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCompareModal(false); }}
        >
          <div style={{
            background: "var(--color-surface, #fff)", borderRadius: "1rem",
            padding: "2rem", maxWidth: "900px", width: "100%",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0 }}>
                {locale === "ru" ? "Сравнение туров" : "Tour comparison"}
              </h2>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", opacity: 0.6 }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${comparedTours.length}, 1fr)`,
              gap: "1.5rem"
            }}>
              {comparedTours.map((tour) => {
                const copy = getTourCopy(tour, locale);
                const weather = mockWeatherByDestination[tour.destinationId];
                const rec = buildWeatherRecommendation(effectiveScenario, weather.forecast, locale);

                return (
                  <div key={tour.id} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Header */}
                    <div style={{
                      borderRadius: "0.75rem", overflow: "hidden",
                      border: "1px solid var(--color-border, #e5e7eb)"
                    }}>
                      <div style={{ position: "relative", height: "160px", background: "#f3f4f6" }}>
                        <Image
                          alt={copy.city}
                          src={tour.image}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <div style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.25rem" }}>
                          {copy.country} / {copy.city}
                        </div>
                        <strong style={{ fontSize: "1rem" }}>{copy.title}</strong>
                        <div style={{ marginTop: "0.4rem", fontSize: "1.1rem", fontWeight: 700 }}>
                          {formatCurrency(tour.price, locale)}
                        </div>
                        <div style={{ fontSize: "0.8rem", opacity: 0.65, marginTop: "0.2rem" }}>
                          {tour.duration} {dict.nights} · {copy.hotelName}
                        </div>
                      </div>
                    </div>

                    {/* Weather score */}
                    <div style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "0.75rem",
                      border: "1px solid var(--color-border, #e5e7eb)",
                      background: rec.status === "good" ? "rgba(34,197,94,0.07)" :
                        rec.status === "ok" ? "rgba(234,179,8,0.07)" : "rgba(239,68,68,0.07)"
                    }}>
                      <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.25rem" }}>
                        {dict.weatherSummary}
                      </div>
                      <div style={{
                        fontWeight: 600,
                        color: rec.status === "good" ? "#16a34a" : rec.status === "ok" ? "#ca8a04" : "#dc2626"
                      }}>
                        {rec.summary}
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "0.25rem" }}>
                        {locale === "ru" ? "Оценка" : "Score"}: {rec.score}/100
                      </div>
                    </div>

                    {/* Pros */}
                    {rec.reasons.length > 0 && (
                      <div style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid rgba(34,197,94,0.3)",
                        background: "rgba(34,197,94,0.05)"
                      }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#16a34a", marginBottom: "0.5rem" }}>
                          ✓ {locale === "ru" ? "Плюсы" : "Pros"}
                        </div>
                        <ul style={{ margin: 0, padding: "0 0 0 1rem", fontSize: "0.82rem", lineHeight: 1.6 }}>
                          {rec.reasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Cons */}
                    {rec.warnings.length > 0 && (
                      <div style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid rgba(239,68,68,0.3)",
                        background: "rgba(239,68,68,0.05)"
                      }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#dc2626", marginBottom: "0.5rem" }}>
                          ✗ {locale === "ru" ? "Минусы" : "Cons"}
                        </div>
                        <ul style={{ margin: 0, padding: "0 0 0 1rem", fontSize: "0.82rem", lineHeight: 1.6 }}>
                          {rec.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Packing tips */}
                    {rec.packingTips.length > 0 && (
                      <div style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid var(--color-border, #e5e7eb)"
                      }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", opacity: 0.75, marginBottom: "0.5rem" }}>
                          🎒 {dict.packing}
                        </div>
                        <ul style={{ margin: 0, padding: "0 0 0 1rem", fontSize: "0.82rem", lineHeight: 1.6 }}>
                          {rec.packingTips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Link
                      className="primary-button"
                      href={`/tours/${tour.id}?lang=${locale}&scenario=${effectiveScenario}`}
                      style={{ textAlign: "center" }}
                    >
                      {dict.details}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
