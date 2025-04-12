## Run the development server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Need API keys as environment variables
Set them up


## SEC filing API information

```
CIK is ##########
            ##### is truncated CIK
CIK is 0000050863 for Intel for example.
```

Step 0. Retrieve company CIK, function resources/TickerToCIK()

Step 1. Get document accessionNumber (for 10-K/10-Q) from this endpoint
```
json = https://data.sec.gov/api/xbrl/companyconcept/CIK##########/us-gaap/AccountsPayableCurrent.json
json = https://data.sec.gov/api/xbrl/companyconcept/CIK0000050863/us-gaap/AccountsPayableCurrent.json

json.units.USD holds a list of all document information in format 
      
{
    "end": "2024-12-28",
    "val": 12556000000,
    "accn": "0000050863-25-000009",
    "fy": 2024,
    "fp": "FY",
    "form": "10-K",
    "filed": "2025-01-31",
    "frame": "CY2024Q4I"   
}
```

Step 2. 
```
Truncated CIK -> ##### 
https://www.sec.gov/Archives/edgar/data/50863/000005086325000009/0000050863-25-000009.txt
```

https://www.sec.gov/Archives/edgar/data/`json.cik`/`json.units.USD[x].accn[fields 2 and 3]`/`json.units.USD[x].accn`.txt


## Next

[Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.