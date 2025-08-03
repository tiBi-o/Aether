// Basic Express server setup
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Health endpoint
// Checks SQLite3 connection; TODO: Switch to PostgreSQL after migration
const db = require("./db");
app.get("/health", (req, res) => {
  db.get("SELECT 1", (err) => {
    if (err) {
      // Database not healthy
      return res.status(503).json({ status: "error", db: "unavailable" });
    }
    res.status(200).json({ status: "ok", db: "sqlite3" });
  });
});

// Default route
app.get("/", (req, res) => {
  res.send("Hello, world! Your Express server is running.");
});

// Test error route
app.get("/test-error", (req, res, next) => {
  const err = new Error("Simulated error for testing");
  err.status = 418;
  next(err);
});

// Centralized error handler
app.use((err, req, res, next) => {
  // Log error details
  console.error("--- Error Handler ---");
  console.error("Time:", new Date().toISOString());
  console.error("Method:", req.method);
  console.error("URL:", req.originalUrl);
  console.error("Body:", req.body);
  console.error("Error Stack:", err.stack);

  // Differentiate error response by environment
  const isDev = process.env.NODE_ENV !== "production";
  res.status(err.status || 500).json({
    error: isDev ? err.message : "Internal Server Error",
    ...(isDev && { stack: err.stack }),
  });
});

// Database initialization
require("./db");

const crud = require("./crud");

// --- PROMPT PROCESSING ENDPOINT ---
const { MockAIService } = require("./aiService");
const aiService = new MockAIService();

app.post("/prompt", async (req, res, next) => {
  const { prompt } = req.body;
  // Input validation
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res
      .status(400)
      .json({ error: "Prompt is required and must be a non-empty string." });
  }
  try {
    // Use AI service abstraction with new content format
    const aiResponse = await aiService.generateContent(prompt);
    crud.createPrompt(prompt, (err, dbResult) => {
      if (err) return next(err);
      // Store both prompt and generated content
      crud.createAIResult(dbResult.id, aiResponse.content, (err, aiResult) => {
        if (err) return next(err);
        res.status(201).json({
          ...aiResponse,
          promptId: dbResult.id,
          resultId: aiResult.id,
        });
      });
    });
  } catch (err) {
    // AI service error handling
    next(err);
  }
});

// --- PREVIEW ENDPOINT ---
const previewTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    .preview { max-width: 800px; margin: 2rem auto; font-family: system-ui; }
    .preview h1 { color: #2c3e50; }
    .preview .content { line-height: 1.6; }
  </style>
</head>
<body>
  <div class="preview">
    <h1>${content.title}</h1>
    <div class="content">${content.body}</div>
  </div>
</body>
</html>
`;

app.get("/preview", (req, res) => {
  const { content } = req.query;
  if (!content) {
    return res.status(400).json({ error: "Content parameter is required" });
  }
  try {
    const contentObj = JSON.parse(content);
    if (!contentObj.title || !contentObj.body) {
      return res.status(400).json({
        error: "Content must include title and body",
      });
    }
    res.send(previewTemplate(contentObj));
  } catch (err) {
    res.status(400).json({
      error: "Invalid content format",
      details: err.message,
    });
  }
});

// --- PROMPTS CRUD API ---
app.post("/api/prompts", (req, res, next) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  crud.createPrompt(prompt, (err, result) => {
    if (err) return next(err);
    res.status(201).json(result);
  });
});

app.get("/api/prompts", (req, res, next) => {
  crud.getPrompts((err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

app.get("/api/prompts/:id", (req, res, next) => {
  crud.getPromptById(req.params.id, (err, row) => {
    if (err) return next(err);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});

app.put("/api/prompts/:id", (req, res, next) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  crud.updatePrompt(req.params.id, prompt, (err, result) => {
    if (err) return next(err);
    res.json(result);
  });
});

app.delete("/api/prompts/:id", (req, res, next) => {
  crud.deletePrompt(req.params.id, (err, result) => {
    if (err) return next(err);
    res.json(result);
  });
});

// --- AI_RESULTS CRUD API ---
app.post("/api/ai_results", (req, res, next) => {
  const { prompt_id, result } = req.body;
  if (!prompt_id || !result)
    return res.status(400).json({ error: "prompt_id and result are required" });
  crud.createAIResult(prompt_id, result, (err, resultObj) => {
    if (err) return next(err);
    res.status(201).json(resultObj);
  });
});

app.get("/api/ai_results", (req, res, next) => {
  crud.getAIResults((err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

app.get("/api/ai_results/:id", (req, res, next) => {
  crud.getAIResultById(req.params.id, (err, row) => {
    if (err) return next(err);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});

app.put("/api/ai_results/:id", (req, res, next) => {
  const { result } = req.body;
  if (!result) return res.status(400).json({ error: "result is required" });
  crud.updateAIResult(req.params.id, result, (err, resultObj) => {
    if (err) return next(err);
    res.json(resultObj);
  });
});

app.delete("/api/ai_results/:id", (req, res, next) => {
  crud.deleteAIResult(req.params.id, (err, resultObj) => {
    if (err) return next(err);
    res.json(resultObj);
  });
});

// --- OVERRIDES CRUD API ---
app.post("/api/overrides", (req, res, next) => {
  const { ai_result_id, override } = req.body;
  if (!ai_result_id || !override)
    return res
      .status(400)
      .json({ error: "ai_result_id and override are required" });
  crud.createOverride(ai_result_id, override, (err, resultObj) => {
    if (err) return next(err);
    res.status(201).json(resultObj);
  });
});

app.get("/api/overrides", (req, res, next) => {
  crud.getOverrides((err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

app.get("/api/overrides/:id", (req, res, next) => {
  crud.getOverrideById(req.params.id, (err, row) => {
    if (err) return next(err);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});

app.put("/api/overrides/:id", (req, res, next) => {
  const { override } = req.body;
  if (!override) return res.status(400).json({ error: "override is required" });
  crud.updateOverride(req.params.id, override, (err, resultObj) => {
    if (err) return next(err);
    res.json(resultObj);
  });
});

app.delete("/api/overrides/:id", (req, res, next) => {
  crud.deleteOverride(req.params.id, (err, resultObj) => {
    if (err) return next(err);
    res.json(resultObj);
  });
});

// --- PDF_EXPORTS CRUD API ---
app.post("/api/pdf_exports", (req, res, next) => {
  const { ai_result_id, file_path } = req.body;
  if (!ai_result_id || !file_path)
    return res
      .status(400)
      .json({ error: "ai_result_id and file_path are required" });
  crud.createPDFExport(ai_result_id, file_path, (err, resultObj) => {
    if (err) return next(err);
    res.status(201).json(resultObj);
  });
});

app.get("/api/pdf_exports", (req, res, next) => {
  crud.getPDFExports((err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

app.get("/api/pdf_exports/:id", (req, res, next) => {
  crud.getPDFExportById(req.params.id, (err, row) => {
    if (err) return next(err);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});

app.put("/api/pdf_exports/:id", (req, res, next) => {
  const { file_path } = req.body;
  if (!file_path)
    return res.status(400).json({ error: "file_path is required" });
  crud.updatePDFExport(req.params.id, file_path, (err, resultObj) => {
    if (err) return next(err);
    res.json(resultObj);
  });
});

app.delete("/api/pdf_exports/:id", (req, res, next) => {
  crud.deletePDFExport(req.params.id, (err, resultObj) => {
    if (err) return next(err);
    res.json(resultObj);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
