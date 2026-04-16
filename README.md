# FormulAI

FormulAI is an AI-powered formulation assistant for specialty chemical R&D teams. A chemist describes a target product, tunes sustainability and cost priorities, picks a regulatory region, and gets back a structured draft formulation with ingredient ranges, trade-off commentary, regulatory flags, and a printable formulation card.

## Who it's for

- Industrial chemists exploring first-pass formulation concepts
- Applications and innovation teams comparing performance and sustainability trade-offs
- Internal technical teams who need a clean formulation card for rapid review

## What it does

- Captures a target product brief from the landing workspace
- Streams a structured formulation response from the OpenAI Responses API
- Renders ingredient windows, trade-off scoring, and regulatory notes in a clean dashboard
- Exports the formulation card through the browser print dialog for PDF output
- Saves recent formulation history locally in the browser

## Tech choices

- React + Vite frontend with Tailwind CSS styling
- Express-based API route for local development and Vercel-style deployment
- OpenAI Responses API with Structured Outputs JSON schema enforcement
- `localStorage` for lightweight history persistence

## Local setup

1. Install dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

2. Create an environment file:

   ```bash
   cp .env.example .env
   ```

3. Add your OpenAI API key to `.env`.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173`.

## Environment variables

- `OPENAI_API_KEY`: required for formulation generation
- `OPENAI_MODEL`: optional, defaults to `gpt-4o-2024-08-06`

## Deployment notes

This repo includes a Vercel-oriented API entrypoint under `api/formulate.js`. Add the same environment variables in your deployment platform before publishing.

## Showcase assets

- Screenshot: capture the rendered formulation card after generating a sample brief
- Loom: record the landing input, live streaming generation, and export flow

## Notes

Generated formulations are intended for expert screening only. Bench validation, SDS review, and region-specific compliance review are still required before use.
