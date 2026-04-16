import express from "express";
import cors from "cors";
import { streamFormulation } from "../api/shared/streamFormulation.js";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/formulate", streamFormulation);

app.listen(port, () => {
  console.log(`FormulAI API listening on http://localhost:${port}`);
});
