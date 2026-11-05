/* ==========================================
   KAWANSA - KAWAN ASESMEN NGLIPUR PUNAKAWAN
   Developed by Tim Segapetra
========================================== */

const DEFAULT_USER = {
  username: "guru",
  password: "kawansa123",
  name: "Guru Matematika"
};

const STORAGE_KEY = "kawansa_records_v4";
const SESSION_KEY = "kawansa_session";

let records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const GROUP_KEY = "kawansa_groups_v1";
let groups = JSON.parse(localStorage.getItem(GROUP_KEY) || "[]");
let currentDetailId = null;
const PRES_GROUP_KEY = "kawansa_pres_groups_v1";
let presGroups = JSON.parse(localStorage.getItem(PRES_GROUP_KEY) || "[]"); // kelompok khusus Kinerja Presentasi
let editingPresGroupId = null;
let presTarget = null; // { groupId, name }

/* DATA KOMPONEN PENILAIAN */

const profileDimensions = [
  "Penalaran Kritis",
  "Kreativitas",
  "Kolaborasi",
  "Kemandirian",
  "Kesehatan",
  "Komunikasi"
];

const creativeIndicators = [
  { key: "fluency", label: "Fluency (Kelancaran)" },
  { key: "flexibility", label: "Flexibility (Keluwesan)" },
  { key: "novelty", label: "Novelty (Kebaruan)" }
];

const presentationAspects = [
  "Penguasaan Materi",
  "Sistematika Presentasi",
  "Ketepatan Waktu dan Efektivitas Penyampaian",
  "Kemampuan Menjawab Pertanyaan"
];

/* UTILITAS */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function saveGroups() {
  localStorage.setItem(GROUP_KEY, JSON.stringify(groups));
}

function savePresGroups() {
  localStorage.setItem(PRES_GROUP_KEY, JSON.stringify(presGroups));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");

  setTimeout(() => {
    element.classList.remove("show");
  }, 2500);
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function normalizeScore(score, max) {
  if (score === null || score === undefined) return null;
  return Number(((score / max) * 100).toFixed(2));
}

function formatScore(value) {
  return value === null || value === undefined
    ? "-"
    : Number(value).toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
}

function escapeSelector(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

/* LOGIN */

function checkSession() {
  const session = localStorage.getItem(SESSION_KEY);

  if (session) {
    showApp();
  } else {
    $("#loginScreen").classList.remove("hidden");
    $("#appShell").classList.add("hidden");
  }
}

function showApp() {
  $("#loginScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  $("#teacherName").textContent = DEFAULT_USER.name;
  $("#todayLabel").textContent = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  renderDashboard();
  renderRecap();
}

$("#loginForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const username = $("#username").value.trim();
  const password = $("#password").value;

  if (
    username === DEFAULT_USER.username &&
    password === DEFAULT_USER.password
  ) {
    localStorage.setItem(SESSION_KEY, "active");
    $("#loginError").textContent = "";
    showApp();
    toast("Berhasil masuk ke KAWANSA.");
  } else {
    $("#loginError").textContent = "Username atau password tidak sesuai.";
  }
});

$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  $("#appShell").classList.add("hidden");
  $("#loginScreen").classList.remove("hidden");
  $("#password").value = "";
  $("#loginError").textContent = "";
});

/* NAVIGASI */

const pageTitles = {
  dashboardPage: "Dashboard",
  forLearningPage: "Asesmen for Learning",
  asLearningPage: "Asesmen as Learning",
  ofLearningPage: "Asesmen of Learning",
  recapPage: "Rekapitulasi Nilai"
};

function openPage(pageId) {
  $$(".page").forEach(page => page.classList.remove("active-page"));
  $$(".nav-link").forEach(link => link.classList.remove("active"));

  const target = document.getElementById(pageId);
  if (!target) return;

  target.classList.add("active-page");
  const nav = document.querySelector(`[data-page="${pageId}"]`);
  if (nav) nav.classList.add("active");

  $("#pageTitle").textContent = pageTitles[pageId] || "KAWANSA";
  $("#sidebar").classList.remove("show");
}

$$(".nav-link").forEach(button => {
  button.addEventListener("click", () => {
    openPage(button.dataset.page);
  });
});

$("#mobileMenu").addEventListener("click", () => {
  $("#sidebar").classList.toggle("show");
});

/* PEMBUATAN INPUT SKOR */

/* Skala skor: 0, 1, 2, 3, 4 (0 adalah nilai valid, bukan kosong) */
const SCORE_VALUES = [0, 1, 2, 3, 4];
const SCORE_OPTIONS_HTML =
  '<option value="">Pilih skor</option>' +
  SCORE_VALUES.map(v => `<option value="${v}">${v}</option>`).join("");

function createScoreOptions(name, label, className = "") {
  return `
    <div class="score-row">
      <strong>${escapeHTML(label)}</strong>
      <select name="${escapeHTML(name)}" class="${className}" required>
        ${SCORE_OPTIONS_HTML}
      </select>
    </div>
  `;
}

function buildProfileScores() {
  $("#profileScores").innerHTML = profileDimensions.map((dimension, index) => {
    return createScoreOptions(
      `profile${index + 1}`,
      dimension,
      "profile-score"
    );
  }).join("");
}

function buildCreativeScores() {
  let html = "";

  for (let question = 1; question <= 2; question++) {
    html += `
      <div class="question-card">
        <h4>Soal ${question}</h4>
        ${creativeIndicators.map(indicator => {
          const name = `q${question}_${indicator.key}`;
          return `
            <div class="score-item">
              <label>${indicator.label}</label>
              <select name="${name}" class="creative-score" required>
                ${SCORE_OPTIONS_HTML}
              </select>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  $("#creativeScores").innerHTML = html;
}

function buildPresentationScores() {
  $("#presentationScores").innerHTML = presentationAspects.map((aspect, index) => {
    return createScoreOptions(
      `presentation${index + 1}`,
      aspect,
      "presentation-score"
    );
  }).join("");
}

buildProfileScores();
buildCreativeScores();
buildPresentationScores();

/* HITUNG TOTAL OTOMATIS */

function calculateFormTotal(formSelector, scoreSelector, outputSelector, max) {
  const form = $(formSelector);
  if (!form) return;

  const values = [...form.querySelectorAll(scoreSelector)]
    .map(input => input.value === "" ? 0 : Number(input.value));

  const total = values.reduce((sum, value) => sum + value, 0);
  $(outputSelector).textContent = `${total} / ${max}`;
}

function updateAllTotals() {
  calculateFormTotal("#forForm", ".score-select", "#challengeTotal", 12);
  calculateFormTotal("#asForm", ".profile-score", "#profileTotal", 24);
  calculateFormTotal("#ofForm", ".creative-score", "#creativeTotal", 24);
  calculateFormTotal("#presForm", ".presentation-score", "#presentationTotal", 16);
}

document.addEventListener("change", event => {
  if (event.target.matches("select")) {
    updateAllTotals();
  }
});

/* VALIDASI DAN PENGAMBILAN DATA */

function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function findOrCreateRecord(name, className) {
  let record = records.find(item =>
    item.name.toLowerCase() === name.toLowerCase() &&
    item.className.toLowerCase() === className.toLowerCase()
  );

  if (!record) {
    record = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
      name,
      className,
      forLearning: null,
      asLearning: null,
      ofLearning: null
    };

    records.push(record);
  }

  return record;
}

function groupKey(members, className) {
  return className.toLowerCase() + "|" +
    members.map(n => n.toLowerCase()).sort().join("|");
}

function findOrCreateGroup(members, className) {
  const key = groupKey(members, className);
  let group = groups.find(item => groupKey(item.members, item.className) === key);

  if (!group) {
    group = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      className,
      members
    };
    groups.push(group);
  }

  saveGroups();
  return group;
}

function getScores(data, names) {
  return names.map(name => Number(data[name]));
}

function calculateTotal(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

/* SIMPAN ASESMEN FOR LEARNING */

$("#forForm").addEventListener("submit", event => {
  event.preventDefault();

  const form = event.target;
  const data = getFormData(form);

  const activities = getScores(data, [
    "activity1",
    "activity2",
    "activity3"
  ]);

  const total = calculateTotal(activities);

  /* Anggota kelompok: minimal 1, maksimal 5, tanpa nama ganda */
  const members = [1, 2, 3, 4, 5]
    .map(i => (data[`member${i}`] || "").trim().replace(/\s+/g, " "))
    .filter(Boolean);
  const memberError = $("#memberError");

  if (!members.length) {
    memberError.textContent = "Isi minimal 1 nama anggota kelompok.";
    form.querySelector('[name="member1"]').focus();
    return;
  }

  if (new Set(members.map(n => n.toLowerCase())).size !== members.length) {
    memberError.textContent = "Terdapat nama anggota yang sama. Gunakan nama yang berbeda.";
    return;
  }

  memberError.textContent = "";
  const className = data.className.trim();
  const group = findOrCreateGroup(members, className);

  members.forEach(name => {
    const record = findOrCreateRecord(name, className);
    record.groupId = group.id;
    record.forLearning = {
      date: data.date,
      activities: [...activities],
      total,
      max: 12,
      finalScore: normalizeScore(total, 12),
      notes: data.notes || ""
    };
  });

  saveRecords();
  renderGroupUI();
  renderDashboard();
  renderRecap();
  form.reset();
  form.querySelector('[name="date"]').value = today();
  $("#challengeTotal").textContent = "0 / 12";
  toast(`Penilaian The Challenge disimpan untuk ${members.length} anggota kelompok.`);
});

/* SIMPAN ASESMEN AS LEARNING */

$("#asForm").addEventListener("submit", event => {
  event.preventDefault();

  const form = event.target;
  const data = getFormData(form);

  const profiles = profileDimensions.map((dimension, index) => ({
    name: dimension,
    score: Number(data[`profile${index + 1}`])
  }));

  const total = profiles.reduce((sum, item) => sum + item.score, 0);

  const record = findOrCreateRecord(data.name.trim(), data.className.trim());

  record.asLearning = {
    date: data.date,
    profiles,
    total,
    max: 24,
    finalScore: normalizeScore(total, 24),
    notes: data.notes || ""
  };

  saveRecords();
  renderDashboard();
  renderRecap();
  form.reset();
  $("#profileTotal").textContent = "0 / 24";
  toast("Penilaian Profil Lulusan berhasil disimpan.");
});

/* SIMPAN ASESMEN OF LEARNING */

$("#ofForm").addEventListener("submit", event => {
  event.preventDefault();

  const form = event.target;
  const data = getFormData(form);

  const questions = [];

  for (let q = 1; q <= 2; q++) {
    const indicators = creativeIndicators.map(indicator => ({
      name: indicator.label,
      key: indicator.key,
      score: Number(data[`q${q}_${indicator.key}`])
    }));

    questions.push({
      question: `Soal ${q}`,
      indicators,
      total: indicators.reduce((sum, item) => sum + item.score, 0)
    });
  }

  const creativeTotal = questions.reduce((sum, item) => sum + item.total, 0);

  const record = findOrCreateRecord(data.name.trim(), data.className.trim());

  record.ofLearning = {
    ...(record.ofLearning || {}), // mempertahankan data presentasi lama (jika ada)
    date: data.date,
    questions,
    creativeTotal,
    creativeMax: 24,
    creativeFinalScore: normalizeScore(creativeTotal, 24),
    notes: data.notes || ""
  };

  saveRecords();
  renderDashboard();
  renderRecap();
  form.reset();
  updateAllTotals();
  toast("Penilaian Uji Kompetensi berhasil disimpan.");
});

/* TALLY FORM */

function setupTallyLink(inputId, saveId, openId, storageKey) {
  const input = document.getElementById(inputId);
  const saveButton = document.getElementById(saveId);
  const openButton = document.getElementById(openId);

  input.value = localStorage.getItem(storageKey) || "";

  saveButton.addEventListener("click", () => {
    const url = input.value.trim();

    if (url && !/^https?:\/\//i.test(url)) {
      toast("Masukkan tautan yang diawali http:// atau https://");
      return;
    }

    localStorage.setItem(storageKey, url);
    toast("Tautan berhasil disimpan.");
  });

  openButton.addEventListener("click", () => {
    const url = localStorage.getItem(storageKey) || input.value.trim();

    if (!url) {
      toast("Masukkan dan simpan tautan terlebih dahulu.");
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      toast("Tautan tidak valid.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  });
}

setupTallyLink(
  "guidingUrl",
  "saveGuidingUrl",
  "openGuiding",
  "kawansa_guiding_url"
);

setupTallyLink(
  "reflectionUrl",
  "saveReflectionUrl",
  "openReflection",
  "kawansa_reflection_url"
);

/* DASHBOARD */

function getAssessmentValues(record) {
  return {
    challenge: record.forLearning?.finalScore ?? null,
    profile: record.asLearning?.finalScore ?? null,
    creative: record.ofLearning?.creativeFinalScore ?? null,
    presentation: record.presentation?.finalScore ?? record.ofLearning?.presentationFinalScore ?? null
  };
}

function renderDashboard() {
  $("#statStudents").textContent = records.length;
  $("#statFor").textContent = records.filter(r => r.forLearning).length;
  $("#statAs").textContent = records.filter(r => r.asLearning).length;
  $("#statOf").textContent = records.filter(r => r.ofLearning).length;

  const cards = [
    { title: "The Challenge", key: "challenge", description: "Asesmen for Learning" },
    { title: "Dimensi Profil Lulusan", key: "profile", description: "Asesmen as Learning" },
    { title: "Uji Kompetensi", key: "creative", description: "Asesmen of Learning" },
    { title: "Kinerja Presentasi", key: "presentation", description: "Asesmen of Learning" }
  ];

  if (!records.length) {
    $("#finalOutputCards").innerHTML =
      `<div class="empty-card">Belum ada data asesmen yang tersimpan.</div>`;
    return;
  }

  $("#finalOutputCards").innerHTML = cards.map(card => {
    const available = records
      .map(record => getAssessmentValues(record)[card.key])
      .filter(value => value !== null);

    const average = available.length
      ? available.reduce((sum, value) => sum + value, 0) / available.length
      : null;

    return `
      <div class="output-card">
        <p>${card.description}</p>
        <h3>${average === null ? "-" : formatScore(average)}</h3>
        <small>${card.title} · Rata-rata dari ${available.length} murid yang sudah dinilai</small>
      </div>
    `;
  }).join("");
}

/* REKAPITULASI */

function renderRecap() {
  const keyword = ($("#searchRecord")?.value || "").toLowerCase();

  const filtered = records.filter(record =>
    record.name.toLowerCase().includes(keyword) ||
    record.className.toLowerCase().includes(keyword)
  );

  $("#recapBody").innerHTML = filtered.map((record, index) => {
    const values = getAssessmentValues(record);

    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHTML(record.name)}</strong></td>
        <td>${escapeHTML(record.className)}</td>
        <td>${formatScore(values.challenge)}</td>
        <td>${formatScore(values.profile)}</td>
        <td>${formatScore(values.creative)}</td>
        <td>${formatScore(values.presentation)}</td>
        <td>
          <button class="table-action" data-detail="${record.id}">Detail</button>
          <button class="table-action delete" data-delete="${record.id}">Hapus</button>
        </td>
      </tr>
    `;
  }).join("");

  $("#emptyState").style.display = filtered.length ? "none" : "block";
}

$("#searchRecord").addEventListener("input", renderRecap);

/* DETAIL DATA */

function addDetailSection(title, rows) {
  return `
    <div class="detail-section">
      <h3>${escapeHTML(title)}</h3>
      ${rows.map(row => `
        <div class="detail-row">
          <span>${escapeHTML(row.label)}</span>
          <strong>${escapeHTML(row.value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function showDetail(id) {
  const record = records.find(item => item.id === id);
  if (!record) return;

  currentDetailId = id;

  let html = `
    <div class="detail-section">
      <div class="detail-row"><span>Nama Murid</span><strong>${escapeHTML(record.name)}</strong></div>
      <div class="detail-row"><span>Kelas</span><strong>${escapeHTML(record.className)}</strong></div>
      ${(() => {
        const g = groups.find(x => x.id === record.groupId);
        return g ? `<div class="detail-row"><span>Kelompok (The Challenge)</span><strong>${escapeHTML(g.members.join(", "))}</strong></div>` : "";
      })()}
      ${(() => {
        const g = presGroups.find(x => x.id === record.presGroupId);
        return g ? `<div class="detail-row"><span>Kelompok (Presentasi)</span><strong>${escapeHTML(g.name + " — " + g.members.join(", "))}</strong></div>` : "";
      })()}
    </div>
  `;

  if (record.forLearning) {
    const item = record.forLearning;
    html += addDetailSection("1. The Challenge", [
      ...item.activities.map((score, index) => ({
        label: `Aktivitas ${index + 1}`,
        value: `${score} / 4`
      })),
      { label: "Total Skor", value: `${item.total} / 12` },
      { label: "Nilai Akhir Challenge", value: formatScore(item.finalScore) }
    ]);
  } else {
    html += addDetailSection("1. The Challenge", [
      { label: "Status", value: "Belum dinilai" }
    ]);
  }

  if (record.asLearning) {
    const item = record.asLearning;
    html += addDetailSection("2. Dimensi Profil Lulusan", [
      ...item.profiles.map(profile => ({
        label: profile.name,
        value: `${profile.score} / 4`
      })),
      { label: "Total Skor", value: `${item.total} / 24` },
      { label: "Nilai Akhir Profil Lulusan", value: formatScore(item.finalScore) }
    ]);
  } else {
    html += addDetailSection("2. Dimensi Profil Lulusan", [
      { label: "Status", value: "Belum dinilai" }
    ]);
  }

  if (record.ofLearning) {
    const item = record.ofLearning;

    html += addDetailSection("3. Uji Kompetensi", [
      ...item.questions.flatMap(question =>
        question.indicators.map(indicator => ({
          label: `${question.question} - ${indicator.name}`,
          value: `${indicator.score} / 4`
        }))
      ),
      { label: "Total Skor", value: `${item.creativeTotal} / 24` },
      { label: "Nilai Akhir Uji Kompetensi", value: formatScore(item.creativeFinalScore) }
    ]);

  } else {
    html += addDetailSection("3. Uji Kompetensi", [
      { label: "Status", value: "Belum dinilai" }
    ]);
  }

  const pres = record.presentation || (record.ofLearning?.presentation
    ? {
        aspects: record.ofLearning.presentation,
        total: record.ofLearning.presentationTotal,
        finalScore: record.ofLearning.presentationFinalScore
      }
    : null);

  if (pres) {
    html += addDetailSection("4. Kinerja Presentasi", [
      ...(pres.aspects || pres.presentation).map(aspect => ({
        label: aspect.name,
        value: `${aspect.score} / 4`
      })),
      { label: "Total Skor", value: `${pres.total} / 16` },
      { label: "Nilai Akhir Presentasi", value: formatScore(pres.finalScore) }
    ]);
  } else {
    html += addDetailSection("4. Kinerja Presentasi", [
      { label: "Status", value: "Belum dinilai" }
    ]);
  }

  $("#detailTitle").textContent = `Hasil Asesmen - ${record.name}`;
  $("#detailContent").innerHTML = html;
  $("#detailModal").classList.remove("hidden");
}

$("#recapBody").addEventListener("click", event => {
  const detailButton = event.target.closest("[data-detail]");
  const deleteButton = event.target.closest("[data-delete]");

  if (detailButton) {
    showDetail(detailButton.dataset.detail);
  }

  if (deleteButton) {
    const id = deleteButton.dataset.delete;

    if (confirm("Hapus seluruh data asesmen murid ini?")) {
      records = records.filter(item => item.id !== id);
      saveRecords();
      renderDashboard();
      renderRecap();
      toast("Data berhasil dihapus.");
    }
  }
});

/* CETAK DETAIL */

$("#printDetail").addEventListener("click", () => {
  window.print();
});

/* MODAL PEDOMAN SKOR */

const rubrics = {
  challengeRubric: {
    title: "Pedoman Skor The Challenge",
    rows: [
      ["4", "Sangat baik"],
      ["3", "Baik"],
      ["2", "Cukup baik"],
      ["1", "Perlu bimbingan"]
    ],
    note: "Sesuaikan deskripsi setiap tingkat skor dengan rubrik The Challenge pada perangkat asesmen yang digunakan."
  },

  profileRubric: {
    title: "Pedoman Skor Profil Lulusan",
    rows: [
      ["4", "Menunjukkan dimensi secara sangat baik dan konsisten."],
      ["3", "Menunjukkan dimensi secara baik."],
      ["2", "Menunjukkan dimensi secara cukup baik dan masih memerlukan penguatan."],
      ["1", "Menunjukkan dimensi secara terbatas dan memerlukan bimbingan."]
    ],
    note: "Gunakan indikator perilaku setiap dimensi dalam lembar penilaian sebagai dasar pemberian skor."
  },

  creativeRubric: {
    title: "Pedoman Skor Kemampuan Berpikir Kreatif",
    rows: [
      ["4", "Kriteria tertinggi sesuai indikator dan rubrik soal."],
      ["3", "Kriteria baik sesuai indikator dan rubrik soal."],
      ["2", "Kriteria cukup sesuai indikator dan rubrik soal."],
      ["1", "Kriteria terendah untuk jawaban yang masih menunjukkan upaya."],
      ["0", "Tidak memberikan jawaban."]
    ],
    note: "Deskripsi skor fluency, flexibility, dan novelty perlu mengikuti rubrik penskoran masing-masing soal yang telah ditetapkan peneliti."
  },

  presentationRubric: {
    title: "Pedoman Skor Kinerja Presentasi",
    rows: [
      ["4", "Sangat Baik"],
      ["3", "Baik"],
      ["2", "Cukup Baik"],
      ["1", "Kurang Baik"]
    ],
    note: "Aspek penilaian meliputi penguasaan materi, sistematika presentasi, ketepatan waktu dan efektivitas penyampaian, serta kemampuan menjawab pertanyaan."
  }
};

$$("[data-modal]").forEach(button => {
  button.addEventListener("click", () => {
    const rubric = rubrics[button.dataset.modal];
    if (!rubric) return;

    $("#rubricTitle").textContent = rubric.title;

    $("#rubricContent").innerHTML = `
      <table class="rubric-table">
        <thead><tr><th>Skor</th><th>Deskripsi</th></tr></thead>
        <tbody>
          ${rubric.rows.map(row => `
            <tr><td><strong>${escapeHTML(row[0])}</strong></td>
            <td>${escapeHTML(row[1])}</td></tr>
          `).join("")}
        </tbody>
      </table>
      <p style="margin-top:15px;font-size:12px;line-height:1.7;color:#8390a3;">
        ${escapeHTML(rubric.note)}
      </p>
    `;

    $("#rubricModal").classList.remove("hidden");
  });
});

/* TUTUP MODAL */

$$("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.close).classList.add("hidden");
  });
});

$$(".modal").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) {
      modal.classList.add("hidden");
    }
  });
});

/* EKSPOR CSV */

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

$("#exportCsv").addEventListener("click", () => {
  if (!records.length) {
    toast("Belum ada data untuk diunduh.");
    return;
  }

  const header = [
    "Nama Murid",
    "Kelas",
    "Tanggal Challenge",
    "Skor Challenge",
    "Nilai Akhir Challenge",
    "Tanggal Profil Lulusan",
    "Skor Profil Lulusan",
    "Nilai Akhir Profil Lulusan",
    "Tanggal Uji Kompetensi",
    "Skor Uji Kompetensi",
    "Nilai Akhir Uji Kompetensi",
    "Skor Presentasi",
    "Nilai Akhir Presentasi",
    "Kelompok",
    "Kelompok Presentasi"
  ];

  const rows = records.map(record => [
    record.name,
    record.className,
    record.forLearning?.date || "",
    record.forLearning?.total ?? "",
    record.forLearning?.finalScore ?? "",
    record.asLearning?.date || "",
    record.asLearning?.total ?? "",
    record.asLearning?.finalScore ?? "",
    record.ofLearning?.date || "",
    record.ofLearning?.creativeTotal ?? "",
    record.ofLearning?.creativeFinalScore ?? "",
    record.presentation?.total ?? record.ofLearning?.presentationTotal ?? "",
    record.presentation?.finalScore ?? record.ofLearning?.presentationFinalScore ?? "",
    (groups.find(g => g.id === record.groupId)?.members || []).join(", "),
    (() => {
      const g = presGroups.find(x => x.id === record.presGroupId);
      return g ? `${g.name}: ${g.members.join(", ")}` : "";
    })()
  ]);

  const csv = [header, ...rows]
    .map(row => row.map(csvCell).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  downloadBlob(blob, "Rekap_Nilai_KAWANSA.csv");
});

/* EKSPOR JSON */

$("#exportJson").addEventListener("click", () => {
  if (!records.length) {
    toast("Belum ada data untuk diunduh.");
    return;
  }

  const blob = new Blob(
    [JSON.stringify({ records, groups, presGroups }, null, 2)],
    { type: "application/json" }
  );

  downloadBlob(blob, "Backup_Data_KAWANSA.json");
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
  toast("File berhasil diunduh.");
}

/* KELOMPOK & KINERJA PRESENTASI (INPUT MANDIRI, DINILAI PER INDIVIDU) */

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function findMemberRecord(group, name) {
  return records.find(r =>
    r.name.toLowerCase() === name.toLowerCase() &&
    r.className.toLowerCase() === group.className.toLowerCase()
  );
}

function groupLabel(group) {
  return `${group.name} — Kelas ${group.className} (${group.members.length} anggota)`;
}

function resetPresGroupForm() {
  const form = $("#presGroupForm");
  form.reset();
  editingPresGroupId = null;
  $("#presGroupError").textContent = "";
  $("#presGroupFormTitle").textContent = "1. Data Kelompok";
  $("#presGroupSubmit").textContent = "Simpan Kelompok";
  $("#presGroupCancel").classList.add("hidden");
}

function renderGroupUI() {
  /* daftar nama untuk input individu */
  const names = [...new Set(records.map(r => r.name))];
  $("#studentList").innerHTML = names.map(n => `<option value="${escapeHTML(n)}">`).join("");

  /* pilihan kelompok presentasi */
  const select = $("#presGroup");
  const current = select.value;
  select.innerHTML = '<option value="">Pilih kelompok</option>' +
    presGroups.map(g => `<option value="${escapeHTML(g.id)}">${escapeHTML(groupLabel(g))}</option>`).join("");
  select.value = presGroups.some(g => g.id === current) ? current : "";
  $("#presEmpty").style.display = presGroups.length ? "none" : "block";
  renderPresMembers();
}

function renderPresMembers() {
  const group = presGroups.find(g => g.id === $("#presGroup").value);
  const box = $("#presMembers");

  $("#presGroupActions").classList.toggle("hidden", !group);

  if (!group) {
    box.classList.add("hidden");
    $("#presForm").classList.add("hidden");
    presTarget = null;
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML = `<p class="member-list-title">Anggota kelompok — pilih satu nama untuk dinilai</p>` +
    group.members.map(name => {
      const rec = findMemberRecord(group, name);
      const done = rec?.presentation;
      const active = presTarget && presTarget.groupId === group.id && presTarget.name === name;
      return `
        <button type="button" class="member-chip${done ? " done" : ""}${active ? " selected" : ""}" data-member="${escapeHTML(name)}">
          <span class="member-name">${escapeHTML(name)}</span>
          <small>${done ? "Nilai: " + formatScore(done.finalScore) : "Belum dinilai"}</small>
        </button>`;
    }).join("");
}

/* simpan / perbarui kelompok presentasi */
$("#presGroupForm").addEventListener("submit", event => {
  event.preventDefault();

  const data = getFormData(event.target);
  const error = $("#presGroupError");
  const groupName = (data.groupName || "").trim().replace(/\s+/g, " ");
  const className = (data.className || "").trim().replace(/\s+/g, " ");
  const members = [1, 2, 3, 4, 5]
    .map(i => (data[`member${i}`] || "").trim().replace(/\s+/g, " "))
    .filter(Boolean);

  if (!groupName) {
    error.textContent = "Isi nama atau identitas kelompok.";
    event.target.querySelector('[name="groupName"]').focus();
    return;
  }

  if (!className) {
    error.textContent = "Isi kelas agar nilai terhubung dengan data murid di rekapitulasi.";
    event.target.querySelector('[name="className"]').focus();
    return;
  }

  if (!members.length) {
    error.textContent = "Isi minimal 1 nama anggota kelompok.";
    event.target.querySelector('[name="member1"]').focus();
    return;
  }

  if (new Set(members.map(n => n.toLowerCase())).size !== members.length) {
    error.textContent = "Terdapat nama anggota yang sama. Gunakan nama yang berbeda.";
    return;
  }

  const duplicate = presGroups.some(g =>
    g.id !== editingPresGroupId &&
    g.name.toLowerCase() === groupName.toLowerCase() &&
    g.className.toLowerCase() === className.toLowerCase()
  );

  if (duplicate) {
    error.textContent = "Nama kelompok ini sudah ada pada kelas yang sama. Gunakan nama lain atau pilih kelompok yang tersimpan.";
    return;
  }

  let group = presGroups.find(g => g.id === editingPresGroupId);
  const wasEditing = Boolean(group);

  if (group) {
    group.name = groupName;
    group.className = className;
    group.members = members;
  } else {
    group = { id: newId(), name: groupName, className, members };
    presGroups.push(group);
  }

  savePresGroups();
  resetPresGroupForm();
  presTarget = null;
  $("#presForm").classList.add("hidden");
  renderGroupUI();
  $("#presGroup").value = group.id;
  renderPresMembers();
  toast(wasEditing
    ? `Kelompok ${groupName} berhasil diperbarui.`
    : `Kelompok ${groupName} berhasil disimpan. Pilih anggota yang akan dinilai.`);
  $("#presMembers").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

$("#presGroupCancel").addEventListener("click", resetPresGroupForm);

$("#presGroupEdit").addEventListener("click", () => {
  const group = presGroups.find(g => g.id === $("#presGroup").value);
  if (!group) return;

  const form = $("#presGroupForm");
  form.reset();
  editingPresGroupId = group.id;
  form.querySelector('[name="groupName"]').value = group.name;
  form.querySelector('[name="className"]').value = group.className;
  [1, 2, 3, 4, 5].forEach(i => {
    form.querySelector(`[name="member${i}"]`).value = group.members[i - 1] || "";
  });
  $("#presGroupError").textContent = "";
  $("#presGroupFormTitle").textContent = "1. Ubah Data Kelompok";
  $("#presGroupSubmit").textContent = "Perbarui Kelompok";
  $("#presGroupCancel").classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#presGroupDelete").addEventListener("click", () => {
  const group = presGroups.find(g => g.id === $("#presGroup").value);
  if (!group) return;

  if (!confirm(`Hapus kelompok "${group.name}"? Nilai presentasi yang sudah tersimpan pada anggota tidak ikut terhapus.`)) return;

  presGroups = presGroups.filter(g => g.id !== group.id);
  savePresGroups();
  if (editingPresGroupId === group.id) resetPresGroupForm();
  presTarget = null;
  $("#presForm").classList.add("hidden");
  renderGroupUI();
  toast("Kelompok berhasil dihapus.");
});

$("#presGroup").addEventListener("change", () => {
  presTarget = null;
  $("#presForm").classList.add("hidden");
  renderPresMembers();
});

$("#presMembers").addEventListener("click", event => {
  const chip = event.target.closest("[data-member]");
  if (!chip) return;

  const group = presGroups.find(g => g.id === $("#presGroup").value);
  if (!group) return;

  presTarget = { groupId: group.id, name: chip.dataset.member };
  const form = $("#presForm");
  form.reset();
  form.querySelector('[name="date"]').value = today();

  /* tampilkan nilai tersimpan jika individu ini sudah dinilai */
  const saved = findMemberRecord(group, presTarget.name)?.presentation;
  if (saved) {
    saved.aspects.forEach((aspect, index) => {
      form.querySelector(`[name="presentation${index + 1}"]`).value = String(aspect.score);
    });
    form.querySelector('[name="notes"]').value = saved.notes || "";
    form.querySelector('[name="date"]').value = saved.date || today();
  }

  $("#presTarget").textContent = presTarget.name;
  $("#presClass").textContent = `· Kelompok ${group.name} · Kelas ${group.className}`;
  form.classList.remove("hidden");
  updateAllTotals();
  renderPresMembers();
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

$("#presForm").addEventListener("submit", event => {
  event.preventDefault();

  const group = presGroups.find(g => g.id === (presTarget && presTarget.groupId));
  if (!group || !presTarget) {
    toast("Pilih anggota kelompok yang akan dinilai.");
    return;
  }

  const data = getFormData(event.target);
  const aspects = presentationAspects.map((aspect, index) => ({
    name: aspect,
    score: Number(data[`presentation${index + 1}`])
  }));
  const total = aspects.reduce((sum, item) => sum + item.score, 0);

  const record = findOrCreateRecord(presTarget.name, group.className);
  record.presGroupId = group.id;
  record.presentation = {
    date: data.date,
    groupId: group.id,
    groupName: group.name,
    aspects,
    total,
    max: 16,
    finalScore: normalizeScore(total, 16),
    notes: data.notes || ""
  };

  const savedName = presTarget.name;
  saveRecords();
  renderGroupUI();
  renderDashboard();
  renderRecap();
  toast(`Nilai presentasi ${savedName} berhasil disimpan.`);
  event.target.classList.add("hidden");
  presTarget = null;
  renderPresMembers();
});

/* INISIALISASI */

document.querySelectorAll('input[type="date"]').forEach(input => {
  input.value = today();
});

$("#searchRecord").value = "";

updateAllTotals();
renderGroupUI();
checkSession();