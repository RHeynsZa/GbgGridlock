import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      controls: {
        language: 'SV / EN',
        theme: 'Theme',
      },
      dashboard: {
        badge: 'Gbg Gridlock · Live Analytics',
        title: 'Gbg Gridlock transit reliability command center',
        subtitle:
          'A modern delay intelligence dashboard for Gothenburg, focused on chokepoint disruption patterns and mode-level performance.',
        modes: {
          all: 'All',
          tram: 'Tram',
          bus: 'Bus',
          ferry: 'Ferry',
        },
      },
      kpis: {
        networkDelay: 'Network delay',
        networkDelayDesc: 'Mean delay from critical monitored corridors.',
        p95Delay: 'P95 delay tail',
        p95DelayDesc: '95th percentile delay, highlighting severe right-tail disruption.',
        reliability: 'Reliability score',
        reliabilityDesc: 'Average on-time confidence over monitored chokepoints.',
        cancellationRate: 'Cancellation rate',
        cancellationRateDesc: 'Share of cancellations across monitored corridor departures.',
      },
      filters: {
        title: 'Control panel',
        description: 'Apply stop and mode filters to refine the analytics view.',
        stop: 'Stop filter',
        allStops: 'All monitored stops (average)',
      },
      charts: {
        timelineTitle: 'Delay timeline and rush pressure',
        timelineDesc: 'Trend view across tram, bus, and ferry operations over the day.',
        rankingTitle: 'Delay ranking',
        rankingDesc: 'Worst-performing lines by average delay in seconds.',
        colorsApi: 'Line colors loaded from official metadata endpoint.',
        colorsFallback: 'Line metadata is unavailable; neutral colors are shown until API color schema loads.',
        distributionTitle: 'Delay distribution (right-skew aware)',
        distributionDesc: 'Histogram showing the distribution of delays for the selected line, highlighting right-skewed patterns.',
      },
      drilldown: {
        title: 'Route drilldown panel',
        description: 'Inspect crowding, cancellations, and punctuality by line.',
        line: 'Line',
        district: 'District',
        avgDelay: 'Average delay',
        ontime: 'On-time rate',
        crowding: 'Crowding index',
        cancellations: 'Canceled trips',
        empty: 'No lines available for this filter.',
      },
    },
  },
  sv: {
    translation: {
      controls: {
        language: 'SV / EN',
        theme: 'Tema',
      },
      dashboard: {
        badge: 'Gbg Gridlock · Realtidsanalys',
        title: 'Gbg Gridlock kommandocentral för trafikens punktlighet',
        subtitle:
          'En modern dashboard för förseningsinsikter i Göteborg med fokus på störningar vid knutpunkter och trafikslag.',
        modes: {
          all: 'Alla',
          tram: 'Spårvagn',
          bus: 'Buss',
          ferry: 'Färja',
        },
      },
      kpis: {
        networkDelay: 'Nätverksförsening',
        networkDelayDesc: 'Medelförsening från kritiska övervakade korridorer.',
        p95Delay: 'P95-försening',
        p95DelayDesc: '95:e percentilen för försening som visar svansen av svåra störningar.',
        reliability: 'Tillförlitlighet',
        reliabilityDesc: 'Genomsnittlig punktlighet över övervakade knutpunkter.',
        cancellationRate: 'Andel inställda avgångar',
        cancellationRateDesc: 'Andel inställda avgångar över övervakade korridorer.',
      },
      filters: {
        title: 'Kontrollpanel',
        description: 'Använd hållplats- och trafikslagsfilter för att förfina analysen.',
        stop: 'Hållplatsfilter',
        allStops: 'Alla övervakade hållplatser (genomsnitt)',
      },
      charts: {
        timelineTitle: 'Tidslinje för försening och rusningstryck',
        timelineDesc: 'Trend över dagen för spårvagn, buss och färja.',
        rankingTitle: 'Förseningsranking',
        rankingDesc: 'Sämst presterande linjer efter medelförsening i sekunder.',
        colorsApi: 'Linjefärger laddade från officiellt metadata-endpoint.',
        colorsFallback: 'Linjefärger från API saknas; neutrala färger visas tills färgschemat laddas.',
        distributionTitle: 'Fördelning av förseningar (högerskev)',
        distributionDesc: 'Histogram som visar fördelningen av förseningar för den valda linjen och framhäver högersvans-mönster.',
      },
      drilldown: {
        title: 'Panel för linjeanalys',
        description: 'Inspektera trängsel, inställda turer och punktlighet per linje.',
        line: 'Linje',
        district: 'Område',
        avgDelay: 'Medelförsening',
        ontime: 'Punktlighet',
        crowding: 'Trängselindex',
        cancellations: 'Inställda turer',
        empty: 'Inga linjer tillgängliga för detta filter.',
      },
    },
  },
}

const savedLanguage = localStorage.getItem('lang')

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage && ['en', 'sv'].includes(savedLanguage) ? savedLanguage : 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng)
})

export default i18n
