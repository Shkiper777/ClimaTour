"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Link from "next/link";
import { destinations, getDestinationCopy } from "@/data/destinations";
import { getTourCopy, mockTours } from "@/data/mockTours";

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
  const weatherByDestination = {}; const filteredTours = useMemo(() => mockTours.slice(0,16), [filters]);
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
      if (current.length >= 3) return current;
      return [...current, tourId];
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
            <span className="eyebrow">{dict.scenario}</span>
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
            </div>
          </div>
        </aside>

        <section className="catalog-content">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{dict.toursFound}</span>
              <h2>{Math.min(filteredTours.length, 16)} / {mockTours.length}</h2>
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
              {filteredTours.slice(0, 16).map((tour) => (
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
            <strong>{comparedTours.length} / 3 {locale === "ru" ? "выбрано" : "selected"}</strong>
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

            {(() => {
              const includedLabelsMap: Record<string, Record<Locale, string>> = {
                "All inclusive": { ru: "Всё включено", en: "All inclusive" },
                Breakfast: { ru: "Завтраки", en: "Breakfast" },
                Flight: { ru: "Перелёт", en: "Flight" },
                "Half board": { ru: "Полупансион", en: "Half board" },
                Hotel: { ru: "Отель", en: "Hotel" },
                Transfer: { ru: "Трансфер", en: "Transfer" }
              };
              const allPPN = comparedTours.map(t => t.price / t.duration);
              const tourData = comparedTours.map(tour => {
                const copy = getTourCopy(tour, locale);
                const weather = mockWeatherByDestination[tour.destinationId];
                const rec = buildWeatherRecommendation(effectiveScenario, weather.forecast, locale);
                const pricePerNight = Math.round(tour.price / tour.duration);
                const isCheapest = pricePerNight === Math.round(Math.min(...allPPN));
                const valueScore = Math.round((rec.score / 100) * 100 / (tour.price / Math.min(...comparedTours.map(t => t.price))));
                const valueLabel = valueScore >= 85
                  ? (locale === "ru" ? "Отличное" : "Excellent")
                  : valueScore >= 65 ? (locale === "ru" ? "Хорошее" : "Good")
                  : (locale === "ru" ? "Среднее" : "Average");
                const valueColor = valueScore >= 85 ? "#16a34a" : valueScore >= 65 ? "#ca8a04" : "#6b7280";
                return { tour, copy, rec, pricePerNight, isCheapest, valueLabel, valueColor };
              });

              const cols = comparedTours.length;
              const gridCols = `repeat(${cols}, 1fr)`;

              const cellBase: React.CSSProperties = {
                padding: "0.75rem 1rem",
                border: "1px solid var(--color-border, #e5e7eb)"
              };
              const labelStyle: React.CSSProperties = {
                fontWeight: 600, fontSize: "0.72rem",
                textTransform: "uppercase", letterSpacing: "0.05em",
                opacity: 0.45, marginBottom: "0.5rem"
              };

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

                  {/* ROW: Header */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "1rem", marginBottom: "0.75rem" }}>
                    {tourData.map(({ tour, copy }) => (
                      <div key={tour.id} style={{ borderRadius: "0.75rem", overflow: "hidden", border: "1px solid var(--color-border, #e5e7eb)" }}>
                        <div style={{ position: "relative", height: "160px", background: "#f3f4f6" }}>
                          <Image alt={copy.city} src={tour.image} fill style={{ objectFit: "cover" }} />
                        </div>
                        <div style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.2rem" }}>{copy.country} / {copy.city}</div>
                          <strong style={{ fontSize: "0.95rem" }}>{copy.title}</strong>
                          <div style={{ marginTop: "0.35rem", fontSize: "1.05rem", fontWeight: 700 }}>{formatCurrency(tour.price, locale)}</div>
                          <div style={{ fontSize: "0.78rem", opacity: 0.6, marginTop: "0.15rem" }}>{tour.duration} {dict.nights} · {copy.hotelName}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ROW: Price */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "1rem", marginBottom: "0.75rem" }}>
                    {tourData.map(({ tour, pricePerNight, isCheapest, valueLabel, valueColor }) => (
                      <div key={tour.id} style={{ ...cellBase, borderRadius: "0.75rem" }}>
                        <div style={labelStyle}>{locale === "ru" ? "Цена" : "Price"}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ opacity: 0.65 }}>{locale === "ru" ? "За ночь" : "Per night"}</span>
                            <strong>{formatCurrency(pricePerNight, locale)}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ opacity: 0.65 }}>{locale === "ru" ? "Длительность" : "Duration"}</span>
                            <strong>{tour.duration} {dict.nights}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ opacity: 0.65 }}>{locale === "ru" ? "Цена/качество" : "Value"}</span>
                            <strong style={{ color: valueColor }}>{valueLabel}</strong>
                          </div>
                          {isCheapest && (
                            <div style={{ marginTop: "0.2rem", padding: "0.2rem 0.5rem", background: "rgba(34,197,94,0.1)", color: "#16a34a", borderRadius: "0.4rem", fontSize: "0.72rem", fontWeight: 600, textAlign: "center" }}>
                              {locale === "ru" ? "Выгоднее за ночь" : "Best value per night"}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ROW: Included */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "1rem", marginBottom: "0.75rem" }}>
                    {tourData.map(({ tour }) => (
                      <div key={tour.id} style={{ ...cellBase, borderRadius: "0.75rem" }}>
                        <div style={labelStyle}>{dict.included}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                          {tour.included.map((item) => (
                            <span key={item} style={{
                              padding: "0.2rem 0.5rem", borderRadius: "999px", fontSize: "0.73rem", fontWeight: 500,
                              background: item === "All inclusive" ? "rgba(34,197,94,0.12)" : "rgba(0,0,0,0.06)",
                              color: item === "All inclusive" ? "#16a34a" : "inherit"
                            }}>
                              {includedLabelsMap[item]?.[locale] ?? item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ROW: Weather */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "1rem", marginBottom: "0.75rem" }}>
                    {tourData.map(({ tour, rec }) => (
                      <div key={tour.id} style={{
                        ...cellBase, borderRadius: "0.75rem",
                        background: rec.status === "good" ? "rgba(34,197,94,0.07)" : rec.status === "ok" ? "rgba(234,179,8,0.07)" : "rgba(239,68,68,0.07)",
                        border: rec.status === "good" ? "1px solid rgba(34,197,94,0.25)" : rec.status === "ok" ? "1px solid rgba(234,179,8,0.25)" : "1px solid rgba(239,68,68,0.25)"
                      }}>
                        <div style={labelStyle}>{dict.weatherSummary}</div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: rec.status === "good" ? "#16a34a" : rec.status === "ok" ? "#ca8a04" : "#dc2626" }}>
                          {rec.summary}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ROW: Pros */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "1rem", marginBottom: "0.75rem" }}>
                    {tourData.map(({ tour, rec }) => (
                      <div key={tour.id} style={{ ...cellBase, borderRadius: "0.75rem", border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.05)" }}>
                        <div style={{ ...labelStyle, color: "#16a34a", opacity: 1 }}>{locale === "ru" ? "Плюсы" : "Pros"}</div>
                        {rec.reasons.length > 0 ? (
                          <ul style={{ margin: 0, padding: "0 0 0 1rem", fontSize: "0.82rem", lineHeight: 1.6 }}>
                            {rec.reasons.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        ) : <span style={{ fontSize: "0.82rem", opacity: 0.4 }}>—</span>}
                      </div>
                    ))}
                  </div>

                  {/* ROW: Cons */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "1rem", marginBottom: "0.75rem" }}>
                    {tourData.map(({ tour, rec }) => (
                      <div key={tour.id} style={{ ...cellBase, borderRadius: "0.75rem", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
                        <div style={{ ...labelStyle, color: "#dc2626", opacity: 1 }}>{locale === "ru" ? "Минусы" : "Cons"}</div>
                        {rec.warnings.length > 0 ? (
                          <ul style={{ margin: 0, padding: "0 0 0 1rem", fontSize: "0.82rem", lineHeight: 1.6 }}>
                            {rec.warnings.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        ) : <span style={{ fontSize: "0.82rem", opacity: 0.4 }}>—</span>}
                      </div>
                    ))}
                  </div>

                  {/* ROW: Packing */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "1rem", marginBottom: "0.75rem" }}>
                    {tourData.map(({ tour, rec }) => (
                      <div key={tour.id} style={{ ...cellBase, borderRadius: "0.75rem" }}>
                        <div style={labelStyle}>{dict.packing}</div>
                        <ul style={{ margin: 0, padding: "0 0 0 1rem", fontSize: "0.82rem", lineHeight: 1.6 }}>
                          {rec.packingTips.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* ROW: Actions */}
                  <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "1rem" }}>
                    {tourData.map(({ tour }) => (
                      <Link key={tour.id} className="primary-button" href={`/tours/${tour.id}?lang=${locale}&scenario=${effectiveScenario}`} style={{ textAlign: "center" }}>
                        {dict.details}
                      </Link>
                    ))}
                  </div>

                </div>
              );
            })()}
          </div>
        </div>
      )}
    </main>
  );
}
