const state = {
  rows: [],
  loaded: false,
};

const elements = {
  form: document.querySelector("#searchForm"),
  input: document.querySelector("#regnrInput"),
  clear: document.querySelector("#clearButton"),
  status: document.querySelector("#statusMessage"),
  results: document.querySelector("#results"),
  summary: document.querySelector("#summary"),
  sectionTemplate: document.querySelector("#sectionTemplate"),
  summaryTemplate: document.querySelector("#summaryCardTemplate"),
};

const relationConfig = [
  { key: "dog", label: "Hund", tone: "dog" },
  { key: "offspring", label: "Avkomma", tone: "offspring" },
  { key: "siblings", label: "Hunds syskon", tone: "siblings" },
  { key: "father", label: "Fader", tone: "parent" },
  { key: "mother", label: "Moder", tone: "parent" },
  { key: "fatherSiblings", label: "Faders syskon", tone: "extended" },
  { key: "motherSiblings", label: "Moders syskon", tone: "extended" },
];

function normalizeRegnr(value) {
  return (value || "").toString().trim().toUpperCase();
}

function sameDog(row, regnr) {
  return normalizeRegnr(row.regnr) === normalizeRegnr(regnr);
}

function rowsByRegnr(regnr) {
  return state.rows.filter((row) => sameDog(row, regnr));
}

function uniqueByKey(rows, getKey) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = getKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectDogIdentity(regnr) {
  const ownRows = rowsByRegnr(regnr);
  if (!ownRows.length) return null;

  const firstNamed = ownRows.find((row) => row.hundens_namn) || ownRows[0];
  return {
    regnr: normalizeRegnr(regnr),
    hundens_namn: firstNamed.hundens_namn || "Okänd hund",
    fodd: firstNamed.fodd || "Okänt",
    kullnr: firstNamed.kullnr || "",
    fader_regnr: firstNamed.fader_regnr || "",
    faders_namn: firstNamed.faders_namn || "",
    mor_regnr: firstNamed.mor_regnr || "",
    mor_namn: firstNamed.mor_namn || "",
  };
}

function dedupeRows(rows, relationLabel) {
  return uniqueByKey(
    rows.map((row) => ({ ...row, relation: relationLabel })),
    (row) =>
      [
        row.regnr,
        row.hundens_namn,
        row.sjukdom,
        row.omrade,
        row.fader_regnr,
        row.mor_regnr,
        relationLabel,
      ].join("|"),
  );
}

function buildSections(regnr) {
  const dog = collectDogIdentity(regnr);
  if (!dog) return null;

  const dogRows = dedupeRows(rowsByRegnr(regnr), "Hund");

  const siblingsRows = dog.kullnr
    ? dedupeRows(
        state.rows.filter(
          (row) => row.kullnr && row.kullnr === dog.kullnr && !sameDog(row, dog.regnr),
        ),
        "Hunds syskon",
      )
    : [];

  const offspringRows = dedupeRows(
    state.rows.filter(
      (row) =>
        normalizeRegnr(row.fader_regnr) === dog.regnr || normalizeRegnr(row.mor_regnr) === dog.regnr,
    ),
    "Avkomma",
  );

  const fatherRows = dog.fader_regnr ? dedupeRows(rowsByRegnr(dog.fader_regnr), "Fader") : [];
  const motherRows = dog.mor_regnr ? dedupeRows(rowsByRegnr(dog.mor_regnr), "Moder") : [];

  const fatherIdentity = dog.fader_regnr ? collectDogIdentity(dog.fader_regnr) : null;
  const motherIdentity = dog.mor_regnr ? collectDogIdentity(dog.mor_regnr) : null;

  const fatherSiblingRows =
    fatherIdentity && fatherIdentity.kullnr
      ? dedupeRows(
          state.rows.filter(
            (row) =>
              row.kullnr &&
              row.kullnr === fatherIdentity.kullnr &&
              !sameDog(row, fatherIdentity.regnr),
          ),
          "Faders syskon",
        )
      : [];

  const motherSiblingRows =
    motherIdentity && motherIdentity.kullnr
      ? dedupeRows(
          state.rows.filter(
            (row) =>
              row.kullnr &&
              row.kullnr === motherIdentity.kullnr &&
              !sameDog(row, motherIdentity.regnr),
          ),
          "Moders syskon",
        )
      : [];

  return {
    dog,
    sections: {
      dog: dogRows,
      offspring: offspringRows,
      siblings: siblingsRows,
      father: fatherRows,
      mother: motherRows,
      fatherSiblings: fatherSiblingRows,
      motherSiblings: motherSiblingRows,
    },
  };
}

function formatCount(rows) {
  return `${rows.length} rad${rows.length === 1 ? "" : "er"}`;
}

function setStatus(message, isWarning = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("status-warning", isWarning);
}

function renderSummary(dog, sections) {
  elements.summary.innerHTML = "";

  const cards = [
    ["Hund", `${dog.hundens_namn} (${dog.regnr})`],
    ["Född", dog.fodd || "Okänt"],
    ["Kullnummer", dog.kullnr || "Saknas"],
    ["Fader", dog.faders_namn || dog.fader_regnr || "Saknas"],
    ["Moder", dog.mor_namn || dog.mor_regnr || "Saknas"],
    [
      "Totala träffar",
      Object.values(sections).reduce((sum, rows) => sum + rows.length, 0).toString(),
    ],
  ];

  for (const [label, value] of cards) {
    const node = elements.summaryTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".summary-label").textContent = label;
    node.querySelector(".summary-value").textContent = value;
    elements.summary.appendChild(node);
  }

  elements.summary.hidden = false;
}

function renderSection(config, rows) {
  const node = elements.sectionTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.tone = config.tone;
  node.querySelector(".section-kicker").textContent = "Relation";
  node.querySelector(".section-title").textContent = config.label;
  node.querySelector(".section-count").textContent = formatCount(rows);

  const tbody = node.querySelector("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    [
      row.sjukdom || " ",
      row.omrade || " ",
      row.relation,
      row.hundens_namn || row.regnr || " ",
      row.faders_namn || " ",
      row.mor_namn || " ",
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  return node;
}

function renderResults(model) {
  const { dog, sections } = model;
  elements.results.innerHTML = "";

  relationConfig.forEach((config) => {
    const rows = sections[config.key];
    if (!rows.length) return;
    elements.results.appendChild(renderSection(config, rows));
  });

  renderSummary(dog, sections);
  elements.results.hidden = false;
}

function clearResults() {
  elements.results.innerHTML = "";
  elements.summary.innerHTML = "";
  elements.results.hidden = true;
  elements.summary.hidden = true;
}

async function loadData() {
  try {
    const response = await fetch("./data/hundar.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.rows = payload.rows || [];
    state.loaded = true;
    setStatus("Registerdata laddad. Sök på ett registreringsnummer.");
  } catch (error) {
    console.error(error);
    setStatus(
      "Kunde inte läsa datafilen. Kör gärna ett lokalt webbserverkommando i mappen för att ladda JSON korrekt.",
      true,
    );
  }
}

function handleSearch(event) {
  event.preventDefault();
  if (!state.loaded) {
    setStatus("Data laddas fortfarande in.", true);
    return;
  }

  const regnr = normalizeRegnr(elements.input.value);
  if (!regnr) {
    clearResults();
    setStatus("Ange ett registreringsnummer först.", true);
    return;
  }

  const model = buildSections(regnr);
  if (!model) {
    clearResults();
    setStatus(`Ingen hund hittades för ${regnr}.`, true);
    return;
  }

  renderResults(model);
  const count = Object.values(model.sections).reduce((sum, rows) => sum + rows.length, 0);
  setStatus(`Visar ${count} träffar för ${model.dog.hundens_namn} (${model.dog.regnr}).`);
}

function handleClear() {
  elements.input.value = "";
  clearResults();
  setStatus("Sökningen är rensad. Ange ett nytt registreringsnummer.");
  elements.input.focus();
}

elements.form.addEventListener("submit", handleSearch);
elements.clear.addEventListener("click", handleClear);

loadData();
