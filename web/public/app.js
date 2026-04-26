const searchForm = document.querySelector("#search-form");
const aulaForm = document.querySelector("#aula-form");
const resultsSection = document.querySelector(".results-section");
const resultsTitle = document.querySelector("#results-title");
const resultsSubtitle = document.querySelector("#results-subtitle");
const feedback = document.querySelector("#feedback");
const results = document.querySelector("#results");
const searchInput = document.querySelector("#search-query");
const searchBeforeInput = document.querySelector("#search-before");
const searchAfterInput = document.querySelector("#search-after");
const searchLimitInput = document.querySelector("#search-limit");

let lastSearchPayload = null;
let activeQuery = "";
let currentAulaContext = null;
let currentAulaPayload = null;
let lessonViewMode = "book";
let lessonFlowMode = "vertical";
let lessonTermSearchTimer = null;
let mainSearchTimer = null;
const AUTO_SEARCH_DELAY_MS = 900;
const AUTO_SEARCH_MIN_LENGTH = 3;
const HIDDEN_DISPLAY_LINES = new Set([
  "[versão provisória]",
  "para uso exclusivo dos alunos do curso de filosofia online.",
  "o texto desta transcrição não foi revisto ou corrigido pelo autor.",
  "por favor não cite nem divulgue este material.",
]);

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function normalizeForSearch(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}

function setResultsMode(mode) {
  results.className = `results results-${mode}`;
  resultsSection.dataset.mode = mode;
  document.body.classList.toggle("lesson-only-mode", mode === "aula");
}

function setLessonViewMode(mode, syncUrl = true) {
  lessonViewMode = mode === "plain" ? "plain" : "book";
  document.body.classList.toggle("lesson-book-mode", lessonViewMode === "book");

  if (syncUrl && resultsSection.dataset.mode === "aula") {
    updateUrl({
      view: lessonViewMode === "book" ? "book" : "plain",
    });
  }
}

function setLessonFlowMode(mode, syncUrl = true) {
  lessonFlowMode = mode === "horizontal" ? "horizontal" : "vertical";
  document.body.classList.toggle("lesson-horizontal-mode", lessonFlowMode === "horizontal");

  if (syncUrl && resultsSection.dataset.mode === "aula") {
    updateUrl({
      flow: lessonViewMode === "book" ? lessonFlowMode : null,
    });
  }
}

function getHighlightRanges(text, query) {
  if (!query) {
    return [];
  }

  const normalizedTextChars = [];
  const originalCharIndexes = [];
  const originalChars = Array.from(text);

  originalChars.forEach((char, index) => {
    const normalizedChars = Array.from(char.normalize("NFD").replace(/\p{Diacritic}/gu, ""));

    normalizedChars.forEach((normalizedChar) => {
      normalizedTextChars.push(normalizedChar.toLocaleLowerCase());
      originalCharIndexes.push(index);
    });
  });

  const normalizedText = normalizedTextChars.join("");
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) {
    return [];
  }

  const ranges = [];
  let startIndex = 0;

  while (startIndex < normalizedText.length) {
    const foundIndex = normalizedText.indexOf(normalizedQuery, startIndex);
    if (foundIndex === -1) {
      break;
    }

    const originalStart = originalCharIndexes[foundIndex];
    const originalEnd = originalCharIndexes[foundIndex + normalizedQuery.length - 1] + 1;
    ranges.push([originalStart, originalEnd]);
    startIndex = foundIndex + normalizedQuery.length;
  }

  return ranges;
}

function highlightText(text, query) {
  const safeText = text || " ";
  const ranges = getHighlightRanges(safeText, query);

  if (!ranges.length) {
    return escapeHtml(safeText);
  }

  const chars = Array.from(safeText);
  let cursor = 0;
  let html = "";

  ranges.forEach(([start, end]) => {
    if (start > cursor) {
      html += escapeHtml(chars.slice(cursor, start).join(""));
    }

    html += `<mark>${escapeHtml(chars.slice(start, end).join(""))}</mark>`;
    cursor = end;
  });

  if (cursor < chars.length) {
    html += escapeHtml(chars.slice(cursor).join(""));
  }

  return html;
}

function showFeedback(message, type = "info") {
  feedback.hidden = false;
  feedback.className = `feedback ${type}`;
  feedback.textContent = message;
}

function clearFeedback() {
  feedback.hidden = true;
  feedback.textContent = "";
  feedback.className = "feedback";
}

function updateUrl(params) {
  const url = new URL(window.location.href);

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      url.searchParams.delete(key);
      return;
    }

    url.searchParams.set(key, String(value));
  });

  window.history.replaceState({}, "", url);
}

function getSourceLabel(source) {
  return source === "exact" ? "Linha exata do indice" : "Faixa estimada no indice";
}

function getSummaryCopy(summary) {
  return summary || "Sem resumo adicional registrado para esta aula no indice.";
}

function shouldRunAutoSearch(query) {
  const trimmedQuery = (query || "").trim();
  return !trimmedQuery || trimmedQuery.length >= AUTO_SEARCH_MIN_LENGTH;
}

function buildAulaHref(aulaNumber, lineNumber, query = activeQuery) {
  const params = new URLSearchParams();
  params.set("aula", String(aulaNumber));
  params.set("line", String(lineNumber));
  params.set("view", lessonViewMode === "book" ? "book" : "plain");
  if (lessonViewMode === "book") {
    params.set("flow", lessonFlowMode === "horizontal" ? "horizontal" : "vertical");
  }

  if (query) {
    params.set("q", query);
  }

  return `/?${params.toString()}`;
}

function renderFocusedOccurrenceInlineLegacy() {
  if (!activeQuery || !currentAulaContext?.occurrences?.length) {
    return "";
  }

  const { occurrences, currentIndex } = currentAulaContext;
  const first = occurrences[0];
  const previous = occurrences[currentIndex - 1];
  const next = occurrences[currentIndex + 1];
  const last = occurrences[occurrences.length - 1];

  return `
    <span class="focus-occurrence-nav" aria-label="Navegacao entre ocorrencias do termo">
      ${
        currentIndex > 0
          ? `
            <button
              class="focus-occurrence-button"
              type="button"
              data-line="${first.lineNumber}"
              aria-label="Ir para a primeira ocorrencia"
              title="Primeira ocorrencia"
            >
              ↤
            </button>
          `
          : `<span class="focus-occurrence-button is-disabled" aria-hidden="true">↤</span>`
      }
      ${
        previous
          ? `
            <button
              class="focus-occurrence-button"
              type="button"
              data-line="${previous.lineNumber}"
              aria-label="Ir para a ocorrencia anterior"
            >
              ←
            </button>
          `
          : `<span class="focus-occurrence-button is-disabled" aria-hidden="true">←</span>`
      }
      <span class="focus-occurrence-count">${currentIndex + 1}/${occurrences.length}</span>
      ${
        next
          ? `
            <button
              class="focus-occurrence-button"
              type="button"
              data-line="${next.lineNumber}"
              aria-label="Ir para a proxima ocorrencia"
            >
              →
            </button>
          `
          : `<span class="focus-occurrence-button is-disabled" aria-hidden="true">→</span>`
      }
      ${
        currentIndex < occurrences.length - 1
          ? `
            <button
              class="focus-occurrence-button"
              type="button"
              data-line="${last.lineNumber}"
              aria-label="Ir para a ultima ocorrencia"
              title="Ultima ocorrencia"
            >
              ↦
            </button>
          `
          : `<span class="focus-occurrence-button is-disabled" aria-hidden="true">↦</span>`
      }
    </span>
  `;
}

function renderFocusedOccurrenceInline() {
  if (!activeQuery || !currentAulaContext?.occurrences?.length) {
    return "";
  }

  const { occurrences, currentIndex } = currentAulaContext;
  const previous = occurrences[currentIndex - 1];
  const next = occurrences[currentIndex + 1];

  return `
    <span class="focus-occurrence-nav" aria-label="Navegacao entre ocorrencias do termo">
      <button
        class="focus-occurrence-button focus-occurrence-jump"
        type="button"
        data-jump="start"
        aria-label="Ir para o inicio do texto"
      >
        inicio
      </button>
      ${
        previous
          ? `
            <button
              class="focus-occurrence-button"
              type="button"
              data-line="${previous.lineNumber}"
              aria-label="Ir para a ocorrencia anterior"
            >
              ←
            </button>
          `
          : `<span class="focus-occurrence-button is-disabled" aria-hidden="true">←</span>`
      }
      <span class="focus-occurrence-count">${currentIndex + 1}/${occurrences.length}</span>
      <span class="focus-occurrence-go">
        <input
          class="focus-occurrence-input"
          type="number"
          min="1"
          max="${occurrences.length}"
          value="${currentIndex + 1}"
          inputmode="numeric"
          aria-label="Digite o numero da ocorrencia"
        />
        <button
          class="focus-occurrence-button focus-occurrence-go-button"
          type="button"
          data-go-occurrence="true"
          aria-label="Ir para a ocorrencia digitada"
        >
          ir
        </button>
      </span>
      ${
        next
          ? `
            <button
              class="focus-occurrence-button"
              type="button"
              data-line="${next.lineNumber}"
              aria-label="Ir para a proxima ocorrencia"
            >
              →
            </button>
          `
          : `<span class="focus-occurrence-button is-disabled" aria-hidden="true">→</span>`
      }
      <button
        class="focus-occurrence-button focus-occurrence-jump"
        type="button"
        data-jump="end"
        aria-label="Ir para o fim do texto"
      >
        fim
      </button>
    </span>
  `;
}

function renderExcerpt(lines, focusLineNumber = null, query = "") {
  return `
    <div class="excerpt">
      ${lines
        .map(({ lineNumber, text }) => {
          const focusClass = lineNumber === focusLineNumber ? "line focus" : "line";
          return `
            <div class="${focusClass}" data-line-number="${lineNumber}">
              <span class="line-number">${lineNumber}</span>
              <div class="line-content">
                ${lineNumber === focusLineNumber ? renderFocusedOccurrenceInline() : ""}
                <code>${highlightText(text || " ", query)}</code>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function normalizeBookText(text) {
  return (text || "").replace(/\f/g, " ").replace(/\s+/g, " ").trim();
}

function shouldHideDisplayLine(text) {
  const compact = normalizeBookText(text).toLocaleLowerCase();
  return HIDDEN_DISPLAY_LINES.has(compact);
}

function getDisplayLines(lines) {
  return lines.filter((line) => !shouldHideDisplayLine(line.text));
}

function getParagraphClass(text, lines) {
  const compact = text.trim();
  if (!compact) {
    return "book-paragraph";
  }

  const looksLikeHeading =
    lines.length === 1 &&
    (/^aula\s+\d+/i.test(compact) ||
      /^\d{1,2}\s+de\s+/i.test(compact) ||
      /^curso online/i.test(compact) ||
      compact === compact.toUpperCase());

  return looksLikeHeading ? "book-paragraph book-frontmatter" : "book-paragraph";
}

function isBookPageArtifact(text) {
  const compact = normalizeBookText(text);
  return /^\d{1,4}$/.test(compact);
}

function findNextMeaningfulBookLine(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const candidate = normalizeBookText(lines[index].text);

    if (!candidate || isBookPageArtifact(candidate)) {
      continue;
    }

    return candidate;
  }

  return "";
}

function isSoftBookBreak(nextText) {
  if (!nextText) {
    return false;
  }

  return /^[\p{Ll}\d"'“”‘’()[\],;:—-]/u.test(nextText);
}

function buildBookParagraphs(lines, focusLineNumber = null) {
  const paragraphs = [];
  let buffer = [];

  function flush() {
    if (!buffer.length) {
      return;
    }

    const text = buffer.map((item) => normalizeBookText(item.text)).join(" ").replace(/\s+/g, " ").trim();
    if (!text) {
      buffer = [];
      return;
    }

    const startLine = buffer[0].lineNumber;
    const endLine = buffer[buffer.length - 1].lineNumber;
    const containsFocus = focusLineNumber
      ? buffer.some((item) => item.lineNumber === focusLineNumber)
      : false;

    paragraphs.push({
      text,
      startLine,
      endLine,
      containsFocus,
      className: getParagraphClass(text, buffer),
    });

    buffer = [];
  }

  lines.forEach((line, index) => {
    const compact = normalizeBookText(line.text);

    if (!compact) {
      const nextMeaningfulLine = findNextMeaningfulBookLine(lines, index + 1);

      if (!buffer.length || !isSoftBookBreak(nextMeaningfulLine)) {
        flush();
      }
      return;
    }

    if (isBookPageArtifact(compact)) {
      const nextMeaningfulLine = findNextMeaningfulBookLine(lines, index + 1);

      if (!buffer.length || !isSoftBookBreak(nextMeaningfulLine)) {
        flush();
      }
      return;
    }

    buffer.push(line);
  });

  flush();
  return paragraphs;
}

function renderBookExcerpt(lines, focusLineNumber = null, query = "") {
  const paragraphs = buildBookParagraphs(lines, focusLineNumber);
  const flowClass = lessonFlowMode === "horizontal" ? "flow-horizontal" : "flow-vertical";

  return `
    <div class="book-excerpt ${flowClass}">
      ${paragraphs
        .map((paragraph) => {
          const focusClass = paragraph.containsFocus ? " focus" : "";
          return `
            <p
              class="${paragraph.className}${focusClass}"
              data-line-start="${paragraph.startLine}"
              data-line-end="${paragraph.endLine}"
            >
              ${paragraph.containsFocus ? renderFocusedOccurrenceInline() : ""}
              ${highlightText(paragraph.text, query)}
            </p>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderLessonExcerpt(lines, focusLineNumber = null, query = "") {
  const displayLines = getDisplayLines(lines);

  if (lessonViewMode === "book") {
    return renderBookExcerpt(displayLines, focusLineNumber, query);
  }

  return renderExcerpt(displayLines, focusLineNumber, query);
}

function scrollToFocusLine() {
  const focusElement = results.querySelector(".line.focus, .book-paragraph.focus");
  if (!focusElement) {
    return;
  }

  focusElement.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });
}

function getReadingProgressValue() {
  if (resultsSection.dataset.mode !== "aula") {
    return 0;
  }

  if (lessonViewMode === "plain") {
    const excerpt = results.querySelector(".aula-stage-main .excerpt");
    if (!excerpt) {
      return 0;
    }

    const maxScroll = excerpt.scrollHeight - excerpt.clientHeight;
    return maxScroll > 0 ? excerpt.scrollTop / maxScroll : 0;
  }

  if (lessonFlowMode === "horizontal") {
    const bookExcerpt = results.querySelector(".aula-stage-main .book-excerpt.flow-horizontal");
    if (!bookExcerpt) {
      return 0;
    }

    const maxScroll = bookExcerpt.scrollWidth - bookExcerpt.clientWidth;
    return maxScroll > 0 ? bookExcerpt.scrollLeft / maxScroll : 0;
  }

  const documentRoot = document.documentElement;
  const maxScroll = documentRoot.scrollHeight - window.innerHeight;
  return maxScroll > 0 ? window.scrollY / maxScroll : 0;
}

function updateReadingProgress() {
  const progress = Math.max(0, Math.min(1, getReadingProgressValue()));
  document.documentElement.style.setProperty("--reading-progress", `${progress * 100}%`);
}

function scrollToTextBoundary(target) {
  const stageMain = results.querySelector(".aula-stage-main");
  if (!stageMain) {
    return false;
  }

  if (lessonViewMode === "plain") {
    const excerpt = stageMain.querySelector(".excerpt");
    if (!excerpt) {
      return false;
    }

    excerpt.scrollTo({
      top: target === "start" ? 0 : excerpt.scrollHeight,
      behavior: "smooth",
    });
    requestAnimationFrame(() => updateReadingProgress());
    return true;
  }

  const bookExcerpt = stageMain.querySelector(".book-excerpt");
  if (!bookExcerpt) {
    return false;
  }

  if (lessonFlowMode === "horizontal") {
    bookExcerpt.scrollTo({
      left: target === "start" ? 0 : bookExcerpt.scrollWidth,
      behavior: "smooth",
    });
    requestAnimationFrame(() => updateReadingProgress());
    return true;
  }

  const top =
    target === "start"
      ? stageMain.getBoundingClientRect().top + window.scrollY - 24
      : stageMain.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 24;

  window.scrollTo({
    top,
    behavior: "smooth",
  });
  requestAnimationFrame(() => updateReadingProgress());
  return true;
}

function setFocusedLine(lineNumber) {
  const excerpt = results.querySelector(".aula-stage-main .excerpt");
  const bookExcerpt = results.querySelector(".aula-stage-main .book-excerpt");

  if (excerpt) {
    const target = excerpt.querySelector(`.line[data-line-number="${lineNumber}"]`);
    if (!target) {
      return false;
    }

    excerpt.querySelectorAll(".line.focus").forEach((line) => line.classList.remove("focus"));
    target.classList.add("focus");
    target.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });

    return true;
  }

  if (!bookExcerpt) {
    return false;
  }

  const target = Array.from(bookExcerpt.querySelectorAll(".book-paragraph")).find((paragraph) => {
    const start = Number(paragraph.dataset.lineStart);
    const end = Number(paragraph.dataset.lineEnd);
    return lineNumber >= start && lineNumber <= end;
  });

  if (!target) {
    return false;
  }

  bookExcerpt.querySelectorAll(".book-paragraph.focus").forEach((paragraph) => paragraph.classList.remove("focus"));
  target.classList.add("focus");
  target.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });

  return true;
}

function updateAulaOccurrenceSelection(lineNumber) {
  if (!currentAulaContext) {
    return false;
  }

  const nextIndex = currentAulaContext.occurrences.findIndex(
    (occurrence) => occurrence.lineNumber === lineNumber,
  );

  if (nextIndex === -1) {
    return false;
  }

  currentAulaContext.currentIndex = nextIndex;

  const stage = results.querySelector(".aula-stage");
  if (!stage) {
    return false;
  }

  stage.querySelectorAll(".aula-occurrence-item").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.line) === lineNumber);
  });

  const counter = stage.querySelector(".occurrence-nav-count");
  if (counter) {
    counter.textContent = `${nextIndex + 1} de ${currentAulaContext.occurrences.length}`;
  }

  const previousButtons = stage.querySelectorAll(".prev-occurrence-button");
  const nextButtons = stage.querySelectorAll(".next-occurrence-button");
  const inlineCounter = stage.querySelector(".inline-occurrence-count");
  const previous = currentAulaContext.occurrences[nextIndex - 1];
  const next = currentAulaContext.occurrences[nextIndex + 1];

  previousButtons.forEach((button) => {
    button.dataset.line = previous ? String(previous.lineNumber) : "";
    button.disabled = !previous;
  });

  nextButtons.forEach((button) => {
    button.dataset.line = next ? String(next.lineNumber) : "";
    button.disabled = !next;
  });

  if (inlineCounter) {
    inlineCounter.textContent = `${nextIndex + 1}/${currentAulaContext.occurrences.length}`;
  }

  updateUrl({
    line: lineNumber,
  });

  if (currentAulaPayload) {
    currentAulaPayload = {
      ...currentAulaPayload,
      focusLine: lineNumber,
    };
  }

  const stageMain = stage.querySelector(".aula-stage-main");
  if (stageMain && currentAulaPayload?.excerpt) {
    stageMain.innerHTML = renderLessonExcerpt(currentAulaPayload.excerpt, lineNumber, activeQuery);
  }

  const didFocus = setFocusedLine(lineNumber);
  requestAnimationFrame(() => updateReadingProgress());
  return didFocus;
}

function jumpToOccurrenceNumber(rawValue) {
  if (!currentAulaContext?.occurrences?.length) {
    return false;
  }

  const occurrenceNumber = Number(rawValue);
  if (!Number.isInteger(occurrenceNumber)) {
    return false;
  }

  if (occurrenceNumber < 1 || occurrenceNumber > currentAulaContext.occurrences.length) {
    return false;
  }

  const target = currentAulaContext.occurrences[occurrenceNumber - 1];
  return updateAulaOccurrenceSelection(target.lineNumber);
}

function scrollToResultsStart() {
  resultsSection.scrollIntoView({
    block: "start",
    behavior: "smooth",
  });
}

function renderPagination(payload) {
  const pageButtons = [];
  const startPage = Math.max(1, payload.page - 2);
  const endPage = Math.min(payload.totalPages, startPage + 4);

  for (let currentPage = startPage; currentPage <= endPage; currentPage += 1) {
    const activeClass =
      currentPage === payload.page ? "pagination-button active" : "pagination-button";

    pageButtons.push(`
      <button class="${activeClass}" type="button" data-page="${currentPage}">
        ${currentPage}
      </button>
    `);
  }

  return `
    <nav class="pagination" aria-label="Paginacao dos resultados">
      <button
        class="secondary-button pagination-button"
        type="button"
        data-page="${payload.page - 1}"
        ${payload.page <= 1 ? "disabled" : ""}
      >
        Anterior
      </button>
      ${pageButtons.join("")}
      <button
        class="secondary-button pagination-button"
        type="button"
        data-page="${payload.page + 1}"
        ${payload.page >= payload.totalPages ? "disabled" : ""}
      >
        Proxima
      </button>
    </nav>
  `;
}

function renderResultSummary(item) {
  const summaryItems = [
    item.date ? `<span class="summary-pill">Data: ${escapeHtml(item.date)}</span>` : "",
    `<span class="summary-pill">${getSourceLabel(item.source)}</span>`,
    `<span class="summary-pill">Primeira linha: ${item.firstMatchLine}</span>`,
    `<span class="summary-pill">Intervalo: ${item.startLine}-${item.endLine}</span>`,
  ]
    .filter(Boolean)
    .join("");

  return `<div class="result-summary">${summaryItems}</div>`;
}

function getOccurrenceForLine(item, lineNumber) {
  return item.occurrences.find((occurrence) => occurrence.lineNumber === lineNumber) || item.occurrences[0];
}

function renderOccurrencePreview(item, query, lineNumber = item.firstMatchLine) {
  const occurrence = getOccurrenceForLine(item, lineNumber);
  if (!occurrence) {
    return `<div class="empty-state empty-state-minimal">Nenhuma ocorrencia disponivel para esta aula.</div>`;
  }

  return `
    <div class="preview-frame">
      <div class="preview-head">
        <strong>Linha selecionada</strong>
        <span class="summary-pill">Linha ${occurrence.lineNumber}</span>
      </div>
      ${renderExcerpt([occurrence], occurrence.lineNumber, query)}
    </div>
  `;
}

function updateSearchPreview(aulaNumber, lineNumber) {
  const item = lastSearchPayload?.results?.find((entry) => entry.aula === aulaNumber);
  if (!item) {
    return false;
  }

  const card = results.querySelector(`.search-card[data-aula="${aulaNumber}"]`);
  const preview = card?.querySelector(".search-card-preview");
  const openLink = card?.querySelector(".open-aula-link");

  if (!card || !preview || !openLink) {
    return false;
  }

  preview.innerHTML = renderOccurrencePreview(item, lastSearchPayload.query, lineNumber);
  openLink.href = buildAulaHref(aulaNumber, lineNumber, lastSearchPayload?.query || activeQuery);

  card.querySelectorAll(".occurrence-item").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.line) === lineNumber);
  });

  return true;
}

function renderSearchResults(payload) {
  setResultsMode("search");
  currentAulaPayload = null;
  lastSearchPayload = payload;
  currentAulaContext = null;
  activeQuery = payload.query;

  updateUrl({
    q: payload.query,
    before: searchBeforeInput.value,
    after: searchAfterInput.value,
    limit: searchLimitInput.value,
    page: payload.page,
    aula: null,
    line: null,
    view: null,
    flow: null,
  });

  resultsTitle.textContent = `Aulas com "${payload.query}"`;
  resultsSubtitle.textContent = `${payload.totalResults} aula(s) encontrada(s). Pagina ${payload.page} de ${payload.totalPages}.`;

  if (!payload.results.length) {
    results.innerHTML = `<div class="empty-state">Nenhum resultado encontrado.</div>`;
    return;
  }

  const cardsHtml = payload.results
    .map((item) => {
      const visibleOccurrences = item.occurrences.slice(0, 8);
      const remainingOccurrences = item.occurrences.length - visibleOccurrences.length;

      return `
        <article class="result-card search-card" data-aula="${item.aula}">
          <div class="search-card-head">
            <div>
              <div class="result-head">
                <span class="result-badge">Aula ${String(item.aula).padStart(2, "0")}</span>
                <strong>${item.occurrenceCount} ocorrencia(s)</strong>
              </div>
              <p class="search-card-summary">${escapeHtml(getSummaryCopy(item.summary))}</p>
            </div>
          </div>
          ${renderResultSummary(item)}
          <div class="search-card-layout">
            <div class="occurrence-list">
              <strong>Ocorrencias desta aula</strong>
              ${visibleOccurrences
                .map(
                  (occurrence) => `
                  <button
                    class="occurrence-item${occurrence.lineNumber === item.firstMatchLine ? " active" : ""}"
                    type="button"
                    data-aula="${item.aula}"
                    data-line="${occurrence.lineNumber}"
                    >
                      <span class="occurrence-line">Linha ${occurrence.lineNumber}</span>
                      <span class="occurrence-text">${highlightText(occurrence.text || " ", payload.query)}</span>
                    </button>
                  `,
                )
                .join("")}
              ${
                remainingOccurrences > 0
                  ? `<p class="result-meta">+ ${remainingOccurrences} ocorrencia(s) adicional(is) nesta aula.</p>`
                  : ""
              }
            </div>
            <div class="search-card-preview">
              ${renderOccurrencePreview(item, payload.query, item.firstMatchLine)}
            </div>
          </div>
          <div class="search-card-cta">
              <a
                class="button-link open-aula-link"
                href="${buildAulaHref(item.aula, item.firstMatchLine, payload.query)}"
              >
                Ler aula completa nesta linha
              </a>
          </div>
        </article>
      `;
    })
    .join("");

  const paginationHtml = payload.totalPages > 1 ? renderPagination(payload) : "";

  results.innerHTML = `
    ${paginationHtml}
    ${cardsHtml}
    ${paginationHtml}
  `;

  requestAnimationFrame(() => scrollToResultsStart());
}

function buildAulaContext(payload) {
  if (payload.occurrences?.length) {
    const currentIndex = payload.focusLine
      ? payload.occurrences.findIndex((occurrence) => occurrence.lineNumber === payload.focusLine)
      : 0;

    return {
      aula: payload.aula,
      occurrences: payload.occurrences,
      currentIndex: currentIndex >= 0 ? currentIndex : 0,
    };
  }

  const searchEntry = lastSearchPayload?.results?.find((item) => item.aula === payload.aula);
  if (!searchEntry || !searchEntry.occurrences?.length) {
    return null;
  }

  const currentIndex = payload.focusLine
    ? searchEntry.occurrences.findIndex((occurrence) => occurrence.lineNumber === payload.focusLine)
    : 0;

  return {
    aula: payload.aula,
    occurrences: searchEntry.occurrences,
    currentIndex: currentIndex >= 0 ? currentIndex : 0,
  };
}

function renderOccurrenceNavigation() {
  if (!currentAulaContext) {
    return `
      <div class="aula-side-block">
        <strong>Leitura corrida</strong>
        <p class="results-subtle">Sem ocorrencias vinculadas nesta abertura. Use a busca para navegar por pontos especificos.</p>
      </div>
    `;
  }

  const { occurrences, currentIndex } = currentAulaContext;
  const previous = occurrences[currentIndex - 1];
  const next = occurrences[currentIndex + 1];
  const visibleOccurrences = occurrences.slice(0, 24);

  return `
    <div class="occurrence-nav">
      <div class="occurrence-nav-head">
        <strong>Ocorrencias nesta aula</strong>
        <span class="occurrence-nav-count">${currentIndex + 1} de ${occurrences.length}</span>
      </div>
      <div class="aula-occurrence-list">
        ${visibleOccurrences
          .map(
            (occurrence, index) => `
              <button
                class="aula-occurrence-item${index === currentIndex ? " active" : ""}"
                type="button"
                data-line="${occurrence.lineNumber}"
              >
                <span>Linha ${occurrence.lineNumber}</span>
              </button>
            `,
          )
          .join("")}
        ${
          occurrences.length > visibleOccurrences.length
            ? `<p class="results-subtle">Mostrando as primeiras ${visibleOccurrences.length} ocorrencias desta aula.</p>`
            : ""
        }
      </div>
      <div class="result-actions result-actions-compact">
        <button
          class="secondary-button prev-occurrence-button"
          type="button"
          data-line="${previous ? previous.lineNumber : ""}"
          ${previous ? "" : "disabled"}
        >
          Ocorrencia anterior
        </button>
        <button
          class="secondary-button next-occurrence-button"
          type="button"
          data-line="${next ? next.lineNumber : ""}"
          ${next ? "" : "disabled"}
        >
          Proxima ocorrencia
        </button>
      </div>
    </div>
  `;
}

function renderAulaResult(payload) {
  setResultsMode("aula");
  setLessonViewMode(lessonViewMode, false);
  setLessonFlowMode(lessonFlowMode, false);
  currentAulaPayload = payload;
  currentAulaContext = buildAulaContext(payload);
  resultsTitle.textContent = `Aula ${payload.aula}`;
  resultsSubtitle.textContent = payload.focusLine
    ? `Leitura integral com foco na linha ${payload.focusLine}.${payload.date ? ` Data: ${payload.date}.` : ""}`
    : `Leitura integral carregada.${payload.date ? ` Data: ${payload.date}.` : ""}`;

  updateUrl({
    aula: payload.aula,
    line: payload.focusLine || null,
    view: lessonViewMode === "book" ? "book" : "plain",
    flow: lessonViewMode === "book" ? lessonFlowMode : null,
  });

  const previousAula = payload.aula > 1 ? payload.aula - 1 : null;
  const nextAula = payload.aula < 585 ? payload.aula + 1 : null;
  const queryNote = activeQuery
    ? `<p class="aula-stage-note">Consulta ativa: <strong>${escapeHtml(activeQuery)}</strong></p>`
    : "";

  results.innerHTML = `
    <div class="reading-progress" aria-hidden="true">
      <span class="reading-progress-bar"></span>
    </div>
    <article class="result-card aula-stage">
      <div class="aula-stage-head">
        <div class="aula-stage-copy">
          <p class="eyebrow results-eyebrow">Leitura integral</p>
          <h3 class="aula-stage-title">Aula ${String(payload.aula).padStart(2, "0")}</h3>
          <p class="aula-stage-description">${escapeHtml(getSummaryCopy(payload.summary))}</p>
          ${queryNote}
        </div>
        <div class="aula-stage-meta">
          <div class="result-summary">
            ${payload.date ? `<span class="summary-pill">Data: ${escapeHtml(payload.date)}</span>` : ""}
            <span class="summary-pill">${getSourceLabel(payload.source)}</span>
            <span class="summary-pill">Linhas ${payload.startLine || payload.lineNumber}-${payload.endLine || payload.lineNumber}</span>
            ${payload.lineCount ? `<span class="summary-pill">${payload.lineCount} linha(s)</span>` : ""}
          </div>
        </div>
      </div>
      <div class="aula-stage-toolbar">
        <div class="result-actions">
          <button class="secondary-button previous-page-button" type="button">
            Voltar para a pagina anterior
          </button>
          <button class="secondary-button lesson-view-toggle" type="button">
            ${lessonViewMode === "book" ? "Voltar ao modo tecnico" : "Testar modo livro"}
          </button>
          ${
            lessonViewMode === "book"
              ? `
                <button class="secondary-button lesson-flow-toggle" type="button">
                  ${
                    lessonFlowMode === "horizontal"
                      ? "Voltar para leitura vertical"
                      : "Ler horizontalmente como livro"
                  }
                </button>
              `
              : ""
          }
        </div>
        <form class="lesson-term-form" data-aula="${payload.aula}">
          <label class="sr-only" for="lesson-term-input">Pesquisar termo nesta aula</label>
          <input
            id="lesson-term-input"
            class="lesson-term-input"
            type="text"
            name="lesson-q"
            value="${escapeHtml(activeQuery)}"
            placeholder="Pesquisar termo nesta aula"
          />
          <span class="lesson-term-hint">busca automatica</span>
        </form>
      </div>
      <div class="aula-stage-layout">
        <aside class="aula-stage-side">
          ${renderOccurrenceNavigation()}
        </aside>
        <div class="aula-stage-main">
          ${renderLessonExcerpt(payload.excerpt, payload.focusLine || payload.lineNumber, activeQuery)}
        </div>
      </div>
    </article>
  `;

  if (payload.focusLine) {
    requestAnimationFrame(() => scrollToFocusLine());
  }

  requestAnimationFrame(() => updateReadingProgress());
}

function renderRangeResult(payload) {
  setResultsMode("range");
  currentAulaPayload = null;
  currentAulaContext = null;
  resultsTitle.textContent = `Linhas ${payload.start} a ${payload.end}`;
  resultsSubtitle.textContent = `${payload.lines.length} linha(s) carregadas para inspecao tecnica.`;
  results.innerHTML = `
    <article class="result-card range-card">
      <div class="result-summary">
        <span class="summary-pill">Consulta tecnica</span>
        <span class="summary-pill">${payload.lines.length} linha(s)</span>
      </div>
      ${renderExcerpt(payload.lines)}
    </article>
  `;
}

function renderWelcomeState() {
  setResultsMode("welcome");
  currentAulaPayload = null;
  currentAulaContext = null;
  resultsTitle.textContent = "Pronto para consultar";
  resultsSubtitle.textContent = "Pesquise um tema ou abra uma aula especifica para comecar.";
  results.innerHTML = `
    <div class="empty-state empty-state-minimal">
      Digite um termo acima para ver em quais aulas ele aparece.
    </div>
  `;
}

async function getJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Erro inesperado.");
  }

  return payload;
}

async function loadAulaView(aulaNumber, query = "", focusLine = null) {
  const trimmedQuery = (query || "").trim();
  const payload = await getJson(
    `/api/aula?number=${encodeURIComponent(aulaNumber)}${focusLine ? `&focusLine=${encodeURIComponent(focusLine)}` : ""}${trimmedQuery ? `&q=${encodeURIComponent(trimmedQuery)}` : ""}`,
  );

  activeQuery = trimmedQuery;

  if (!focusLine && trimmedQuery && payload.occurrences?.length) {
    payload.focusLine = payload.occurrences[0].lineNumber;
  }

  renderAulaResult(payload);
  return payload;
}

async function loadMeta() {
  await getJson("/api/meta");
}

async function performSearch(queryOverride = null, pageOverride = null) {
  clearFeedback();

  const q = (queryOverride ?? searchInput.value).trim();
  const before = searchBeforeInput.value;
  const after = searchAfterInput.value;
  const limit = searchLimitInput.value;
  const page = pageOverride ?? 1;

  if (!q) {
    activeQuery = "";
    updateUrl({
      q: null,
      page: null,
      aula: null,
      line: null,
      view: null,
      flow: null,
    });
    renderWelcomeState();
    return;
  }

  searchInput.value = q;
  activeQuery = q;

  try {
    const payload = await getJson(
      `/api/search?q=${encodeURIComponent(q)}&before=${encodeURIComponent(before)}&after=${encodeURIComponent(after)}&limit=${encodeURIComponent(limit)}&page=${encodeURIComponent(page)}`,
    );
    renderSearchResults(payload);
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await performSearch();
});

searchInput.addEventListener("input", () => {
  if (mainSearchTimer) {
    window.clearTimeout(mainSearchTimer);
  }

  mainSearchTimer = window.setTimeout(async () => {
    if (!shouldRunAutoSearch(searchInput.value)) {
      return;
    }

    await performSearch(searchInput.value, 1);
  }, AUTO_SEARCH_DELAY_MS);
});

results.addEventListener("submit", async (event) => {
  const lessonTermForm = event.target.closest(".lesson-term-form");
  if (!lessonTermForm) {
    return;
  }

  event.preventDefault();
  clearFeedback();

  const aulaNumber = Number(lessonTermForm.dataset.aula);
  const termInput = lessonTermForm.querySelector(".lesson-term-input");
  const query = (termInput?.value || "").trim();

  if (!Number.isFinite(aulaNumber)) {
    showFeedback("Numero da aula invalido.", "error");
    return;
  }

  try {
    const payload = await loadAulaView(aulaNumber, query);
    if (query && !payload.occurrences?.length) {
      showFeedback(`O termo "${query}" nao apareceu nesta aula.`, "warn");
    }
  } catch (error) {
    showFeedback(error.message, "error");
  }
});

results.addEventListener("input", (event) => {
  const lessonTermInput = event.target.closest(".lesson-term-input");
  if (!lessonTermInput || !currentAulaPayload) {
    return;
  }

  const aulaNumber = Number(lessonTermInput.closest(".lesson-term-form")?.dataset.aula);
  const nextQuery = lessonTermInput.value.trim();

  if (!Number.isFinite(aulaNumber)) {
    return;
  }

  if (lessonTermSearchTimer) {
    window.clearTimeout(lessonTermSearchTimer);
  }

  lessonTermSearchTimer = window.setTimeout(async () => {
    clearFeedback();

    if (aulaNumber !== currentAulaPayload?.aula) {
      return;
    }

    if (!shouldRunAutoSearch(nextQuery)) {
      return;
    }

    if (nextQuery === (activeQuery || "").trim()) {
      return;
    }

    try {
      const payload = await loadAulaView(aulaNumber, nextQuery);
      if (nextQuery && !payload.occurrences?.length) {
        showFeedback(`O termo "${nextQuery}" nao apareceu nesta aula.`, "warn");
      }
    } catch (error) {
      showFeedback(error.message, "error");
    }
  }, AUTO_SEARCH_DELAY_MS);
});

aulaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFeedback();

  const number = document.querySelector("#aula-number").value;

  try {
    await loadAulaView(number);
  } catch (error) {
    showFeedback(error.message, "error");
  }
});

results.addEventListener("click", async (event) => {
  const occurrenceButton = event.target.closest(".occurrence-item");
  if (occurrenceButton) {
    clearFeedback();

    const aulaNumber = Number(occurrenceButton.dataset.aula);
    const lineNumber = Number(occurrenceButton.dataset.line);

    if (Number.isFinite(aulaNumber) && Number.isFinite(lineNumber) && updateSearchPreview(aulaNumber, lineNumber)) {
      return;
    }
  }

  const backButton = event.target.closest(".back-to-search-button");
  if (backButton && lastSearchPayload) {
    clearFeedback();
    renderSearchResults(lastSearchPayload);
    return;
  }

  const previousPageButton = event.target.closest(".previous-page-button");
  if (previousPageButton) {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
    return;
  }

  const lessonViewToggle = event.target.closest(".lesson-view-toggle");
  if (lessonViewToggle && currentAulaPayload) {
    lessonViewMode = lessonViewMode === "book" ? "plain" : "book";
    renderAulaResult(currentAulaPayload);
    return;
  }

  const lessonFlowToggle = event.target.closest(".lesson-flow-toggle");
  if (lessonFlowToggle && currentAulaPayload) {
    lessonFlowMode = lessonFlowMode === "horizontal" ? "vertical" : "horizontal";
    renderAulaResult(currentAulaPayload);
    return;
  }

  const aulaOccurrenceButton = event.target.closest(".aula-occurrence-item");
  if (aulaOccurrenceButton) {
    clearFeedback();
    updateAulaOccurrenceSelection(Number(aulaOccurrenceButton.dataset.line));
    return;
  }

  const focusJumpButton = event.target.closest(".focus-occurrence-jump[data-jump]");
  if (focusJumpButton) {
    clearFeedback();
    scrollToTextBoundary(focusJumpButton.dataset.jump);
    return;
  }

  const goOccurrenceButton = event.target.closest(".focus-occurrence-go-button");
  if (goOccurrenceButton) {
    clearFeedback();
    const input = results.querySelector(".focus-occurrence-input");
    if (!jumpToOccurrenceNumber(input?.value)) {
      showFeedback("Digite um numero de ocorrencia valido.", "warn");
    }
    return;
  }

  const focusOccurrenceButton = event.target.closest(".focus-occurrence-button[data-line]");
  if (focusOccurrenceButton && currentAulaContext) {
    clearFeedback();
    updateAulaOccurrenceSelection(Number(focusOccurrenceButton.dataset.line));
    return;
  }

  const topButton = event.target.closest(".top-of-aula-button");
  if (topButton) {
    clearFeedback();

    try {
      await loadAulaView(topButton.dataset.aula);
    } catch (error) {
      showFeedback(error.message, "error");
    }

    return;
  }

  const previousOccurrenceButton = event.target.closest(".prev-occurrence-button");
  if (previousOccurrenceButton && currentAulaContext) {
    clearFeedback();
    updateAulaOccurrenceSelection(Number(previousOccurrenceButton.dataset.line));

    return;
  }

  const nextOccurrenceButton = event.target.closest(".next-occurrence-button");
  if (nextOccurrenceButton && currentAulaContext) {
    clearFeedback();
    updateAulaOccurrenceSelection(Number(nextOccurrenceButton.dataset.line));

    return;
  }

  const paginationButton = event.target.closest(".pagination-button");
  if (paginationButton && !paginationButton.disabled && lastSearchPayload) {
    await performSearch(lastSearchPayload.query, Number(paginationButton.dataset.page));
  }
});

document.querySelectorAll(".example-query").forEach((button) => {
  button.addEventListener("click", async () => {
    searchInput.value = button.dataset.query || "";
    await performSearch(button.dataset.query || "");
  });
});

window.addEventListener("scroll", () => {
  updateReadingProgress();
});

results.addEventListener(
  "scroll",
  () => {
    updateReadingProgress();
  },
  true,
);

results.addEventListener("keydown", (event) => {
  const occurrenceInput = event.target.closest(".focus-occurrence-input");
  if (!occurrenceInput || event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  clearFeedback();
  if (!jumpToOccurrenceNumber(occurrenceInput.value)) {
    showFeedback("Digite um numero de ocorrencia valido.", "warn");
  }
});

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  const before = params.get("before");
  const after = params.get("after");
  const limit = params.get("limit");
  const page = params.get("page");
  const aula = params.get("aula");
  const line = params.get("line");
  const view = params.get("view");
  const flow = params.get("flow");

  if (before) searchBeforeInput.value = before;
  if (after) searchAfterInput.value = after;
  if (limit) searchLimitInput.value = limit;
  if (query) searchInput.value = query;
  if (view === "plain" || view === "book") {
    lessonViewMode = view;
  }
  if (flow === "horizontal" || flow === "vertical") {
    lessonFlowMode = flow;
  }

  await loadMeta();

  if (aula) {
    await loadAulaView(aula, query || "", line ? Number(line) : null);
    return;
  }

  if (query) {
    await performSearch(query, page ? Number(page) : 1);
    return;
  }

  renderWelcomeState();
}

bootstrap().catch((error) => showFeedback(error.message, "error"));
