import TickerToCIK from './ticker_to_cik.json';

export function tickerToCIK(ticker: string): string {
    return TickerToCIK[ticker.toUpperCase() as keyof typeof TickerToCIK] ?? '';
}