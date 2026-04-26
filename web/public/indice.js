const filterForm = document.querySelector("#index-filter-form");
const filterInput = document.querySelector("#index-filter");
const showAllInput = document.querySelector("#index-show-all");
const resultsTitle = document.querySelector("#index-results-title");
const resultsSubtitle = document.querySelector("#index-results-subtitle");
const feedback = document.querySelector("#index-feedback");
const results = document.querySelector("#index-results");
const resultsSection = document.querySelector(".results-section");

const PAGE_SIZE = 24;
const INDEX_AUTO_FILTER_DELAY_MS = 900;

let allItems = [];
let currentPage = 1;
let filterDebounceTimer = null;

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function normalizeForSearch(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
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

function syncPageMode(showAll) {
  document.body.classList.toggle("show-all-mode", showAll);
  results.className = showAll ? "index-results index-results-all" : "index-results";
}

async function getJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Erro inesperado.");
  }

  return payload;
}

function getSummaryText(item) {
  return item.summary || "Resumo ainda pendente no indice.";
}

function getFilteredItems(items, filterValue = "") {
  const query = normalizeForSearch(filterValue.trim());

  if (!query) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [
      String(item.aula).padStart(3, "0"),
      String(item.aula),
      item.date || "",
      item.summary || "",
    ].join(" ");

    return normalizeForSearch(haystack).includes(query);
  });
}

function renderPagination(totalPages, page) {
  const pageButtons = [];
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, startPage + 4);

  for (let current = startPage; current <= endPage; current += 1) {
    const activeClass = current === page ? "pagination-button active" : "pagination-button";

    pageButtons.push(`
      <button class="${activeClass}" type="button" data-page="${current}">
        ${current}
      </button>
    `);
  }

  return `
    <nav class="pagination" aria-label="Paginacao do indice">
      <button
        class="secondary-button pagination-button"
        type="button"
        data-page="${page - 1}"
        ${page <= 1 ? "disabled" : ""}
      >
        Anterior
      </button>
      ${pageButtons.join("")}
      <button
        class="secondary-button pagination-button"
        type="button"
        data-page="${page + 1}"
        ${page >= totalPages ? "disabled" : ""}
      >
        Proxima
      </button>
    </nav>
  `;
}

function renderItems(items, filterValue = "", pageValue = 1, showAll = false) {
  const filteredItems = getFilteredItems(items, filterValue);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(pageValue, totalPages));
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageItems = showAll ? filteredItems : filteredItems.slice(startIndex, startIndex + PAGE_SIZE);

  currentPage = safePage;
  syncPageMode(showAll);
  updateUrl({
    f: filterValue.trim() || null,
    all: showAll ? "1" : null,
    p: !showAll && safePage > 1 ? safePage : null,
  });

  resultsTitle.textContent = filterValue.trim() ? `Indice filtrado por "${filterValue.trim()}"` : "Aulas do curso";
  resultsSubtitle.textContent = showAll
    ? `${filteredItems.length} aula(s) exibida(s) de ${items.length} em uma pagina.`
    : `${filteredItems.length} aula(s) exibida(s) de ${items.length}. Pagina ${safePage} de ${totalPages}.`;

  if (!pageItems.length) {
    results.innerHTML = `<div class="empty-state">Nenhuma aula encontrada para esse filtro.</div>`;
    return;
  }

  const paginationHtml = !showAll && totalPages > 1 ? renderPagination(totalPages, safePage) : "";

  const cardsHtml = pageItems
    .map((item) => {
      const sourceLabel =
        item.source === "exact"
          ? `<span class="summary-pill">Linha exata do indice</span>`
          : `<span class="summary-pill summary-pill-soft">Faixa estimada no indice</span>`;

      return `
        <article class="result-card index-result-card">
          <div class="result-head">
            <span class="result-badge">Aula ${String(item.aula).padStart(2, "0")}</span>
            <strong>${escapeHtml(item.date || "Data nao informada")}</strong>
          </div>
          <div class="result-summary">
            ${sourceLabel}
          </div>
          <p class="index-summary">${escapeHtml(getSummaryText(item))}</p>
          <div class="result-actions">
            <a class="button-link secondary-button" href="/?aula=${item.aula}">Ler aula completa</a>
          </div>
        </article>
      `;
    })
    .join("");

  results.innerHTML = `
    ${paginationHtml}
    ${cardsHtml}
    ${paginationHtml}
  `;
}

function scrollToFirstIndexResult() {
  const target = results.querySelector(".index-result-card, .empty-state") || resultsSection;

  if (!target) {
    return;
  }

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderCurrentState(pageOverride = currentPage, { scrollToResults = false } = {}) {
  renderItems(allItems, filterInput.value, pageOverride, showAllInput.checked);

  if (scrollToResults && filterInput.value.trim()) {
    scrollToFirstIndexResult();
  }
}

async function bootstrap() {
  clearFeedback();

  const params = new URLSearchParams(window.location.search);
  const initialFilter = params.get("f") || "";
  const initialPage = Number(params.get("p") || "1");
  const initialShowAll = params.get("all") === "1";
  filterInput.value = initialFilter;
  showAllInput.checked = initialShowAll;
  syncPageMode(initialShowAll);

  const payload = await getJson("/api/index");
  allItems = payload.items;

  renderItems(allItems, initialFilter, Number.isFinite(initialPage) ? initialPage : 1, initialShowAll);
}

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderCurrentState(1, { scrollToResults: true });
});

filterInput.addEventListener("input", () => {
  window.clearTimeout(filterDebounceTimer);
  filterDebounceTimer = window.setTimeout(() => {
    renderCurrentState(1, { scrollToResults: true });
  }, INDEX_AUTO_FILTER_DELAY_MS);
});

showAllInput.addEventListener("change", () => {
  renderCurrentState(1, { scrollToResults: true });
});

document.querySelectorAll(".index-example").forEach((button) => {
  button.addEventListener("click", () => {
    filterInput.value = button.dataset.filter || "";
    renderCurrentState(1, { scrollToResults: true });
  });
});

results.addEventListener("click", (event) => {
  const paginationButton = event.target.closest(".pagination-button");
  if (!paginationButton || paginationButton.disabled) {
    return;
  }

  const page = Number(paginationButton.dataset.page);
  if (!Number.isFinite(page)) {
    return;
  }

  renderCurrentState(page);
});

bootstrap().catch((error) => showFeedback(error.message, "error"));
