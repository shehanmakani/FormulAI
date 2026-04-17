# FormulAI

FormulAI is a premium-feeling AI formulation assistant for specialty chemical R&D teams. A chemist describes a target product, tunes sustainability and cost posture, picks a regulatory region, and gets back a structured concept card with ingredient ranges, trade-off commentary, regulatory flags, and a polished export view.

## Who it's for

- Specialty chemical formulators exploring first-pass concepts
- Innovation teams comparing performance, cost, and sustainability posture
- Technical sales and applications groups preparing internal review cards

## What it does

- Captures a formulation brief from a more cinematic control surface
- Streams structured JSON from the Groq API into a live formulation workspace
- Renders ingredient architecture, trade-off scoring, and regulatory watch-outs
- Saves recent formulation sessions in `localStorage`
- Exports a clean browser print view suitable for PDF handoff

## Stack

- React + Vite frontend
- Tailwind CSS for styling
- Express API route for local development and Vercel deployment
- Groq Chat Completions API with JSON output mode

## Local setup

1. Install dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

2. Create an environment file:

   ```bash
   cp .env.example .env
   ```

3. Add your Groq API key to `.env`.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173`.

## Environment variables

- `GROQ_API_KEY`: required
- `GROQ_MODEL`: optional, defaults to `openai/gpt-oss-20b`

## Deployment

This project is structured for Vercel with the API entrypoint at `api/formulate.js`. Add the same environment variables in Vercel before deploying.

## Notes

Generated formulations are intended for expert screening only. Bench validation, SDS review, supplier confirmation, and jurisdiction-specific compliance review are still required before use.
