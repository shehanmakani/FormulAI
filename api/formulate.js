import express from "express";
import cors from "cors";
import { streamFormulation } from "./shared/streamFormulation.js";

const app = express();

app.use(
  cors({
    origin: true,
  }),
);
app.use(express.json());

app.post("/api/formulate", streamFormulation);

export default app;
