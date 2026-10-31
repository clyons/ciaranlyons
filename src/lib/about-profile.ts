interface AboutHistoryItem {
  organization: string
  href?: string
  role: string
  result: string
}

interface AboutCaseStudy {
  title: string
  href: string
  discipline: string
  description: string
}

export const aboutHistory: readonly AboutHistoryItem[] = [
  {
    organization: 'Positive Intelligence',
    href: 'https://www.positiveintelligence.com/',
    role: 'Chief Operating Officer',
    result: 'Over 250,000 PQ Program participants',
  },
  {
    organization: 'Sticker Mule',
    href: 'https://www.stickermule.com/',
    role: 'Director of Global SEO',
    result: '+52% organic traffic YoY',
  },
  {
    organization: 'I Will Teach You To Be Rich',
    href: 'https://www.iwillteachyoutoberich.com/',
    role: 'Organic and content marketing',
    result: '+50% leads YoY',
  },
  {
    organization: 'Gold Lion at Cannes',
    role: 'Project Silverline',
    result: '2013',
  },
] as const

export const aboutCaseStudies: readonly AboutCaseStudy[] = [
  {
    title: 'Project Silverline: Connecting Seniors Through Technology',
    href: 'https://www.campaignasia.com/article/singtel-csr-initiative-refurbishes-iphones-for-seniors/318689',
    discipline: 'Product / Mobile Apps',
    description: 'A SingTel initiative that refurbished donated iPhones with custom-built apps to reconnect isolated seniors with their communities. Winner of a Gold Lion at Cannes.',
  },
  {
    title: 'How a Content Company Uses Zapier to Learn From Its Email Data',
    href: 'https://web.archive.org/web/20171219160051/https://zapier.com/blog/content-management-data-automation/',
    discipline: 'Data Analysis / CRM',
    description: 'An automated analysis workflow that turned email-marketing data into a useful operating system—without writing code.',
  },
  {
    title: 'How Automation Helped Little Green Dot Grow',
    href: 'https://mailchimp.com/resources/how-automation-helped-little-green-dot-grow/',
    discipline: 'Automation / Email Marketing',
    description: 'A Mailchimp automation that educated more than 25,000 students during the launch of How to Become a Morning Person.',
  },
] as const
