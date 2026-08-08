# Airtable to Brother label printing

A standalone, zero-dependency Node.js service. An Airtable Automation sends a record ID, the service verifies `Dropbox Location` is `IN-STORE`, fetches the current record, generates a one-page PDF label, and submits it to PrintNode. PrintNode then prints through the installed Brother QL-800 or QL-1100 driver.

## Setup

1. Install the Brother printer and confirm a normal PDF prints at the intended label size.
2. Install and sign in to the PrintNode Client on that computer.
3. Find the printer ID in PrintNode, copy `.env.example` to `.env.local`, and fill in all values.
4. Start locally with `npm run dev`, or deploy the folder as a Node 20 service with `npm start`.
5. Confirm `GET /health` returns `{ "ok": true }`.

## Deploy to Vercel

Create a new Vercel project from the repository and set **Root Directory** to
`printnode-airtable-labels`. Vercel will detect the `api` directory as Node.js
Functions; no build command or output directory is required.

In **Project Settings > Environment Variables**, add every variable from
`.env.example` except `PORT`. Add them to Production (and Preview if you want to
test preview deployments), then redeploy. Secrets must remain server-side and
must never be prefixed with `NEXT_PUBLIC_`.

After deployment, verify:

```text
https://YOUR-PROJECT.vercel.app/health
```

Use this URL in Make's HTTP module:

```text
https://YOUR-PROJECT.vercel.app/webhooks/airtable
```

The PDF defaults to **102 x 152 mm** for the QL-1100. Set the Brother driver to the matching paper size with scaling disabled. The QL-800 and QL-1100 support different rolls, so validate the driver paper selection before enabling the Airtable automation.

The page dimensions can be changed in Vercel without changing code:

```dotenv
LABEL_WIDTH_MM=102
LABEL_HEIGHT_MM=152
```

After changing either value, redeploy the Vercel project.

## Label design

The label is generated in `src/label.js` and scaled as vector artwork to the
configured paper size, including the layout, Airtable values, Code 128 barcode,
and Camera-Lisatie logo. It does not
depend on an Illustrator or Acrobat template. Replace
`assets/logo-lab-zwart.png` to update the logo, then run `npm run sample` and
inspect `output/pdf/generated-label-preview.pdf` before deploying.

## Airtable Automation

Trigger: **When record matches conditions**

- `Dropbox Location` is `IN-STORE`
- Optionally add a checkbox such as `Auto Print Enabled` to make rollout safer.

Action: **Run a script**. Add an input variable named `recordId`, mapped to the triggering record's Airtable record ID.

```js
const { recordId } = input.config();

const response = await fetch("https://YOUR-SERVICE.example/webhooks/airtable", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-webhook-secret": "YOUR_WEBHOOK_SECRET",
  },
  body: JSON.stringify({ recordId }),
});

if (!response.ok) throw new Error(await response.text());
output.set("result", await response.json());
```

Every authenticated request to `/webhooks/airtable` creates a new PrintNode
job, even when the same Airtable record ID was printed before. This allows the
existing Make scenario to reprint an order without a second endpoint or
scenario. Be aware that automatic retries from Make also create another label.

## Label fields

The initial label reads these existing fields when present: `Job orders`, `TOTAL FILM ROLLS`, `First Name`, `Last Name`, `Film Development`, `Your negatives`, `CUT NEGATIVES?`, `FORMAT`, `C41 TOTAL`, `BW TOTAL`, `E6 TOTAL`, `Dropbox Location`, and `Notes`.
