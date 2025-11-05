export function OrganizationStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Monitor Judicial PJBC',
    url: 'https://monitorjudicial.com.mx',
    logo: 'https://monitorjudicial.com.mx/logo.png',
    description:
      'Sistema automatizado de monitoreo de boletines judiciales del Poder Judicial de Baja California. Alertas instantáneas por WhatsApp y email.',
    areaServed: {
      '@type': 'State',
      name: 'Baja California',
      containsPlace: [
        { '@type': 'City', name: 'Tijuana' },
        { '@type': 'City', name: 'Mexicali' },
        { '@type': 'City', name: 'Ensenada' },
        { '@type': 'City', name: 'Tecate' },
      ],
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: 'Spanish',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function SoftwareApplicationStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Monitor Judicial PJBC',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'MXN',
        name: 'Plan Gratis',
        description: '5 casos monitoreados',
      },
      {
        '@type': 'Offer',
        price: '299',
        priceCurrency: 'MXN',
        name: 'Plan Básico',
        description: '100 casos monitoreados con alertas por WhatsApp',
      },
      {
        '@type': 'Offer',
        price: '999',
        priceCurrency: 'MXN',
        name: 'Plan Profesional',
        description: '500 casos monitoreados con soporte prioritario',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function FAQStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Puedo cambiar de plan en cualquier momento?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sí, puede actualizar o degradar su plan en cualquier momento. Los cambios se reflejarán inmediatamente en su cuenta.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué métodos de pago aceptan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Aceptamos todas las tarjetas de crédito y débito principales a través de Stripe, nuestra plataforma de pagos segura.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Ofrecen reembolsos?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sí, ofrecemos reembolsos completos dentro de los primeros 7 días de su suscripción si no está satisfecho con el servicio.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Con qué frecuencia se revisan los boletines?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Nuestro sistema revisa los boletines judiciales 3 veces al día de lunes a viernes. Recibirá alertas instantáneas cuando se encuentre una coincidencia.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Necesito conocimientos técnicos?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No, nuestra plataforma es muy fácil de usar. Solo necesita agregar los números de expediente que desea monitorear y nosotros hacemos el resto.',
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function LocalBusinessStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://monitorjudicial.com.mx',
    name: 'Monitor Judicial PJBC',
    description:
      'Servicio de monitoreo automático de boletines judiciales del Poder Judicial de Baja California',
    url: 'https://monitorjudicial.com.mx',
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Baja California',
      addressCountry: 'MX',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '32.5149',
      longitude: '-117.0382',
    },
    areaServed: [
      {
        '@type': 'City',
        name: 'Tijuana',
        '@id': 'https://www.wikidata.org/wiki/Q124739',
      },
      {
        '@type': 'City',
        name: 'Mexicali',
        '@id': 'https://www.wikidata.org/wiki/Q61302',
      },
      {
        '@type': 'City',
        name: 'Ensenada',
        '@id': 'https://www.wikidata.org/wiki/Q80922',
      },
      {
        '@type': 'City',
        name: 'Tecate',
        '@id': 'https://www.wikidata.org/wiki/Q385284',
      },
    ],
    priceRange: '$0 - $999 MXN',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
