import TickerToCIK from './ticker_to_cik.json';

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type Company = {
  symbol: string;
  name: string;
};

export function tickerToCIK(ticker: string): string {
    return TickerToCIK[ticker.toUpperCase() as keyof typeof TickerToCIK] ?? '';
}


export function getCIKFormMetadataFromSEC(fullCIKNumber: string)  {
    return `https://data.sec.gov/api/xbrl/companyconcept/CIK${fullCIKNumber}/us-gaap/AccountsPayableCurrent.json`;
}

export function getMetadataObjectFromURL(url: string): Promise<any> {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error fetching metadata:', error);
            return null;
        });
}

export function getMostRecent10KURLFromMetadataFromSEC(SECMetadataObject: any): string {
    const filings = SECMetadataObject.units.USD;

    // const mostRecent10K = filings
        // .filter((item: any) => item.form === '10-K' || item.form === '10-K/A')
        // .sort(
            // (a: any, b: any) =>
                // new Date(b.filed).getTime() - new Date(a.filed).getTime()
        // )[0];

    // assume most recent 10-K is the last one in the filings array for speed, 10-K/A is amendment to 10-K
    let mostRecent10K: any = null;
    for (let i = filings.length - 1; i >= 0; i--) {
        if (filings[i].form === '10-K' || filings[i].form === '10-K/A') {
            mostRecent10K = filings[i];
            break;
        }
    }

    if (!mostRecent10K) {
        return '';
    }

    const truncatedCIK: string = SECMetadataObject.cik;
    const accnFolder: string = mostRecent10K.accn.replace(/-/g, '');

    return `https://www.sec.gov/Archives/edgar/data/${truncatedCIK}/${accnFolder}/${mostRecent10K.accn}.txt`;
}


export function get10KfromURL(url: string): Promise<string> {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .catch(error => {
            console.error('Error fetching 10-K form:', error);
            return '';
        });
}

export async function getMostRecent10KFormTextFromTicker(ticker: string): Promise<string> {
    const cik = tickerToCIK(ticker);
    if (!cik) {
        return '';
    }

    const metadataUrl = getCIKFormMetadataFromSEC(cik);
    const metadata = await getMetadataObjectFromURL(metadataUrl);
    if (!metadata) {
        return '';
    }

    const filingUrl = getMostRecent10KURLFromMetadataFromSEC(metadata);
    if (!filingUrl) {
        return '';
    }

    return await get10KfromURL(filingUrl);
}


export function removeStyling(htmlString: string): string {
  // Remove content within <style> tags
  let withoutStyle = htmlString.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove inline style attributes
  let withoutInlineStyle = withoutStyle.replace(/style="[^"]*"/gi, '');

  // Remove class attributes
  let withoutClass = withoutInlineStyle.replace(/class="[^"]*"/gi, '');

  // Remove any other attributes that might be related to styling (e.g., data-*)
  let withoutDataAttributes = withoutClass.replace(/data-[a-zA-Z0-9-]+="[^"]*"/gi, '');

  return withoutDataAttributes;
}



export function cleanSECDocument(secDocument: string): string {
    // Remove SGML/XML tags, comments, and processing instructions
    let cleanedText = secDocument.replace(/<[^>]*>/g, '');
    cleanedText = cleanedText.replace(/<\?.*\?>/g, ''); // Remove processing instructions

    // Remove extra whitespace and newlines
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

    // Remove XBRL tags, but keep the data within.  This is tricky, better to remove all XBRL for now.
    cleanedText = cleanedText.replace(/<XBRL>[\s\S]*?<\/XBRL>/g, '');

    // Remove any non-alphanumeric characters except for spaces, periods, commas,
    // forward slashes, hyphens, parentheses, and plus sign.  Crucial for data like
    // company names, addresses, and financial figures.  We *do* want to keep '+'.
    //  The original regex was too aggressive.
    cleanedText = cleanedText.replace(/[^\w\s.,\/\-()+]/g, '');

    // Remove HTML entities
    cleanedText = cleanedText.replace(/&[a-z0-9#]+;/g, '');

     // Remove leading/trailing newlines
    cleanedText = cleanedText.replace(/^\n+/, '').replace(/\n+$/, '');

    // Collapse multiple newlines into a single newline
    cleanedText = cleanedText.replace(/\n+/g, '\n');
    
    return cleanedText;
}



export function extractFinancialDataFrom10K(tenKText: string): string {
  // Identify the main content block of the 10-K.
  // This is a simplified approach and might need refinement based on the
  // specific structure of your 10-K documents. Look for common patterns
  // or delimiters that enclose the core financial information.
  const documentStart = tenKText.indexOf("<DOCUMENT>");
  const documentEnd = tenKText.indexOf("</DOCUMENT>");

  if (documentStart === -1 || documentEnd === -1 || documentStart >= documentEnd) {
    console.warn("Could not reliably identify the <DOCUMENT> section.");
    return "";
  }

  const documentContent = tenKText.substring(documentStart, documentEnd + "</DOCUMENT>".length);

  // Remove XML and HTML tags, focusing on the text content within.
  // This will remove the XBRL tags, HTML structure, and potentially inline styles.
  const textWithoutTags = documentContent.replace(/<[^>]*>/g, '');

  // Further cleanup: remove any remaining noise like excessive whitespace,
  // non-content markers, or specific boilerplate text that isn't financial data.
  // This step might require more specific regular expressions or keyword-based filtering
  // depending on the common non-financial elements in your 10-K files.

  // Remove potential XBRL header/footer markers (adjust as needed)
  const withoutXBRLMarkers = textWithoutTags
    .replace(/XBRL DOCUMENT CREATED WITH THE WORKIVA PLATFORM/i, '')
    .replace(/Copyright \d{4} Workiva/i, '')
    .replace(/<\/XBRL>/i, '')
    .replace(/<XBRL>/i, '');

  // Remove any lines that appear to be mostly whitespace or short non-informative lines.
  const lines = withoutXBRLMarkers.split('\n').filter(line => line.trim().length > 5);
  const cleanedText = lines.join('\n').trim();

  // At this point, `cleanedText` should contain primarily the textual content
  // of the 10-K, hopefully including the financial statements and related information.
  // Further refinement might involve identifying specific sections (e.g., using keywords
  // like "Balance Sheets", "Income Statements", "Cash Flow Statements", "Notes to Financial Statements")
  // if you need to isolate those parts more precisely.

  return cleanedText;
}


export function extractFinancialDataFrom10KwithTables(tenKText: string): string {
  // Identify the main content block of the 10-K.
  const documentStart = tenKText.indexOf("<DOCUMENT>");
  const documentEnd = tenKText.indexOf("</DOCUMENT>");

  if (documentStart === -1 || documentEnd === -1 || documentStart >= documentEnd) {
    console.warn("Could not reliably identify the <DOCUMENT> section.");
    return "";
  }

  const documentContent = tenKText.substring(documentStart, documentEnd + "</DOCUMENT>".length);

  // Remove XML and most HTML tags, but preserve table-related tags.
  const textWithTables = documentContent.replace(/<(?!(table|tbody|thead|tr|th|td)\b)[^>]*>/g, '');

  // Further cleanup: remove any remaining noise like excessive whitespace,
  // non-content markers, or specific boilerplate text that isn't financial data.

  // Remove potential XBRL header/footer markers
  const withoutXBRLMarkers = textWithTables
    .replace(/XBRL DOCUMENT CREATED WITH THE WORKIVA PLATFORM/i, '')
    .replace(/Copyright \d{4} Workiva/i, '')
    .replace(/<\/XBRL>/i, '')
    .replace(/<XBRL>/i, '');

  // Remove any attributes within table tags (e.g., style, class, etc.)
  const cleanedTables = withoutXBRLMarkers.replace(/<(table|tbody|thead|tr|th|td)\s+[^>]*>/g, '<$1>');

  // Remove any lines that appear to be mostly whitespace or short non-informative lines.
  const lines = cleanedTables.split('\n').filter(line => line.trim().length > 5);
  const finalCleanedText = lines.join('\n').trim();

  return finalCleanedText;
}
