import TickerToCIK from './ticker_to_cik.json';

export function tickerToCIK(ticker: string): string {
    return TickerToCIK[ticker.toUpperCase() as keyof typeof TickerToCIK] ?? '';
}


export function getCIKFormMetadataFromSEC(fullCIK: string): string {
    return `https://data.sec.gov/api/xbrl/companyconcept/CIK0000050863/us-gaap/AccountsPayableCurrent.json`;
}