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

The PDF defaults to **62 x 100 mm** for the QL-800 test printer. Set the Brother driver to the 62 x 100 mm paper size with scaling disabled. The QL-800 and QL-1100 support different rolls, so validate the driver paper selection before enabling the Airtable automation.

The page dimensions can be changed in Vercel without changing code:

```dotenv
LABEL_WIDTH_MM=62
LABEL_HEIGHT_MM=100
```

After changing either value, redeploy the Vercel project.

## Illustrator label workflow

Create the label artwork in Adobe Illustrator with an exact **62 x 100 mm**
artboard and export it as a PDF. To make Airtable values fillable, open the PDF
in Adobe Acrobat Pro, choose **Prepare a form**, and add text fields whose names
match the Airtable field names. Keep a copy of the original `.ai` source file.

The app currently continues using its built-in 62 x 100 mm label until a
fillable Illustrator/Acrobat PDF is added to the repository. Do not add crop
marks, bleed, page scaling, or printer marks to the exported template.

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

PrintNode's idempotency key uses the Airtable record ID, so retries do not create another print job. To intentionally reprint the same record, use PrintNode's interface for now; a dedicated reprint endpoint can be added later.

## Label fields

The initial label reads these existing fields when present: `Job orders`, `TOTAL FILM ROLLS`, `First Name`, `Last Name`, `Film Development`, `Your negatives`, `CUT NEGATIVES?`, `FORMAT`, `C41 TOTAL`, `BW TOTAL`, `E6 TOTAL`, `Dropbox Location`, and `Notes`.
