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
        reliability: 'Reliability score',
        reliabilityDesc: 'Average on-time confidence over monitored chokepoints.',
        ridership: 'Daily ridership estimate',
        ridershipDesc: 'Estimated passengers moving through priority corridors.',
        monitoredStops: 'Monitored stops',
        monitoredStopsDesc: 'Stops actively sampled through smart polling.',
      },
      filters: {
        title: 'Control panel',
        description: 'Apply stop and mode filters to refine the analytics view.',
        stop: 'Stop filter',
        allStops: 'All monitored stops (average)',
      },
      charts: {
        timelineTitle: 'Delay timeline and rush pressure',
        timelineDesc: 'Stacked trend view across tram, bus, and ferry operations.',
        rankingTitle: 'Delay ranking',
        rankingDesc: 'Worst performing lines by average delay in seconds.',
        colorsApi: 'Line colors loaded from official metadata endpoint.',
        colorsFallback: 'Line metadata is unavailable; neutral colors are shown until API color schema loads.',
        modalTitle: 'Modal delay contribution',
        modalDesc: 'Tap chart segments to focus the drilldown by transport mode.',
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
        reliability: 'Tillförlitlighet',
        reliabilityDesc: 'Genomsnittlig punktlighet över övervakade knutpunkter.',
        ridership: 'Daglig resandevolym',
        ridershipDesc: 'Uppskattat antal resenärer i prioriterade korridorer.',
        monitoredStops: 'Övervakade hållplatser',
        monitoredStopsDesc: 'Hållplatser som samplas aktivt via smart polling.',
      },
      filters: {
        title: 'Kontrollpanel',
        description: 'Använd hållplats- och trafikslagsfilter för att förfina analysen.',
        stop: 'Hållplatsfilter',
        allStops: 'Alla övervakade hållplatser (genomsnitt)',
      },
      charts: {
        timelineTitle: 'Tidslinje för försening och rusningstryck',
        timelineDesc: 'Staplad trend över spårvagn, buss och färja.',
        rankingTitle: 'Förseningsranking',
        rankingDesc: 'Sämst presterande linjer efter medelförsening i sekunder.',
        colorsApi: 'Linjefärger laddade från officiellt metadata-endpoint.',
        colorsFallback: 'Linjefärger från API saknas; neutrala färger visas tills färgschemat laddas.',
        modalTitle: 'Förseningsbidrag per trafikslag',
        modalDesc: 'Klicka på diagramsegment för att filtrera drilldown efter trafikslag.',
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
