/* NeuroADHD website: interactivity. Data comes from assets/js/data.js (window.NEURO_DATA). */
(function () {
  "use strict";
  const D = window.NEURO_DATA || {};
  const SETS = { A: "A_demographic_cognitive", B: "B_with_symptom_ratings" };
  const C = { blue: "#2a78d6", orange: "#eb6834", muted: "#a8a59c", grid: "#ebe8e1", ink2: "#55534e", ink: "#1b1b1a" };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  // round half-up (0.955 -> "0.96") without floating-point surprises
  const fmt = (v, d = 3) => (v === null || v === undefined || Number.isNaN(Number(v))) ? "–" : Number(Math.round(Number(v + "e" + d)) + "e-" + d).toFixed(d);
  const pct = (v, d = 0) => (v === null || v === undefined) ? "–" : fmt(v * 100, d) + "%";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- data-bind ---------- */
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
    if (v !== undefined && v !== null) el.textContent = el.dataset.fmt ? fmt(v, +el.dataset.fmt) : v;
  });

  /* ---------- contents: mobile toggle, scroll-spy, progress ---------- */
  const toggle = $(".nav__toggle"), toc = $("#nav-links");
  const setOpen = (open) => { toc.classList.toggle("open", open); toggle.setAttribute("aria-expanded", String(open)); };
  toggle.addEventListener("click", () => setOpen(!toc.classList.contains("open")));
  $$("#nav-links a").forEach((a) => a.addEventListener("click", () => {
    setOpen(false);
    $$("#nav-links a").forEach((x) => x.classList.toggle("active", x === a));
  }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  const navMap = Object.fromEntries($$("#nav-links a[href^='#']").map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && navMap[e.target.id]) {
        Object.values(navMap).forEach((a) => a.classList.remove("active"));
        navMap[e.target.id].classList.add("active");
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  $$("main section[id]").forEach((s) => spy.observe(s));

  const bar = $(".nav__progress");
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.width = (100 * h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) + "%";
  };
  document.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- tabs ---------- */
  $$(".tabs").forEach((tabs) => {
    const btns = $$("button", tabs);
    const select = (i) => btns.forEach((b, j) => { b.setAttribute("aria-selected", String(i === j)); $("#" + b.dataset.tab).hidden = i !== j; });
    btns.forEach((b, i) => {
      b.addEventListener("click", () => select(i));
      b.addEventListener("keydown", (e) => {
        const n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (n) { const k = (i + n + btns.length) % btns.length; select(k); btns[k].focus(); }
      });
    });
  });

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("img", lb), lbCap = $(".lightbox__cap", lb);
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".fig img, .hero__fig img");
    if (!img) return;
    lbImg.src = img.src; lbImg.alt = img.alt;
    const cap = img.closest("figure").querySelector("figcaption");
    lbCap.textContent = cap ? cap.textContent : "";
    lb.hidden = false; document.body.style.overflow = "hidden"; $(".lightbox__close", lb).focus();
  });
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ""; };
  lb.addEventListener("click", (e) => { if (e.target !== lbImg) closeLb(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) closeLb(); });
  $$(".fig img").forEach((img) => img.addEventListener("error", () => { img.closest("figure").style.display = "none"; }));

  /* ---------- model comparison chart ---------- */
  const MR = D.model_results || {};
  let chart, currentSet = SETS.A;
  if (window.Chart) { Chart.defaults.font.family = "Inter, system-ui, sans-serif"; Chart.defaults.font.size = 12.5; }
  const cvRows = (set) => (MR.cv_comparison || []).filter((r) => r.set === set).sort((a, b) => b.roc_auc - a.roc_auc);
  function renderCvTable(set) {
    const cols = [["roc_auc", "ROC-AUC"], ["balanced_accuracy", "Bal. acc."], ["f1", "F1"], ["recall", "Recall"], ["precision", "Precision"], ["accuracy", "Accuracy"]];
    $("#cvTable").innerHTML = "<thead><tr><th>Model</th>" + cols.map((c) => `<th class="num">${c[1]}</th>`).join("") + "</tr></thead><tbody>" +
      cvRows(set).map((r, i) => `<tr class="${i === 0 ? "best" : ""}"><td>${esc(r.model)}</td>` + cols.map((c) => `<td class="num">${fmt(r[c[0]])}</td>`).join("") + "</tr>").join("") + "</tbody>";
  }
  function renderChart(set) {
    renderCvTable(set);
    if (!window.Chart) { const d = $(".table-toggle"); if (d) d.open = true; return; }
    const rows = cvRows(set);
    const data = {
      labels: rows.map((r) => r.model),
      datasets: [{ data: rows.map((r) => r.roc_auc), backgroundColor: rows.map((r, i) => r.model.startsWith("Baseline") ? C.muted : i === 0 ? C.orange : C.blue),
                   borderRadius: 3, borderSkipped: "start", barPercentage: 0.7, categoryPercentage: 0.9 }],
    };
    if (chart) { chart.data = data; chart.update(); return; }
    const chance = {
      id: "chance",
      afterDraw(c) {
        const x = c.scales.x.getPixelForValue(0.5), { top, bottom } = c.chartArea, ctx = c.ctx;
        ctx.save(); ctx.strokeStyle = C.ink2; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke(); ctx.restore();
      },
    };
    chart = new Chart($("#cvChart"), {
      type: "bar", data, plugins: [chance],
      options: {
        indexAxis: "y", maintainAspectRatio: false, animation: { duration: 400 }, layout: { padding: { left: 8, right: 8 } },
        scales: {
          x: { min: 0.4, max: 1, grid: { color: C.grid }, border: { color: "#d3cfc5" }, ticks: { color: C.ink2 }, title: { display: true, text: "ROC-AUC (5-fold cross-validation)", color: C.ink2 } },
          y: { grid: { display: false }, ticks: { color: C.ink, callback(v) {
            const name = this.getLabelForValue(v);
            if (window.innerWidth > 600) return name;
            return ({ "Logistic Regression": "Logistic Reg.", "Gradient Boosting": "Grad. Boosting", "Baseline (majority)": "Baseline",
                      "Random Forest": "Rand. Forest", "Decision Tree": "Dec. Tree", "PCA + SVM (RBF)": "PCA + SVM" })[name] || name;
          } } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1f1e1c", padding: 12, titleFont: { weight: 600 },
            callbacks: {
              label: (ctx) => {
                const r = cvRows(currentSet)[ctx.dataIndex];
                return [`ROC-AUC  ${fmt(r.roc_auc)} ± ${fmt(r.roc_auc_sd)}`, `Balanced accuracy  ${fmt(r.balanced_accuracy)}`,
                        `F1  ${fmt(r.f1)}`, `Recall  ${fmt(r.recall)}`, `Precision  ${fmt(r.precision)}`];
              },
            },
          },
        },
      },
    });
  }
  $$(".chart-card .seg button").forEach((b) => b.addEventListener("click", () => {
    $$(".chart-card .seg button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    currentSet = b.dataset.set; renderChart(currentSet);
  }));
  if (MR.cv_comparison) renderChart(currentSet);
  // re-measure labels once the web font has loaded (avoids clipped axis labels)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (chart) { chart.destroy(); chart = null; renderChart(currentSet); } });

  /* ---------- test-set results ---------- */
  if (MR.test) {
    const label = { [SETS.A]: ["Set A", "pill--a", "Age, sex and IQ only"], [SETS.B]: ["Set B", "pill--b", "With parent ratings"] };
    $("#testCards").innerHTML = Object.entries(MR.test).map(([s, t]) => `
      <article class="card pad result">
        <h3><span class="pill ${label[s][1]}">${label[s][0]}</span>${label[s][2]}</h3>
        <p class="muted small">Best model: <strong>${esc(t.model)}</strong>, tested on ${t.n_test} children it had never seen</p>
        <div class="result__auc">${fmt(t.roc_auc, 2)}</div>
        <p class="result__ci">test score (ROC-AUC) · 95 % confidence range ${fmt(t.roc_auc_ci95[0], 2)}–${fmt(t.roc_auc_ci95[1], 2)}</p>
        <div class="metric-grid">
          <div class="metric"><b>${pct(t.accuracy, 1)}</b><span>accuracy</span></div>
          <div class="metric"><b>${pct(t.balanced_accuracy, 1)}</b><span>balanced acc.</span></div>
          <div class="metric"><b>${pct(t.sensitivity, 1)}</b><span>ADHD cases caught</span></div>
          <div class="metric"><b>${pct(t.specificity, 1)}</b><span>non-ADHD correctly cleared</span></div>
          <div class="metric"><b>${fmt(t.f1, 2)}</b><span>F1 score</span></div>
          <div class="metric"><b>${pct(t.precision, 1)}</b><span>precision</span></div>
          <div class="metric"><b>${fmt(t.pr_auc, 2)}</b><span>PR-AUC</span></div>
          <div class="metric"><b>${fmt(t.brier, 3)}</b><span>Brier score</span></div>
        </div>
      </article>`).join("");
  }

  /* ---------- clinic confound & fairness ---------- */
  if (MR.site_confound) {
    const sc = MR.site_confound;
    $("#confoundBars").innerHTML = [["Without clinic", sc.without_site, ""], ["Clinic only", sc.site_only, "bar__fill--warn"], ["With clinic", sc.with_site, "bar__fill--warn"]]
      .map(([l, v, cls]) => `<div class="bar"><span>${l}</span><div class="bar__track"><div class="bar__fill ${cls}" style="width:${Math.max(0, (v - 0.4) / 0.6 * 100)}%"></div></div><b>${fmt(v, 2)}</b></div>`).join("");
  }
  if (MR.subgroups) {
    $("#subgroupTable").innerHTML = "<thead><tr><th>Set</th><th>Group</th><th class='num'>n</th><th class='num'>AUC</th><th class='num'>Sensitivity</th><th class='num'>Specificity</th></tr></thead><tbody>" +
      MR.subgroups.map((r) => `<tr><td>${r.set.startsWith("A") ? "A" : "B"}</td><td>${esc(r.group)}</td><td class="num">${r.n}</td><td class="num">${fmt(r.roc_auc, 2)}</td><td class="num">${pct(r.sensitivity)}</td><td class="num">${pct(r.specificity)}</td></tr>`).join("") + "</tbody>";
  }

  /* ---------- fMRI comparison ---------- */
  const F = D.fmri_results;
  if (F && F.results) {
    const bestPer = {};
    F.results.forEach((r) => { if (!bestPer[r.model] || r.accuracy > bestPer[r.model].accuracy) bestPer[r.model] = r; });
    $("#fmriCompare").innerHTML = "<thead><tr><th>Model</th><th>Best setting</th><th class='num'>Acc.</th><th class='num'>F1</th><th class='num'>AUC</th></tr></thead><tbody>" +
      Object.values(bestPer).sort((a, b) => b.accuracy - a.accuracy).map((r) => `<tr><td>${esc(r.model)}</td><td>${r.atlas.toUpperCase()} · ${esc(r.connectivity)}</td><td class="num">${fmt(r.accuracy, 2)}</td><td class="num">${fmt(r.f1, 2)}</td><td class="num">${fmt(r.roc_auc, 2)}</td></tr>`).join("") + "</tbody>";
    const p = F.permutation;
    $("#fmriNote").textContent = `The best setting reached ${fmt(p.score * 100, 0)} % accuracy, while shuffled labels average about ${fmt(p.null_mean * 100, 0)} % (p = ${fmt(p.p_value, 2)}). ` +
      (p.p_value < 0.05 ? "That is above chance, but the uncertainty is wide." : "That is not clearly better than guessing.");
  } else {
    const fm = $("#fmriCompare"); if (fm) fm.closest(".card").style.display = "none";
  }

  /* ---------- interactive demo ---------- */
  const DM = D.demo_model;
  const SCALE = {
    "Conners": { adhd_index: [40, 100], inattentive: [40, 100], hyper_impulsive: [40, 100], ph: ["T 40–100", "T 40–100", "T 40–100"] },
    "ADHD-RS": { adhd_index: [18, 72], inattentive: [9, 36], hyper_impulsive: [9, 36], ph: ["ADHD-RS 18–72", "ADHD-RS 9–36", "ADHD-RS 9–36"] },
  };
  const NICE = { age: "Age", sex_male: "Sex (male)", handedness: "Handedness", verbal_iq: "Verbal IQ", performance_iq: "Performance IQ", full_iq: "Full-scale IQ",
    iq_discrepancy: "Verbal − perf. IQ", iq_missing: "IQ missing", age_sq: "Age (curve)", adhd_index_sev: "ADHD index", inattentive_sev: "Inattention",
    hyper_impulsive_sev: "Hyperactivity", inatt_minus_hyper: "Inatt. − hyper." };
  const form = $("#demoForm");
  let demoSet = SETS.A;
  const num = (name) => { const v = form.elements[name].value; return v === "" ? NaN : Number(v); };
  const sev = (name, scale) => { const v = num(name); if (Number.isNaN(v)) return NaN; const [lo, hi] = SCALE[scale][name]; return Math.min(1, Math.max(0, (v - lo) / (hi - lo))); };
  function predict() {
    if (!DM || !DM[demoSet]) { $("#demoProb").textContent = "n/a"; return; }
    const m = DM[demoSet];
    const raw = { age: num("age"), sex_male: num("sex_male"), handedness: num("handedness"), verbal_iq: num("verbal_iq"), performance_iq: num("performance_iq"), full_iq: num("full_iq") };
    raw.iq_discrepancy = raw.verbal_iq - raw.performance_iq;
    raw.iq_missing = (Number.isNaN(raw.verbal_iq) || Number.isNaN(raw.performance_iq)) ? 1 : 0;
    raw.age_sq = Math.pow(raw.age - 12, 2);
    const scale = form.elements.scale.value;
    raw.adhd_index_sev = sev("adhd_index", scale); raw.inattentive_sev = sev("inattentive", scale); raw.hyper_impulsive_sev = sev("hyper_impulsive", scale);
    raw.inatt_minus_hyper = raw.inattentive_sev - raw.hyper_impulsive_sev;
    let z = m.intercept; const contrib = [];
    m.features.forEach((f, i) => {
      let x = raw[f]; if (x === undefined || Number.isNaN(x)) x = m.medians[i];
      const c = m.coef[i] * (x - m.means[i]) / m.scales[i]; z += c; contrib.push([f, c]);
    });
    const p = 1 / (1 + Math.exp(-z)), adhd = p >= m.threshold;
    $("#gaugeFill").style.width = (p * 100).toFixed(1) + "%";
    $("#gaugeThr").style.left = (m.threshold * 100).toFixed(1) + "%";
    $("#demoProb").textContent = (p * 100).toFixed(0) + "%";
    const lab = $("#demoLabel");
    lab.textContent = adhd ? "This profile looks more like the ADHD group" : "This profile looks more like the typically developing group";
    lab.className = "demo__label " + (adhd ? "is-adhd" : "is-td");
    contrib.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const maxAbs = Math.max(0.5, ...contrib.map((c) => Math.abs(c[1])));
    $("#demoContrib").innerHTML = contrib.slice(0, 7).map(([f, c]) => {
      const w = Math.abs(c) / maxAbs * 50, left = c >= 0 ? 50 : 50 - w;
      return `<div class="contrib__row"><span>${NICE[f] || f}</span><div class="contrib__axis" title="${c >= 0 ? "+" : ""}${c.toFixed(2)} log-odds"><div class="contrib__bar" style="left:${left}%;width:${w}%;background:${c >= 0 ? C.orange : C.blue}"></div></div></div>`;
    }).join("");
    $("#demoModelInfo").textContent = `Orange bars push the prediction toward ADHD, blue bars away from it. The black line on the bar above is where the model draws the line (${fmt(m.threshold * 100, 0)} %). This model scored ${fmt(m.cv_auc, 2)} AUC in testing.`;
  }
  const setPlaceholders = () => { const ph = SCALE[form.elements.scale.value].ph; ["adhd_index", "inattentive", "hyper_impulsive"].forEach((n, i) => { form.elements[n].placeholder = ph[i]; }); };
  $$(".demo .seg button").forEach((b) => b.addEventListener("click", () => {
    $$(".demo .seg button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    demoSet = b.dataset.model; $(".symptoms").disabled = demoSet !== SETS.B; predict();
  }));
  form.addEventListener("input", predict);
  form.elements.scale.addEventListener("change", () => { setPlaceholders(); predict(); });
  setPlaceholders(); predict();

  /* ---------- notebooks ---------- */
  const NB_DESC = {
    "01": "Downloading the ten clinic files, making them agree with each other, and checking what is missing.",
    "02": "Getting to know the data: charts, statistics and the first warning signs about clinics.",
    "03": "Preparing the data, with each choice (filling gaps, balancing, features) tested rather than assumed.",
    "04": "Training and comparing 13 models, tuning the best, and testing on new children and new clinics.",
    "05": "Looking inside the models with SHAP, finding the handedness problem, and studying the mistakes.",
    "06": "Turning 40 brain scans into connectivity patterns and testing whether they can predict ADHD.",
  };
  if (D.notebooks) {
    $("#nbGrid").innerHTML = D.notebooks.map((n) => {
      const id = n.file.slice(0, 2);
      return `<article class="card nb">
        <span class="nb__num">${id}</span>
        <span class="nb__title">${esc(n.title.replace(/^\d+\s*·\s*/, ""))}</span>
        <span class="nb__meta">${NB_DESC[id] || ""}</span>
        <span class="nb__meta">${n.cells} cells · ${n.code_cells} code</span>
        <div class="nb__links"><a href="notebooks/${n.file}.html" target="_blank" rel="noopener">View notebook →</a><a href="notebooks/${n.file}.ipynb" download>Download .ipynb</a></div>
      </article>`;
    }).join("");
  }
})();
