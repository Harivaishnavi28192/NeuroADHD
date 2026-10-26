/* =========================================================
   NeuroADHD: Interactive Dashboard & Client-Side Inference
   Data source: assets/js/data.js (window.NEURO_DATA)
   ========================================================= */

(function () {
  "use strict";

  const D = window.NEURO_DATA || {};
  const SETS = { A: "A_demographic_cognitive", B: "B_with_symptom_ratings" };
  const C = {
    blue: "#2563eb",
    blueLight: "#60a5fa",
    cyan: "#06b6d4",
    orange: "#f97316",
    coral: "#ef4444",
    green: "#10b981",
    muted: "#9ca3af",
    grid: "rgba(0, 0, 0, 0.06)",
    ink2: "#4b5563",
    ink: "#0d1117"
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Rounding helper
  const fmt = (v, d = 3) =>
    (v === null || v === undefined || Number.isNaN(Number(v)))
      ? "–"
      : Number(Math.round(Number(v + "e" + d)) + "e-" + d).toFixed(d);

  const pct = (v, d = 0) =>
    (v === null || v === undefined) ? "–" : fmt(v * 100, d) + "%";

  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* =========================================================
     1. Data Bindings
     ========================================================= */
  function lookup(path) {
    const [root, ...rest] = path.split(".");
    const MRd = D.model_results || {};
    let obj = { eda: D.eda_summary, test: MRd.test, subtype: MRd.subtype, fmri: D.fmri_results }[root];
    for (let k of rest) {
      if (obj == null) return undefined;
      if (root === "test" && SETS[k]) k = SETS[k];
      obj = obj[k];
    }
    return obj;
  }

  $$("[data-bind]").forEach((el) => {
    const v = lookup(el.dataset.bind);
    if (v !== undefined && v !== null) {
      el.textContent = el.dataset.fmt ? fmt(v, +el.dataset.fmt) : v;
    }
  });

  /* =========================================================
     2. Navigation, Progress Bar & Active Spy
     ========================================================= */
  const toggle = $(".nav__toggle"), toc = $("#nav-links");
  const setOpen = (open) => {
    if (!toc) return;
    toc.classList.toggle("open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
  };

  if (toggle) {
    toggle.addEventListener("click", () => setOpen(!toc.classList.contains("open")));
  }

  $$("#nav-links a, .nav__links a").forEach((a) => {
    a.addEventListener("click", () => {
      setOpen(false);
      $$("#nav-links a, .nav__links a").forEach((x) => x.classList.toggle("active", x.getAttribute("href") === a.getAttribute("href")));
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toc && toc.classList.contains("open")) setOpen(false);
  });

  // Scroll Progress
  const bar = $(".nav__progress");
  const onScroll = () => {
    const h = document.documentElement;
    if (bar) {
      bar.style.width = (100 * h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) + "%";
    }

    // Back to top visibility
    const btt = $("#backToTop");
    if (btt) {
      btt.classList.toggle("is-visible", window.scrollY > 400);
    }
  };
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ScrollSpy for Nav Links
  const navLinksMap = {};
  $$(".nav__links a[href^='#'], #nav-links a[href^='#']").forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    if (id) {
      if (!navLinksMap[id]) navLinksMap[id] = [];
      navLinksMap[id].push(a);
    }
  });

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && navLinksMap[e.target.id]) {
        $$(".nav__links a, #nav-links a").forEach((x) => x.classList.remove("active"));
        navLinksMap[e.target.id].forEach((x) => x.classList.add("active"));
      }
    });
  }, { rootMargin: "-25% 0px -65% 0px" });

  $$("main section[id]").forEach((s) => spy.observe(s));

  // Back to Top smooth scroll
  const btt = $("#backToTop");
  if (btt) {
    btt.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* =========================================================
     3. Tabs (EDA Gallery)
     ========================================================= */
  $$(".tabs").forEach((tabs) => {
    const btns = $$("button", tabs);
    const select = (i) => {
      btns.forEach((b, j) => {
        b.setAttribute("aria-selected", String(i === j));
        const panel = $("#" + b.dataset.tab);
        if (panel) panel.hidden = i !== j;
      });
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => select(i));
      b.addEventListener("keydown", (e) => {
        const n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (n) {
          const k = (i + n + btns.length) % btns.length;
          select(k);
          btns[k].focus();
        }
      });
    });
  });

  /* =========================================================
     4. Enhanced Lightbox with Next / Prev Navigation
     ========================================================= */
  const lb = $("#lightbox");
  const lbImg = $("#lightboxImg");
  const lbCap = $("#lightboxCap");
  const lbCounter = $("#lightboxCounter");
  const lbDownload = $("#lightboxDownload");
  const lbPrev = $("#lightboxPrev");
  const lbNext = $("#lightboxNext");
  const lbClose = $("#lightboxClose");

  let galleryImages = [];
  let currentLbIndex = 0;

  function updateGalleryList() {
    galleryImages = $$(".fig img").map((img) => ({
      src: img.src,
      alt: img.alt,
      caption: (img.closest("figure") && img.closest("figure").querySelector("figcaption"))
        ? img.closest("figure").querySelector("figcaption").textContent
        : img.alt
    }));
  }

  function showLbImage(index) {
    if (!galleryImages.length || !lbImg) return;
    currentLbIndex = (index + galleryImages.length) % galleryImages.length;
    const item = galleryImages[currentLbIndex];
    lbImg.src = item.src;
    lbImg.alt = item.alt;
    if (lbCap) lbCap.textContent = item.caption;
    if (lbCounter) lbCounter.textContent = `Figure ${currentLbIndex + 1} of ${galleryImages.length}`;
    if (lbDownload) lbDownload.href = item.src;
  }

  document.addEventListener("click", (e) => {
    const img = e.target.closest(".fig img");
    if (!img || !lb) return;
    updateGalleryList();
    const idx = galleryImages.findIndex((item) => item.src === img.src);
    currentLbIndex = idx >= 0 ? idx : 0;
    showLbImage(currentLbIndex);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    if (lbClose) lbClose.focus();
  });

  const closeLb = () => {
    if (!lb) return;
    lb.hidden = true;
    document.body.style.overflow = "";
  };

  if (lbClose) lbClose.addEventListener("click", closeLb);
  if (lbPrev) lbPrev.addEventListener("click", () => showLbImage(currentLbIndex - 1));
  if (lbNext) lbNext.addEventListener("click", () => showLbImage(currentLbIndex + 1));

  if (lb) {
    lb.addEventListener("click", (e) => {
      if (e.target === lb || e.target.classList.contains("lightbox__content")) closeLb();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!lb || lb.hidden) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") showLbImage(currentLbIndex - 1);
    if (e.key === "ArrowRight") showLbImage(currentLbIndex + 1);
  });

  $$(".fig img").forEach((img) => {
    img.addEventListener("error", () => {
      const f = img.closest("figure");
      if (f) f.style.display = "none";
    });
  });

  /* =========================================================
     5. Model Zoo Benchmark Chart (Multi-Metric)
     ========================================================= */
  const MR = D.model_results || {};
  let chart, currentSet = SETS.A, currentMetric = "roc_auc";

  const METRIC_LABELS = {
    roc_auc: "ROC-AUC",
    balanced_accuracy: "Balanced Accuracy",
    f1: "F1-Score",
    recall: "Sensitivity (Recall)",
    precision: "Precision",
    accuracy: "Accuracy"
  };

  if (window.Chart) {
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 12.5;
  }

  const cvRows = (set, metric) =>
    (MR.cv_comparison || [])
      .filter((r) => r.set === set)
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0));

  function renderCvTable(set) {
    const table = $("#cvTable");
    if (!table) return;
    const cols = [
      ["roc_auc", "ROC-AUC"],
      ["balanced_accuracy", "Bal. acc."],
      ["f1", "F1"],
      ["recall", "Recall"],
      ["precision", "Precision"],
      ["accuracy", "Accuracy"]
    ];
    table.innerHTML =
      "<thead><tr><th>Algorithm</th>" +
      cols.map((c) => `<th class="num">${c[1]}</th>`).join("") +
      "</tr></thead><tbody>" +
      cvRows(set, "roc_auc")
        .map((r, i) =>
          `<tr class="${i === 0 ? "best" : ""}"><td><strong>${esc(r.model)}</strong></td>` +
          cols.map((c) => `<td class="num">${fmt(r[c[0]])}</td>`).join("") +
          "</tr>"
        )
        .join("") +
      "</tbody>";
  }

  function renderChart(set, metric = "roc_auc") {
    renderCvTable(set);
    const canvas = $("#cvChart");
    if (!canvas || !window.Chart) {
      const d = $(".table-toggle");
      if (d) d.open = true;
      return;
    }

    const rows = cvRows(set, metric);
    const isSetA = set === SETS.A;
    const primaryColor = isSetA ? C.blue : C.orange;
    const topColor = isSetA ? C.cyan : "#ea580c";

    const data = {
      labels: rows.map((r) => r.model),
      datasets: [{
        label: METRIC_LABELS[metric],
        data: rows.map((r) => r[metric]),
        backgroundColor: rows.map((r, i) =>
          r.model.startsWith("Baseline") ? C.muted : (i === 0 ? topColor : primaryColor)
        ),
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.72,
        categoryPercentage: 0.88
      }]
    };

    if (chart) {
      chart.data = data;
      chart.options.scales.x.title.text = `${METRIC_LABELS[metric]} (5-fold cross-validation)`;
      chart.update();
      return;
    }

    const chanceLine = {
      id: "chanceLine",
      afterDraw(c) {
        if (currentMetric !== "roc_auc" && currentMetric !== "balanced_accuracy") return;
        const x = c.scales.x.getPixelForValue(0.5);
        const { top, bottom } = c.chartArea;
        const ctx = c.ctx;
        ctx.save();
        ctx.strokeStyle = "rgba(100, 116, 139, 0.75)";
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();

        ctx.fillStyle = "rgba(100, 116, 139, 0.9)";
        ctx.font = "11px Space Grotesk, sans-serif";
        ctx.fillText("Chance (0.50)", x + 6, top + 14);
        ctx.restore();
      }
    };

    chart = new Chart(canvas, {
      type: "bar",
      data,
      plugins: [chanceLine],
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        animation: { duration: 450, easing: "easeOutQuart" },
        layout: { padding: { left: 4, right: 12 } },
        scales: {
          x: {
            min: 0.35,
            max: 1.0,
            grid: { color: C.grid },
            border: { color: "#e2e8f0" },
            ticks: { color: C.ink2, font: { weight: 500 } },
            title: {
              display: true,
              text: `${METRIC_LABELS[metric]} (5-fold cross-validation)`,
              color: C.ink2,
              font: { weight: 600 }
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: C.ink,
              font: { weight: 600 },
              callback(v) {
                const name = this.getLabelForValue(v);
                if (window.innerWidth > 680) return name;
                return ({
                  "Logistic Regression": "Logistic Reg.",
                  "Gradient Boosting": "Grad. Boosting",
                  "Baseline (majority)": "Baseline",
                  "Random Forest": "Rand. Forest",
                  "Decision Tree": "Dec. Tree",
                  "PCA + SVM (RBF)": "PCA + SVM"
                })[name] || name;
              }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#090a0f",
            titleFont: { family: "Space Grotesk", weight: 700, size: 13 },
            bodyFont: { family: "Inter", size: 12 },
            padding: 12,
            cornerRadius: 8,
            borderColor: "rgba(255, 255, 255, 0.15)",
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const r = cvRows(currentSet, currentMetric)[ctx.dataIndex];
                return [
                  `ROC-AUC:  ${fmt(r.roc_auc)} ± ${fmt(r.roc_auc_sd)}`,
                  `Balanced Acc:  ${fmt(r.balanced_accuracy)}`,
                  `F1-Score:  ${fmt(r.f1)}`,
                  `Recall / Sens:  ${fmt(r.recall)}`,
                  `Precision:  ${fmt(r.precision)}`,
                  `Overall Acc:  ${fmt(r.accuracy)}`
                ];
              }
            }
          }
        }
      }
    });
  }

  // Set Selector Buttons
  $$(".chart-card .seg:not(.seg--metric) button").forEach((b) => {
    b.addEventListener("click", () => {
      $$(".chart-card .seg:not(.seg--metric) button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      currentSet = b.dataset.set;
      renderChart(currentSet, currentMetric);
    });
  });

  // Metric Selector Buttons
  $$(".seg--metric button").forEach((b) => {
    b.addEventListener("click", () => {
      $$(".seg--metric button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      currentMetric = b.dataset.metric;
      renderChart(currentSet, currentMetric);
    });
  });

  if (MR.cv_comparison) renderChart(currentSet, currentMetric);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (chart) {
        chart.destroy();
        chart = null;
        renderChart(currentSet, currentMetric);
      }
    });
  }

  /* =========================================================
     6. Test-Set Results Cards
     ========================================================= */
  if (MR.test) {
    const label = {
      [SETS.A]: ["Set A", "pill--a", "Demographics & IQ Only", ""],
      [SETS.B]: ["Set B", "pill--b", "With Parent Symptom Ratings", "result--b"]
    };
    const testContainer = $("#testCards");
    if (testContainer) {
      testContainer.innerHTML = Object.entries(MR.test).map(([s, t]) => `
        <article class="card pad result ${label[s][3]}">
          <h3>
            <span class="pill ${label[s][1]}">${label[s][0]}</span>
            <span>${label[s][2]}</span>
          </h3>
          <p class="muted small">Best architecture: <strong>${esc(t.model)}</strong>, validated on ${t.n_test} unseen subjects</p>
          <div class="result__auc">${fmt(t.roc_auc, 2)}</div>
          <p class="result__ci">Test ROC-AUC · 95% Confidence Interval: <strong>${fmt(t.roc_auc_ci95[0], 2)} – ${fmt(t.roc_auc_ci95[1], 2)}</strong></p>
          <div class="metric-grid">
            <div class="metric"><b>${pct(t.accuracy, 1)}</b><span>Accuracy</span></div>
            <div class="metric"><b>${pct(t.balanced_accuracy, 1)}</b><span>Balanced Acc</span></div>
            <div class="metric"><b>${pct(t.sensitivity, 1)}</b><span>Sensitivity (Recall)</span></div>
            <div class="metric"><b>${pct(t.specificity, 1)}</b><span>Specificity</span></div>
            <div class="metric"><b>${fmt(t.f1, 2)}</b><span>F1 Score</span></div>
            <div class="metric"><b>${pct(t.precision, 1)}</b><span>Precision</span></div>
            <div class="metric"><b>${fmt(t.pr_auc, 2)}</b><span>PR-AUC</span></div>
            <div class="metric"><b>${fmt(t.brier, 3)}</b><span>Brier Calibration</span></div>
          </div>
        </article>`).join("");
    }
  }

  /* =========================================================
     7. Clinic Confound & Gender Fairness
     ========================================================= */
  if (MR.site_confound) {
    const sc = MR.site_confound;
    const barsContainer = $("#confoundBars");
    if (barsContainer) {
      barsContainer.innerHTML = [
        ["Without clinic feature", sc.without_site, ""],
        ["Clinic ID name only", sc.site_only, "bar__fill--warn"],
        ["With clinic feature", sc.with_site, "bar__fill--warn"]
      ].map(([l, v, cls]) => `
        <div class="bar">
          <span>${l}</span>
          <div class="bar__track">
            <div class="bar__fill ${cls}" style="width:${Math.max(0, (v - 0.35) / 0.65 * 100)}%"></div>
          </div>
          <b>${fmt(v, 2)}</b>
        </div>`).join("");
    }
  }

  if (MR.subgroups) {
    const subTable = $("#subgroupTable");
    if (subTable) {
      subTable.innerHTML =
        "<thead><tr><th>Paradigm</th><th>Subgroup</th><th class='num'>Sample (n)</th><th class='num'>ROC-AUC</th><th class='num'>Sensitivity</th><th class='num'>Specificity</th></tr></thead><tbody>" +
        MR.subgroups.map((r) => `
          <tr>
            <td><span class="pill ${r.set.startsWith("A") ? "pill--a" : "pill--b"}">${r.set.startsWith("A") ? "Set A" : "Set B"}</span></td>
            <td><strong>${esc(r.group)}</strong></td>
            <td class="num">${r.n}</td>
            <td class="num"><strong>${fmt(r.roc_auc, 2)}</strong></td>
            <td class="num" style="${r.sensitivity < 0.4 ? 'color: var(--coral); font-weight:700;' : ''}">${pct(r.sensitivity)}</td>
            <td class="num">${pct(r.specificity)}</td>
          </tr>`).join("") +
        "</tbody>";
    }
  }

  /* =========================================================
     8. fMRI Connectome Results
     ========================================================= */
  const F = D.fmri_results;
  if (F && F.results) {
    const bestPer = {};
    F.results.forEach((r) => {
      if (!bestPer[r.model] || r.accuracy > bestPer[r.model].accuracy) bestPer[r.model] = r;
    });
    const fmriTable = $("#fmriCompare");
    if (fmriTable) {
      fmriTable.innerHTML =
        "<thead><tr><th>Model</th><th>Optimal Setting</th><th class='num'>Accuracy</th><th class='num'>F1</th><th class='num'>AUC</th></tr></thead><tbody>" +
        Object.values(bestPer).sort((a, b) => b.accuracy - a.accuracy).map((r) => `
          <tr>
            <td><strong>${esc(r.model)}</strong></td>
            <td><code>${r.atlas.toUpperCase()}</code> · ${esc(r.connectivity)}</td>
            <td class="num">${fmt(r.accuracy, 2)}</td>
            <td class="num">${fmt(r.f1, 2)}</td>
            <td class="num">${fmt(r.roc_auc, 2)}</td>
          </tr>`).join("") +
        "</tbody>";
    }
    const p = F.permutation;
    const note = $("#fmriNote");
    if (note && p) {
      note.textContent =
        `Top connectome classifier reached ${fmt(p.score * 100, 0)}% accuracy. 500-fold label permutation null distribution averages ${fmt(p.null_mean * 100, 0)}% (p = ${fmt(p.p_value, 2)}). ` +
        (p.p_value < 0.05
          ? "Statistically elevated above chance, but confidence intervals remain broad."
          : "Not statistically distinguishable from random guessing.");
    }
  }

  /* =========================================================
     9. Interactive Clinical Predictor (In-Browser Demo)
     ========================================================= */
  const DM = D.demo_model;
  const SCALE = {
    "Conners": {
      adhd_index: [40, 100],
      inattentive: [40, 100],
      hyper_impulsive: [40, 100],
      ph: ["T-Score (40–100)", "T-Score (40–100)", "T-Score (40–100)"]
    },
    "ADHD-RS": {
      adhd_index: [18, 72],
      inattentive: [9, 36],
      hyper_impulsive: [9, 36],
      ph: ["Score (18–72)", "Score (9–36)", "Score (9–36)"]
    }
  };

  const NICE = {
    age: "Age",
    sex_male: "Sex (Male)",
    handedness: "Handedness",
    verbal_iq: "Verbal IQ",
    performance_iq: "Performance IQ",
    full_iq: "Full-scale IQ",
    iq_discrepancy: "Verbal − Perf. IQ",
    iq_missing: "IQ Missing Flag",
    age_sq: "Age Quadratic",
    adhd_index_sev: "ADHD Global Severity",
    inattentive_sev: "Inattention Severity",
    hyper_impulsive_sev: "Hyperactivity Severity",
    inatt_minus_hyper: "Inatt. − Hyper. Diff"
  };

  const form = $("#demoForm");
  let demoSet = SETS.A;

  const num = (name) => {
    if (!form || !form.elements[name]) return NaN;
    const v = form.elements[name].value;
    return v === "" ? NaN : Number(v);
  };

  const sev = (name, scale) => {
    const v = num(name);
    if (Number.isNaN(v)) return NaN;
    const [lo, hi] = SCALE[scale][name];
    return Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  };

  function predict() {
    if (!DM || !DM[demoSet] || !form) return;
    const m = DM[demoSet];
    const raw = {
      age: num("age"),
      sex_male: num("sex_male"),
      handedness: num("handedness"),
      verbal_iq: num("verbal_iq"),
      performance_iq: num("performance_iq"),
      full_iq: num("full_iq")
    };

    raw.iq_discrepancy = raw.verbal_iq - raw.performance_iq;
    raw.iq_missing = (Number.isNaN(raw.verbal_iq) || Number.isNaN(raw.performance_iq)) ? 1 : 0;
    raw.age_sq = Math.pow(raw.age - 12, 2);

    const scale = form.elements.scale.value;
    raw.adhd_index_sev = sev("adhd_index", scale);
    raw.inattentive_sev = sev("inattentive", scale);
    raw.hyper_impulsive_sev = sev("hyper_impulsive", scale);
    raw.inatt_minus_hyper = raw.inattentive_sev - raw.hyper_impulsive_sev;

    let z = m.intercept;
    const contrib = [];

    m.features.forEach((f, i) => {
      let x = raw[f];
      if (x === undefined || Number.isNaN(x)) x = m.medians[i];
      const c = m.coef[i] * (x - m.means[i]) / m.scales[i];
      z += c;
      contrib.push([f, c]);
    });

    const p = 1 / (1 + Math.exp(-z));
    const isAdhd = p >= m.threshold;
    const pPct = p * 100;

    const fill = $("#gaugeFill");
    const thr = $("#gaugeThr");
    const prob = $("#demoProb");
    const tier = $("#demoTier");
    const lab = $("#demoLabel");

    if (fill) fill.style.width = pPct.toFixed(1) + "%";
    if (thr) {
      thr.style.left = (m.threshold * 100).toFixed(1) + "%";
      thr.title = `Decision Threshold: ${(m.threshold * 100).toFixed(1)}%`;
    }
    if (prob) prob.textContent = pPct.toFixed(0) + "%";

    if (tier) {
      if (pPct < 35) {
        tier.textContent = "Low Probability";
        tier.className = "demo__tier demo__tier--low";
      } else if (pPct < 65) {
        tier.textContent = "Borderline / Moderate";
        tier.className = "demo__tier demo__tier--mid";
      } else {
        tier.textContent = "High Probability";
        tier.className = "demo__tier demo__tier--high";
      }
    }

    if (lab) {
      lab.textContent = isAdhd
        ? "Predicted Profile: ADHD Pattern"
        : "Predicted Profile: Typically Developing (Control)";
      lab.className = "demo__label " + (isAdhd ? "is-adhd" : "is-td");
    }

    // Sort contributions by absolute impact
    contrib.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const maxAbs = Math.max(0.4, ...contrib.map((c) => Math.abs(c[1])));

    const contribBox = $("#demoContrib");
    if (contribBox) {
      contribBox.innerHTML = contrib.slice(0, 7).map(([f, c]) => {
        const w = (Math.abs(c) / maxAbs) * 50;
        const left = c >= 0 ? 50 : 50 - w;
        const color = c >= 0 ? C.orange : C.cyan;
        const sign = c >= 0 ? "+" : "";
        return `
          <div class="contrib__row">
            <span>${NICE[f] || f}</span>
            <div class="contrib__axis" title="${sign}${c.toFixed(2)} log-odds">
              <div class="contrib__bar" style="left:${left}%;width:${w}%;background:${color}"></div>
            </div>
            <span class="contrib__val">${sign}${c.toFixed(2)}</span>
          </div>`;
      }).join("");
    }

    const info = $("#demoModelInfo");
    if (info) {
      info.textContent =
        `Warm bars push toward ADHD diagnosis, cyan bars toward typically developing. Decision threshold is ${(m.threshold * 100).toFixed(1)}% (white tick on gauge). Cross-validated AUC: ${fmt(m.cv_auc, 2)}.`;
    }

    // Update synced slider indicators
    ["age", "verbal_iq", "performance_iq", "full_iq"].forEach((f) => {
      const valSpan = $(`#val-${f}`);
      if (valSpan && !Number.isNaN(raw[f])) {
        valSpan.textContent = raw[f];
      }
    });
  }

  // Presets definition
  const PRESETS = {
    control: {
      set: SETS.A,
      data: { age: 11.5, sex_male: 1, handedness: 1, verbal_iq: 112, performance_iq: 108, full_iq: 110 }
    },
    adhd_combined: {
      set: SETS.B,
      scale: "ADHD-RS",
      data: {
        age: 10.0, sex_male: 1, handedness: 1,
        verbal_iq: 98, performance_iq: 94, full_iq: 96,
        adhd_index: 64, inattentive: 32, hyper_impulsive: 31
      }
    },
    adhd_inattentive: {
      set: SETS.B,
      scale: "ADHD-RS",
      data: {
        age: 13.0, sex_male: 0, handedness: 1,
        verbal_iq: 110, performance_iq: 105, full_iq: 108,
        adhd_index: 46, inattentive: 33, hyper_impulsive: 14
      }
    },
    high_iq: {
      set: SETS.B,
      scale: "ADHD-RS",
      data: {
        age: 12.0, sex_male: 0, handedness: 1,
        verbal_iq: 136, performance_iq: 128, full_iq: 134,
        adhd_index: 44, inattentive: 26, hyper_impulsive: 17
      }
    },
    reset: {
      set: SETS.A,
      scale: "ADHD-RS",
      data: { age: 10.0, sex_male: 1, handedness: 1, verbal_iq: 110, performance_iq: 105, full_iq: 108, adhd_index: "", inattentive: "", hyper_impulsive: "" }
    }
  };

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p || !form) return;

    // Switch model set if necessary
    demoSet = p.set;
    $$(".demo .seg button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.model === demoSet)));
    const sym = $(".symptoms");
    if (sym) sym.disabled = demoSet !== SETS.B;

    if (p.scale) form.elements.scale.value = p.scale;
    setPlaceholders();

    // Populate values
    Object.entries(p.data).forEach(([k, v]) => {
      if (form.elements[k]) {
        form.elements[k].value = v;
        const slider = $(`#slider-${k}`);
        if (slider) slider.value = v;
        const valSpan = $(`#val-${k}`);
        if (valSpan) valSpan.textContent = v;
      }
    });

    $$(".preset-btn").forEach((b) => b.classList.toggle("active", b.dataset.preset === name));
    predict();
  }

  $$(".preset-btn").forEach((b) => {
    b.addEventListener("click", () => applyPreset(b.dataset.preset));
  });

  const setPlaceholders = () => {
    if (!form || !form.elements.scale) return;
    const ph = SCALE[form.elements.scale.value].ph;
    ["adhd_index", "inattentive", "hyper_impulsive"].forEach((n, i) => {
      if (form.elements[n]) form.elements[n].placeholder = ph[i];
    });
  };

  $$(".demo .seg button").forEach((b) => {
    b.addEventListener("click", () => {
      $$(".demo .seg button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      demoSet = b.dataset.model;
      const sym = $(".symptoms");
      if (sym) sym.disabled = demoSet !== SETS.B;
      predict();
    });
  });

  if (form) {
    form.addEventListener("input", (e) => {
      // Sync sliders and inputs
      const target = e.target;
      if (target.type === "range" && target.dataset.target) {
        const inp = form.elements[target.dataset.target];
        if (inp) inp.value = target.value;
      } else if (target.type === "number") {
        const slider = $(`#slider-${target.name}`);
        if (slider) slider.value = target.value;
      }
      predict();
    });

    if (form.elements.scale) {
      form.elements.scale.addEventListener("change", () => {
        setPlaceholders();
        predict();
      });
    }

    setPlaceholders();
    predict();
  }

  /* =========================================================
     10. Notebooks Gallery
     ========================================================= */
  const NB_DESC = {
    "01": "Acquisition from 10 clinics, codes & rating scale harmonisation, duplicate removal, missingness audit.",
    "02": "Exploratory statistics, Cohen's d effect sizes, IQ distributions, clinic confounding discovery.",
    "03": "Feature engineering, VIF multicollinearity checks, imputation benchmarks, class balancing with SMOTE.",
    "04": "13 algorithms evaluated with 5-fold CV, Hyper-parameter tuning, Voting/Stacking ensembles, LOSO testing.",
    "05": "Explainability via SHAP beeswarm & waterfall, permutation feature importance, PDP/ICE curves.",
    "06": "40 resting-state fMRI scans processed via Nilearn, MSDL/BASC connectomes, tangent space classification."
  };

  const nbGrid = $("#nbGrid");
  if (nbGrid && D.notebooks) {
    nbGrid.innerHTML = D.notebooks.map((n) => {
      const id = n.file.slice(0, 2);
      return `
        <article class="card nb">
          <span class="nb__num">${id}</span>
          <span class="nb__title">${esc(n.title.replace(/^\d+\s*·\s*/, ""))}</span>
          <p class="nb__meta">${NB_DESC[id] || ""}</p>
          <span class="nb__stats">${n.cells} cells · ${n.code_cells} code</span>
          <div class="nb__links">
            <a href="notebooks/${n.file}.html" target="_blank" rel="noopener">Interactive HTML ↗</a>
            <a href="notebooks/${n.file}.ipynb" download>Download .ipynb ↓</a>
          </div>
        </article>`;
    }).join("");
  }

  // Copy Project Tree
  const copyBtn = $("#copyTree");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const code = $(".tree code");
      if (!code) return;
      navigator.clipboard.writeText(code.innerText).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy Structure"; }, 2000);
      });
    });
  }
})();
