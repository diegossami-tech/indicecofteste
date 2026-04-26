const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { URL } = require("node:url");

const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(__dirname, "public");
const vanityRoutes = new Map([
  ["/indicecofdiegossamitest", "/indice.html"],
  ["/indicecofdiegossamitest/", "/indice.html"],
  ["/indicecofteste", "/indice.html"],
  ["/indicecofteste/", "/indice.html"],
]);
const localConfigPath = path.join(projectRoot, "config", "corpus.local.json");
const exampleConfigPath = path.join(projectRoot, "config", "corpus.example.json");
const aulaIndexPath = path.join(
  projectRoot,
  "skills",
  "filosofia-olavo-cof",
  "referencias",
  "indice-aulas-completo.md",
);
const host = process.env.COF_WEB_HOST || "0.0.0.0";
const port = Number(process.env.COF_WEB_PORT || 4173);

function resolveCorpusSource() {
  if (fs.existsSync(localConfigPath)) {
    const config = JSON.parse(fs.readFileSync(localConfigPath, "utf8"));
    if (config.corpusPath) {
      return { type: "path", value: config.corpusPath };
    }
  }

  if (process.env.COF_CORPUS_PATH) {
    return { type: "path", value: process.env.COF_CORPUS_PATH };
  }

  if (process.env.COF_CORPUS_URL) {
    return { type: "url", value: process.env.COF_CORPUS_URL };
  }

  throw new Error(
    `Corpus nao configurado. Edite ${localConfigPath}, copie ${exampleConfigPath} ou defina COF_CORPUS_PATH/COF_CORPUS_URL.`,
  );
}

function getRemoteCorpusHeaders() {
  const headers = {};

  if (process.env.COF_CORPUS_BEARER_TOKEN) {
    headers.Authorization = `Bearer ${process.env.COF_CORPUS_BEARER_TOKEN}`;
  }

  if (process.env.COF_CORPUS_AUTH_HEADER_NAME && process.env.COF_CORPUS_AUTH_HEADER_VALUE) {
    headers[process.env.COF_CORPUS_AUTH_HEADER_NAME] = process.env.COF_CORPUS_AUTH_HEADER_VALUE;
  }

  return headers;
}

function getCorpusFileNameFromSource(source) {
  if (source.type === "path") {
    return path.basename(source.value);
  }

  const url = new URL(source.value);
  return path.basename(url.pathname) || "corpus.txt";
}

async function loadCorpus() {
  const source = resolveCorpusSource();
  let text;

  if (source.type === "path") {
    text = fs.readFileSync(source.value, "utf8");
  } else {
    const response = await fetch(source.value, {
      headers: getRemoteCorpusHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Falha ao baixar o corpus remoto: ${response.status} ${response.statusText}`);
    }

    text = await response.text();
  }

  const lines = text.split(/\r?\n/);
  return {
    corpusPath: source.value,
    corpusFileName: getCorpusFileNameFromSource(source),
    corpusSourceType: source.type,
    lines,
  };
}

let corpus;
let aulaIndex = [];
let aulaByNumber = new Map();
let exactAulas = 0;
let estimatedAulas = 0;

function normalizeForSearch(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

function parseIndexValue(value) {
  const trimmed = value.trim();
  if (!trimmed || /^[-—]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function parseMarkdownTableRow(line) {
  if (!line.startsWith("|")) {
    return null;
  }

  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

  return cells.length >= 4 ? cells : null;
}

function parseAulaSpec(spec) {
  const trimmed = spec.trim();
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);

  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    const numbers = [];

    for (let current = start; current <= end; current += 1) {
      numbers.push(current);
    }

    return numbers;
  }

  const single = Number(trimmed);
  return Number.isFinite(single) ? [single] : [];
}

function loadAulaIndex() {
  const indexText = fs.readFileSync(aulaIndexPath, "utf8");
  const lines = indexText.split(/\r?\n/);
  const allAulas = Array.from({ length: 585 }, (_, index) => ({
    number: index + 1,
    startLine: null,
    date: null,
    summary: null,
    source: "estimated",
  }));
  const exactAulaNumbers = [];

  for (const line of lines) {
    const cells = parseMarkdownTableRow(line);
    if (!cells) {
      continue;
    }

    const aulaNumbers = parseAulaSpec(cells[0]);
    const parsedLine = Number(cells[1]);
    const startLine = Number.isFinite(parsedLine) ? parsedLine : null;
    const rawDate = parseIndexValue(cells[2]);
    const rawSummary = parseIndexValue(cells[3]);
    const dateLooksLikeNote = rawDate ? /^\[.*\]$/.test(rawDate) : false;
    const date = dateLooksLikeNote ? null : rawDate;
    const summary = rawSummary || (dateLooksLikeNote ? rawDate : null);

    for (const aulaNumber of aulaNumbers) {
      if (aulaNumber < 1 || aulaNumber > allAulas.length) {
        continue;
      }

      const aula = allAulas[aulaNumber - 1];
      aula.date = date;
      aula.summary = summary;

      if (startLine !== null) {
        aula.startLine = startLine;
        aula.source = "exact";
        exactAulaNumbers.push(aulaNumber);
      }
    }
  }

  exactAulaNumbers.sort((left, right) => left - right);

  for (let index = 0; index < exactAulaNumbers.length - 1; index += 1) {
    const previousNumber = exactAulaNumbers[index];
    const nextNumber = exactAulaNumbers[index + 1];
    const previousAula = allAulas[previousNumber - 1];
    const nextAula = allAulas[nextNumber - 1];

    if (!previousAula || !nextAula) {
      continue;
    }

    const gapSize = nextNumber - previousNumber;
    if (gapSize <= 1) {
      continue;
    }

    const lineDistance = nextAula.startLine - previousAula.startLine;
    const step = lineDistance / gapSize;

    for (let offset = 1; offset < gapSize; offset += 1) {
      const aula = allAulas[previousNumber + offset - 1];
      if (aula.startLine !== null) {
        continue;
      }

      aula.startLine = Math.round(previousAula.startLine + step * offset);
      aula.source = "estimated";
    }
  }

  for (let index = 1; index < allAulas.length; index += 1) {
    const previousAula = allAulas[index - 1];
    const aula = allAulas[index];

    if (aula.startLine === null && previousAula.startLine !== null) {
      aula.startLine = previousAula.startLine + 1;
    }

    if (aula.startLine !== null && previousAula.startLine !== null && aula.startLine <= previousAula.startLine) {
      aula.startLine = previousAula.startLine + 1;
    }
  }

  for (let index = allAulas.length - 2; index >= 0; index -= 1) {
    const aula = allAulas[index];
    const nextAula = allAulas[index + 1];

    if (aula.startLine === null && nextAula.startLine !== null) {
      aula.startLine = Math.max(1, nextAula.startLine - 1);
    }

    if (aula.startLine !== null && nextAula.startLine !== null && aula.startLine >= nextAula.startLine) {
      aula.startLine = Math.max(1, nextAula.startLine - 1);
    }
  }

  return allAulas.map((aula, index) => ({
    ...aula,
    endLine:
      index < allAulas.length - 1 ? allAulas[index + 1].startLine - 1 : corpus.lines.length,
  }));
}

function initializeCorpusState(loadedCorpus) {
  corpus = loadedCorpus;
  aulaIndex = loadAulaIndex();
  aulaByNumber = new Map(aulaIndex.map((aula) => [aula.number, aula]));
  exactAulas = aulaIndex.filter((aula) => aula.source === "exact").length;
  estimatedAulas = aulaIndex.filter((aula) => aula.source === "estimated").length;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(text);
}

function safeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRange(startLine, endLine) {
  const start = clamp(startLine, 1, corpus.lines.length);
  const end = clamp(endLine, start, corpus.lines.length);
  const items = [];

  for (let lineNumber = start; lineNumber <= end; lineNumber += 1) {
    items.push({
      lineNumber,
      text: corpus.lines[lineNumber - 1],
    });
  }

  return items;
}

function getAulaByLine(lineNumber) {
  let left = 0;
  let right = aulaIndex.length - 1;
  let found = null;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const aula = aulaIndex[middle];

    if (lineNumber < aula.startLine) {
      right = middle - 1;
      continue;
    }

    if (lineNumber > aula.endLine) {
      left = middle + 1;
      continue;
    }

    found = aula;
    break;
  }

  return found;
}

function searchCorpusByAula(query, before, after, limit, page) {
  const normalized = normalizeForSearch(query);
  const grouped = new Map();

  for (let index = 0; index < corpus.lines.length; index += 1) {
    const line = corpus.lines[index];
    if (!normalizeForSearch(line).includes(normalized)) {
      continue;
    }

    const lineNumber = index + 1;
    const aula = getAulaByLine(lineNumber);

    if (!aula) {
      continue;
    }

    if (!grouped.has(aula.number)) {
      grouped.set(aula.number, {
        aula: aula.number,
        date: aula.date,
        summary: aula.summary,
        source: aula.source,
        startLine: aula.startLine,
        endLine: aula.endLine,
        firstMatchLine: lineNumber,
        occurrenceCount: 0,
        occurrences: [],
      });
    }

    const entry = grouped.get(aula.number);
    entry.occurrenceCount += 1;

    entry.occurrences.push({
      lineNumber,
      text: line.trim(),
    });
  }

  const allResults = Array.from(grouped.values())
    .sort((left, right) => left.startLine - right.startLine)
    .map((entry) => ({
      ...entry,
      excerpt: getRange(entry.firstMatchLine - before, entry.firstMatchLine + after),
    }));

  const totalResults = allResults.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / limit));
  const safePage = clamp(page, 1, totalPages);
  const offset = (safePage - 1) * limit;
  const pagedResults = allResults.slice(offset, offset + limit);

  return {
    totalResults,
    totalPages,
    page: safePage,
    pageSize: limit,
    results: pagedResults,
  };
}

function findAula(aulaNumber) {
  const indexedAula = aulaByNumber.get(aulaNumber);
  if (indexedAula) {
    return {
      aula: aulaNumber,
      lineNumber: indexedAula.startLine,
      date: indexedAula.date,
      excerpt: getRange(indexedAula.startLine - 2, indexedAula.startLine + 25),
    };
  }

  const formatted = String(aulaNumber).padStart(2, "0");
  const pattern = new RegExp(`\\bAula\\s+${formatted}\\b`, "i");

  for (let index = 0; index < corpus.lines.length; index += 1) {
    if (pattern.test(corpus.lines[index])) {
      const lineNumber = index + 1;
      return {
        aula: aulaNumber,
        lineNumber,
        date: null,
        excerpt: getRange(lineNumber - 2, lineNumber + 25),
      };
    }
  }

  return null;
}

function getAulaExcerpt(aulaNumber, focusLine) {
  const aula = aulaByNumber.get(aulaNumber);
  if (!aula) {
    return null;
  }

  const resolvedFocusLine =
    focusLine && focusLine >= aula.startLine && focusLine <= aula.endLine
      ? focusLine
      : aula.startLine;

  return {
    aula: aulaNumber,
    lineNumber: aula.startLine,
    startLine: aula.startLine,
    endLine: aula.endLine,
    lineCount: aula.endLine - aula.startLine + 1,
    date: aula.date,
    summary: aula.summary,
    source: aula.source,
    focusLine: focusLine ? resolvedFocusLine : null,
    excerpt: getRange(aula.startLine, aula.endLine),
  };
}

function getAulaOccurrences(aulaNumber, query) {
  const aula = aulaByNumber.get(aulaNumber);
  const normalized = (query || "").trim();

  if (!aula || !normalized) {
    return [];
  }

  const normalizedQuery = normalizeForSearch(normalized);
  const occurrences = [];

  for (let lineNumber = aula.startLine; lineNumber <= aula.endLine; lineNumber += 1) {
    const text = corpus.lines[lineNumber - 1] || "";
    if (!normalizeForSearch(text).includes(normalizedQuery)) {
      continue;
    }

    occurrences.push({
      lineNumber,
      text: text.trim(),
    });
  }

  return occurrences;
}

function serveStaticFile(reqPath, res) {
  const normalizedPath = reqPath === "/" ? "/index.html" : reqPath;
  const filePath = path.normalize(path.join(publicDir, normalizedPath));

  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === ".html"
      ? "text/html; charset=utf-8"
      : ext === ".css"
        ? "text/css; charset=utf-8"
        : ext === ".js"
          ? "application/javascript; charset=utf-8"
          : "application/octet-stream";

  sendText(res, 200, fs.readFileSync(filePath), contentType);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);

    if (url.pathname === "/api/meta") {
      sendJson(res, 200, {
        corpusPath: corpus.corpusPath,
        corpusFileName: corpus.corpusFileName,
        corpusSourceType: corpus.corpusSourceType,
        totalLines: corpus.lines.length,
        totalAulas: 585,
        indexedAulas: aulaIndex.length,
        exactAulas,
        estimatedAulas,
      });
      return;
    }

    if (url.pathname === "/api/search") {
      const query = (url.searchParams.get("q") || "").trim();
      const before = clamp(safeNumber(url.searchParams.get("before"), 2), 0, 20);
      const after = clamp(safeNumber(url.searchParams.get("after"), 6), 0, 50);
      const limit = clamp(safeNumber(url.searchParams.get("limit"), 20), 1, 585);
      const page = clamp(safeNumber(url.searchParams.get("page"), 1), 1, 9999);

      if (!query) {
        sendJson(res, 400, { error: "Parametro q e obrigatorio." });
        return;
      }

      const searchResult = searchCorpusByAula(query, before, after, limit, page);

      sendJson(res, 200, {
        query,
        before,
        after,
        limit,
        page: searchResult.page,
        pageSize: searchResult.pageSize,
        totalPages: searchResult.totalPages,
        totalResults: searchResult.totalResults,
        results: searchResult.results,
      });
      return;
    }

    if (url.pathname === "/api/index") {
      sendJson(res, 200, {
        totalAulas: aulaIndex.length,
        exactAulas,
        estimatedAulas,
        items: aulaIndex.map((aula) => ({
          aula: aula.number,
          date: aula.date,
          summary: aula.summary,
          startLine: aula.startLine,
          endLine: aula.endLine,
          source: aula.source,
        })),
      });
      return;
    }

    if (url.pathname === "/api/range") {
      const start = clamp(safeNumber(url.searchParams.get("start"), 1), 1, corpus.lines.length);
      const size = clamp(safeNumber(url.searchParams.get("size"), 80), 1, 400);
      const end = clamp(start + size - 1, start, corpus.lines.length);

      sendJson(res, 200, {
        start,
        end,
        lines: getRange(start, end),
      });
      return;
    }

    if (url.pathname === "/api/aula") {
      const number = clamp(safeNumber(url.searchParams.get("number"), 1), 1, 999);
      const focusLine = safeNumber(url.searchParams.get("focusLine"), 0);
      const query = (url.searchParams.get("q") || "").trim();
      const indexedResult = getAulaExcerpt(number, focusLine || null);
      const result = indexedResult || findAula(number);

      if (!result) {
        sendJson(res, 404, { error: `Aula ${number} nao encontrada por cabecalho literal.` });
        return;
      }

      sendJson(res, 200, {
        aula: number,
        query: query || null,
        occurrences: getAulaOccurrences(number, query),
        ...result,
      });
      return;
    }

    serveStaticFile(vanityRoutes.get(url.pathname) || url.pathname, res);
  } catch (error) {
    sendJson(res, 500, {
      error: error.message,
    });
  }
});

async function startServer() {
  const loadedCorpus = await loadCorpus();
  initializeCorpusState(loadedCorpus);

  server.listen(port, host, () => {
    console.log(`COF web disponivel em http://${host}:${port}`);
    console.log(`Corpus: ${corpus.corpusPath}`);
    console.log(`Origem do corpus: ${corpus.corpusSourceType}`);
    console.log(`Linhas: ${corpus.lines.length}`);
  });
}

startServer().catch((error) => {
  console.error(`Falha ao iniciar o servidor COF: ${error.message}`);
  process.exitCode = 1;
});
