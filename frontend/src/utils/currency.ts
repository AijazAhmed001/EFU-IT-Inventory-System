import { useEffect, useMemo, useState } from 'react'

export type CurrencyCode = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR' | 'CAD' | 'AUD'

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string }[] = [
  { code: 'PKR', label: 'PKR — Pakistani Rupee' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
]

const CURRENCY_KEY = 'efu.displayCurrency'
const RATES_KEY = 'efu.exchangeRates'
const CURRENCY_EVENT = 'efu:currency-changed'

type Rates = Partial<Record<CurrencyCode, number>>

const readCurrency = (): CurrencyCode => {
  const saved = localStorage.getItem(CURRENCY_KEY) as CurrencyCode | null
  return CURRENCY_OPTIONS.some(option => option.code === saved) ? saved! : 'PKR'
}

const readRates = (): Rates => {
  try {
    const cached = JSON.parse(localStorage.getItem(RATES_KEY) || '{}') as { rates?: Rates }
    return { PKR: 1, ...(cached.rates ?? {}) }
  } catch {
    return { PKR: 1 }
  }
}

let ratesPromise: Promise<Rates> | null = null

export function setDisplayCurrency(currency: string) {
  const next = CURRENCY_OPTIONS.some(option => option.code === currency)
    ? currency as CurrencyCode
    : 'PKR'
  localStorage.setItem(CURRENCY_KEY, next)
  window.dispatchEvent(new CustomEvent(CURRENCY_EVENT, { detail: next }))
}

export async function loadExchangeRates(): Promise<Rates> {
  ratesPromise ??= fetch('https://open.er-api.com/v6/latest/PKR')
    .then(async response => {
      if (!response.ok) throw new Error('Unable to load exchange rates')
      const payload = await response.json() as { result?: string; rates?: Record<string, number> }
      if (payload.result !== 'success' || !payload.rates) throw new Error('Invalid exchange rates')

      const rates: Rates = { PKR: 1 }
      CURRENCY_OPTIONS.forEach(({ code }) => {
        const rate = payload.rates?.[code]
        if (typeof rate === 'number' && Number.isFinite(rate)) rates[code] = rate
      })
      localStorage.setItem(RATES_KEY, JSON.stringify({ savedAt: Date.now(), rates }))
      return rates
    })
    .catch(() => readRates())
    .finally(() => { ratesPromise = null })

  return ratesPromise
}

export function formatMoney(value: number | undefined, currency: CurrencyCode, rate = 1) {
  return new Intl.NumberFormat(currency === 'PKR' ? 'en-PK' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'PKR' ? 0 : 2,
  }).format((value ?? 0) * rate)
}

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>(readCurrency)
  const [rates, setRates] = useState<Rates>(readRates)

  useEffect(() => {
    const onCurrencyChanged = (event: Event) => {
      setCurrency((event as CustomEvent<CurrencyCode>).detail || readCurrency())
    }
    window.addEventListener(CURRENCY_EVENT, onCurrencyChanged)
    void loadExchangeRates().then(setRates)
    return () => window.removeEventListener(CURRENCY_EVENT, onCurrencyChanged)
  }, [])

  const rate = rates[currency] ?? (currency === 'PKR' ? 1 : 0)

  return useMemo(() => ({
    currency,
    rate,
    format: (value?: number) => rate
      ? formatMoney(value, currency, rate)
      : 'Rate unavailable',
  }), [currency, rate])
}

export async function getCurrencyContext() {
  const currency = readCurrency()
  const rates = await loadExchangeRates()
  return { currency, rate: rates[currency] ?? (currency === 'PKR' ? 1 : 0) }
}
