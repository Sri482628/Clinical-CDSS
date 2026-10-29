/* ==========================================================================
   Explainable AI Clinical Decision Support System
   script.js — rule-based multi-disease prediction engine (100% client-side)
   ========================================================================== */

/* ---------------------------------------------------------------------- *
 * 0. AUTH GUARD (runs on every page that includes this script)
 * ---------------------------------------------------------------------- */
(function authGuard() {
  const onLoginPage = window.location.pathname.endsWith("login.html");
  const loggedIn = sessionStorage.getItem("cdss_logged_in") === "true";

  if (!loggedIn && !onLoginPage) {
    window.location.href = "login.html";
  }
})();

/* ---------------------------------------------------------------------- *
 * 1. STATIC DATA — symptoms, icons, disease metadata
 * ---------------------------------------------------------------------- */

const SYMPTOMS = [
  { id: "fatigue", label: "Fatigue", icon: "M13 2 3 14h9l-1 8 10-12h-9l1-8Z" },
  { id: "urination", label: "Frequent Urination", icon: "M12 3v1M12 20v1M4.2 4.2l.7.7M18.4 18.4l.7.7M3 12h1M20 12h1M4.9 19.1l.7-.7M18.4 5.6l.7-.7M12 7a5 5 0 0 0-5 5c0 3 5 8 5 8s5-5 5-8a5 5 0 0 0-5-5Z" },
  { id: "weightloss", label: "Weight Loss", icon: "M12 20V10M12 10 8 14M12 10l4 4M5 4h14l-1.5 5h-11z" },
  { id: "chestpain", label: "Chest Pain", icon: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" },
  { id: "dizziness", label: "Dizziness", icon: "M12 2a10 10 0 1 0 10 10M12 2v6M12 2 8 6" },
  { id: "breath", label: "Shortness of Breath", icon: "M6 18c3-2 3-6 0-8M12 18c3-2 3-10 0-12M18 18c3-2 3-6 0-8" },
  { id: "fever", label: "Fever", icon: "M12 2c-1.5 3-1.5 4.5 0 6M9 22h6M9 18h6M10 18a2 2 0 1 1 4 0" },
  { id: "headache", label: "Headache", icon: "M9 3a6 6 0 0 0-6 6c0 3 2 4 2 6h8c0-2 2-3 2-6a6 6 0 0 0-6-6ZM10 21h4M9 19h6" }
];

const DISEASE_META = {
  diabetes: {
    name: "Diabetes",
    color: "#2f6feb",
    icon: 'M6 3v18M6 8h12a3 3 0 0 1 0 6H6',
    tests: ["HbA1c Test", "Fasting Blood Sugar", "Urine Sugar Test"],
    specialist: "Endocrinologist"
  },
  heart: {
    name: "Heart Disease",
    color: "#e15252",
    icon: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z',
    tests: ["ECG", "Lipid Profile", "Echocardiogram"],
    specialist: "Cardiologist"
  },
  kidney: {
    name: "Kidney Disease",
    color: "#e8a13d",
    icon: 'M12 2C8 2 5 6 5 11c0 5 3 9 7 11 4-2 7-6 7-11 0-5-3-9-7-9Z',
    tests: ["Kidney Function Test", "Serum Creatinine", "Urine Analysis"],
    specialist: "Nephrologist"
  }
};

/* ---------------------------------------------------------------------- *
 * 2. RULE-BASED PREDICTION ENGINE
 *    Transparent, threshold-driven scoring — every point added is logged
 *    as a human-readable reason for the Explainable AI module.
 * ---------------------------------------------------------------------- */

function runPredictionEngine(patient) {
  const { age, gender, bp, glucose, bmi, cholesterol, symptoms } = patient;

  const reasons = {
    diabetes: [],
    heart: [],
    kidney: []
  };

  let diabetesScore = 0;
  let heartScore = 0;
  let kidneyScore = 0;

  // ---- Glucose ----
  if (glucose >= 126) {
    diabetesScore += 40;
    kidneyScore += 15;
    reasons.diabetes.push(`High Glucose level (${glucose} mg/dL, diabetic range ≥126) is the strongest driver of diabetes risk.`);
    reasons.kidney.push(`Elevated Glucose (${glucose} mg/dL) increases risk of diabetic kidney damage.`);
  } else if (glucose >= 100) {
    diabetesScore += 20;
    reasons.diabetes.push(`Borderline/Prediabetic Glucose level (${glucose} mg/dL) moderately raises diabetes risk.`);
  }

  // ---- BMI ----
  if (bmi >= 30) {
    diabetesScore += 20;
    heartScore += 10;
    reasons.diabetes.push(`High BMI (${bmi}, obese range ≥30) is linked to insulin resistance.`);
    reasons.heart.push(`High BMI (${bmi}) adds cardiovascular strain.`);
  } else if (bmi >= 25) {
    diabetesScore += 10;
    reasons.diabetes.push(`Overweight BMI (${bmi}) mildly raises diabetes risk.`);
  }

  // ---- Blood Pressure ----
  if (bp >= 140) {
    heartScore += 30;
    kidneyScore += 20;
    reasons.heart.push(`High Blood Pressure (${bp} mmHg systolic, ≥140) significantly raises heart disease risk.`);
    reasons.kidney.push(`High Blood Pressure (${bp} mmHg) is a major contributor to kidney damage.`);
  } else if (bp >= 130) {
    heartScore += 15;
    reasons.heart.push(`Elevated Blood Pressure (${bp} mmHg) moderately raises heart disease risk.`);
  }

  // ---- Cholesterol ----
  if (cholesterol >= 240) {
    heartScore += 30;
    reasons.heart.push(`High Cholesterol (${cholesterol} mg/dL, ≥240) strongly raises heart disease risk.`);
  } else if (cholesterol >= 200) {
    heartScore += 15;
    reasons.heart.push(`Borderline-high Cholesterol (${cholesterol} mg/dL) moderately raises heart disease risk.`);
  }

  // ---- Age ----
  if (age >= 60) {
    kidneyScore += 15;
    heartScore += 15;
    diabetesScore += 10;
    reasons.kidney.push(`Age Risk: patients aged ${age} (≥60) have naturally declining kidney function.`);
    reasons.heart.push(`Age Risk: patients aged ${age} (≥60) carry higher cardiovascular risk.`);
    reasons.diabetes.push(`Age Risk: patients aged ${age} (≥60) have higher diabetes prevalence.`);
  } else if (age >= 45) {
    heartScore += 10;
    diabetesScore += 5;
    reasons.heart.push(`Age Risk: patients aged ${age} (≥45) carry moderately higher cardiovascular risk.`);
    reasons.diabetes.push(`Age Risk: patients aged ${age} (≥45) have moderately higher diabetes prevalence.`);
  }

  // ---- Symptoms ----
  const symptomLabelMap = Object.fromEntries(SYMPTOMS.map((s) => [s.id, s.label]));

  const diabetesSymptoms = ["urination", "weightloss", "fatigue"];
  const heartSymptoms = ["chestpain", "breath", "dizziness"];
  const kidneySymptoms = ["fatigue", "urination", "headache"];

  const chosenDiabetes = symptoms.filter((s) => diabetesSymptoms.includes(s));
  const chosenHeart = symptoms.filter((s) => heartSymptoms.includes(s));
  const chosenKidney = symptoms.filter((s) => kidneySymptoms.includes(s));

  if (chosenDiabetes.includes("urination")) diabetesScore += 10;
  if (chosenDiabetes.includes("weightloss")) diabetesScore += 10;
  if (chosenDiabetes.includes("fatigue")) diabetesScore += 5;

  if (chosenHeart.includes("chestpain")) heartScore += 25;
  if (chosenHeart.includes("breath")) heartScore += 15;
  if (chosenHeart.includes("dizziness")) heartScore += 10;

  if (chosenKidney.includes("fatigue")) kidneyScore += 10;
  if (chosenKidney.includes("urination")) kidneyScore += 10;
  if (chosenKidney.includes("headache")) kidneyScore += 5;

  if (chosenDiabetes.length) {
    reasons.diabetes.push(`Selected Symptoms consistent with diabetes: ${chosenDiabetes.map((s) => symptomLabelMap[s]).join(", ")}.`);
  }
  if (chosenHeart.length) {
    reasons.heart.push(`Selected Symptoms consistent with heart disease: ${chosenHeart.map((s) => symptomLabelMap[s]).join(", ")}.`);
  }
  if (chosenKidney.length) {
    reasons.kidney.push(`Selected Symptoms consistent with kidney disease: ${chosenKidney.map((s) => symptomLabelMap[s]).join(", ")}.`);
  }

  // Fever is a general flag, mild contributor to all
  if (symptoms.includes("fever")) {
    heartScore += 2;
    kidneyScore += 2;
  }

  diabetesScore = Math.min(100, diabetesScore);
  heartScore = Math.min(100, heartScore);
  kidneyScore = Math.min(100, kidneyScore);

  const levelOf = (score) => (score >= 60 ? "high" : score >= 30 ? "medium" : "low");

  return {
    diabetes: { score: diabetesScore, level: levelOf(diabetesScore), reasons: reasons.diabetes },
    heart: { score: heartScore, level: levelOf(heartScore), reasons: reasons.heart },
    kidney: { score: kidneyScore, level: levelOf(kidneyScore), reasons: reasons.kidney }
  };
}

/* ---------------------------------------------------------------------- *
 * 3. DASHBOARD PAGE LOGIC (index.html)
 * ---------------------------------------------------------------------- */

if (document.getElementById("symptomGrid")) {
  initDashboard();
}

function initDashboard() {
  // ---- Header / user info ----
  const doctorName = sessionStorage.getItem("cdss_doctor_name") || "Dr. A. Sharma";
  const doctorRole = sessionStorage.getItem("cdss_doctor_role") || "Consulting Physician";
  document.getElementById("doctorNameLabel").textContent = doctorName;
  document.getElementById("doctorRoleLabel").textContent = doctorRole;
  document.getElementById("welcomeHeading").textContent = `Good day, ${doctorName.replace(/^Dr\.\s*/, "Dr. ")}`;
  const initials = doctorName.replace("Dr.", "").trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  document.getElementById("avatarInitials").textContent = initials || "DR";

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("cdss_logged_in");
    window.location.href = "login.html";
  });

  // ---- Live clock ----
  function tickClock() {
    const now = new Date();
    document.getElementById("liveClock").textContent = now.toLocaleTimeString();
    document.getElementById("liveDate").textContent = now.toLocaleDateString(undefined, {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ---- Stats (session-based) ----
  let sessionStats = { total: 0, high: 0, lastTime: null };

  // ---- Render symptom chips ----
  const grid = document.getElementById("symptomGrid");
  grid.innerHTML = SYMPTOMS.map(
    (s) => `
    <label class="symptom-chip" data-id="${s.id}">
      <input type="checkbox" value="${s.id}" />
      <span class="sy-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${s.icon}"/></svg>
      </span>
      <span class="sy-label">${s.label}</span>
      <span class="sy-check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </span>
    </label>`
  ).join("");

  grid.querySelectorAll(".symptom-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      if (e.target.tagName !== "INPUT") {
        const checkbox = chip.querySelector("input");
        checkbox.checked = !checkbox.checked;
      }
      chip.classList.toggle("checked", chip.querySelector("input").checked);
    });
  });

  function getSelectedSymptoms() {
    return Array.from(grid.querySelectorAll("input:checked")).map((i) => i.value);
  }

  // ---- Form validation helpers ----
  const fields = ["patientName", "patientAge", "patientGender", "bloodPressure", "glucose", "bmi", "cholesterol"];

  function validateForm() {
    let valid = true;
    fields.forEach((id) => {
      const el = document.getElementById(id);
      const wrapper = el.closest(".field");
      if (!el.value || (el.type === "number" && isNaN(parseFloat(el.value)))) {
        wrapper.classList.add("invalid");
        valid = false;
      } else {
        wrapper.classList.remove("invalid");
      }
    });
    return valid;
  }

  // ---- Reset ----
  document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("assessmentForm").reset();
    grid.querySelectorAll(".symptom-chip").forEach((c) => {
      c.classList.remove("checked");
      c.querySelector("input").checked = false;
    });
    fields.forEach((id) => document.getElementById(id).closest(".field").classList.remove("invalid"));
    document.getElementById("resultsSection").classList.remove("show");
    showToast("Form has been reset.");
  });

  // ---- Predict ----
  document.getElementById("predictBtn").addEventListener("click", () => {
    if (!validateForm()) {
      showToast("Please fill all required fields.");
      document.getElementById("patientForm").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const patient = {
      name: document.getElementById("patientName").value.trim(),
      age: parseInt(document.getElementById("patientAge").value, 10),
      gender: document.getElementById("patientGender").value,
      bp: parseFloat(document.getElementById("bloodPressure").value),
      glucose: parseFloat(document.getElementById("glucose").value),
      bmi: parseFloat(document.getElementById("bmi").value),
      cholesterol: parseFloat(document.getElementById("cholesterol").value),
      symptoms: getSelectedSymptoms()
    };

    const prediction = runPredictionEngine(patient);
    renderResults(patient, prediction);

    // Update stats
    sessionStats.total += 1;
    if (["diabetes", "heart", "kidney"].some((k) => prediction[k].level === "high")) {
      sessionStats.high += 1;
    }
    sessionStats.lastTime = new Date();
    document.getElementById("statTotal").textContent = sessionStats.total;
    document.getElementById("statHigh").textContent = sessionStats.high;
    document.getElementById("statLastTime").textContent = sessionStats.lastTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Persist for report.html
    const reportData = {
      patient,
      prediction,
      timestamp: new Date().toISOString(),
      doctorName
    };
    localStorage.setItem("cdss_report_data", JSON.stringify(reportData));

    document.getElementById("resultsSection").classList.add("show");
    document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Risk assessment generated successfully.");
  });

  document.getElementById("generateReportBtn").addEventListener("click", () => {
    window.open("report.html", "_blank");
  });

  document.getElementById("printQuickBtn").addEventListener("click", () => {
    window.open("report.html", "_blank");
  });
}

/* ---- Render disease cards + circular indicators + progress bars ---- */
function renderResults(patient, prediction) {
  document.getElementById("sumPatientName").textContent = patient.name;
  document.getElementById("sumAgeGender").textContent = `${patient.age} yrs · ${patient.gender}`;

  const overallLevel = ["diabetes", "heart", "kidney"].some((k) => prediction[k].level === "high")
    ? "High"
    : ["diabetes", "heart", "kidney"].some((k) => prediction[k].level === "medium")
    ? "Medium"
    : "Low";
  const overallColorVar = overallLevel === "High" ? "var(--risk-high)" : overallLevel === "Medium" ? "var(--risk-medium)" : "var(--risk-low)";
  const sumOverall = document.getElementById("sumOverallRisk");
  sumOverall.textContent = overallLevel + " Risk";
  sumOverall.style.color = overallColorVar;

  document.getElementById("sumTimestamp").textContent = new Date().toLocaleString();

  const diseaseGrid = document.getElementById("diseaseGrid");
  diseaseGrid.innerHTML = Object.keys(DISEASE_META)
    .map((key) => buildDiseaseCardHTML(key, prediction[key]))
    .join("");

  // Animate circular rings + progress bars after paint
  requestAnimationFrame(() => {
    Object.keys(DISEASE_META).forEach((key) => {
      const score = prediction[key].score;
      const circle = document.getElementById(`ring-${key}`);
      const fill = document.getElementById(`bar-${key}`);
      if (circle) {
        const circumference = 2 * Math.PI * 58;
        const offset = circumference - (score / 100) * circumference;
        circle.style.strokeDasharray = `${circumference}`;
        circle.style.strokeDashoffset = `${offset}`;
      }
      if (fill) {
        fill.style.width = `${score}%`;
      }
    });
  });
}

function buildDiseaseCardHTML(key, result) {
  const meta = DISEASE_META[key];
  const circumference = 2 * Math.PI * 58;

  const reasonsHTML = result.reasons.length
    ? result.reasons
        .map(
          (r) => `
      <div class="xai-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <span>${r}</span>
      </div>`
        )
        .join("")
    : `<div class="xai-empty">No significant risk factors detected for this condition.</div>`;

  const testsHTML = meta.tests
    .map(
      (t) => `
      <div class="test-chip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v6L4 20a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L15 8V2"/><path d="M9 15h6"/></svg>
        ${t}
      </div>`
    )
    .join("");

  const showTestsAndSpecialist = result.level !== "low";

  return `
    <div class="disease-card glass">
      <div class="dc-top">
        <div class="dc-name">
          <span class="dc-icon" style="background:${meta.color};">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${meta.icon}"/></svg>
          </span>
          ${meta.name}
        </div>
        <span class="risk-badge ${result.level}">${result.level.toUpperCase()} RISK</span>
      </div>

      <div class="circular-wrap">
        <svg viewBox="0 0 140 140">
          <circle class="cw-track" cx="70" cy="70" r="58"></circle>
          <circle class="cw-value" id="ring-${key}" cx="70" cy="70" r="58"
            stroke="${meta.color}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}"></circle>
        </svg>
        <div class="cw-center">
          <div class="cw-score">${result.score}%</div>
          <div class="cw-percent">RISK SCORE</div>
        </div>
      </div>

      <div class="progress-track"><div class="progress-fill ${result.level}" id="bar-${key}"></div></div>
      <div class="progress-label"><span>0%</span><span>100%</span></div>

      <div style="margin-top:20px;">
        <div style="font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:8px;">Explainable AI — Why this score</div>
        <div class="xai-list">${reasonsHTML}</div>
      </div>

      ${
        showTestsAndSpecialist
          ? `
      <div style="margin-top:20px;">
        <div style="font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:8px;">Recommended Tests</div>
        <div class="tests-list">${testsHTML}</div>
      </div>

      <div class="specialist-banner">
        <div class="sp-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="sp-text">
          <div class="sp-label">Refer to</div>
          <div class="sp-name">${meta.specialist}</div>
        </div>
      </div>`
          : `<div class="xai-empty" style="margin-top:16px;">Risk is low — routine monitoring recommended, no urgent tests flagged.</div>`
      }
    </div>
  `;
}

/* ---------------------------------------------------------------------- *
 * 4. TOAST
 * ---------------------------------------------------------------------- */
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  document.getElementById("toastText").textContent = message;
  toast.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

/* ---------------------------------------------------------------------- *
 * 5. REPORT PAGE LOGIC (report.html)
 * ---------------------------------------------------------------------- */
function renderReportPage() {
  const raw = localStorage.getItem("cdss_report_data");
  const sheet = document.getElementById("reportSheet");
  const emptyState = document.getElementById("noReportState");
  if (!raw) {
    emptyState.style.display = "block";
    sheet.style.display = "none";
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    emptyState.style.display = "block";
    sheet.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  sheet.style.display = "block";

  const { patient, prediction, timestamp, doctorName } = data;
  const dt = new Date(timestamp);
  const reportId = "CDSS-" + dt.getTime().toString().slice(-8);

  document.getElementById("repId").textContent = `Report #${reportId}`;
  document.getElementById("repDateTime").textContent = dt.toLocaleString();

  document.getElementById("repPatientGrid").innerHTML = `
    ${reportGridItem("Full Name", patient.name)}
    ${reportGridItem("Age", `${patient.age} years`)}
    ${reportGridItem("Gender", patient.gender)}
    ${reportGridItem("Attending Doctor", doctorName)}
  `;

  document.getElementById("repVitalsGrid").innerHTML = `
    ${reportGridItem("Blood Pressure", `${patient.bp} mmHg`)}
    ${reportGridItem("Glucose Level", `${patient.glucose} mg/dL`)}
    ${reportGridItem("BMI", `${patient.bmi} kg/m²`)}
    ${reportGridItem("Cholesterol", `${patient.cholesterol} mg/dL`)}
  `;

  const symptomLabelMap = Object.fromEntries(SYMPTOMS.map((s) => [s.id, s.label]));
  document.getElementById("repSymptoms").textContent = patient.symptoms.length
    ? patient.symptoms.map((s) => symptomLabelMap[s]).join(", ")
    : "No symptoms reported.";

  document.getElementById("repDiseaseRows").innerHTML = Object.keys(DISEASE_META)
    .map((key) => {
      const meta = DISEASE_META[key];
      const r = prediction[key];
      return `
      <div class="report-disease-row">
        <div class="rd-name">
          <span style="width:10px;height:10px;border-radius:50%;display:inline-block;background:${meta.color};"></span>
          ${meta.name}
          <span class="rd-score">Score: ${r.score}/100</span>
        </div>
        <span class="risk-badge ${r.level}">${r.level.toUpperCase()} RISK</span>
      </div>`;
    })
    .join("");

  const allReasons = [];
  Object.keys(DISEASE_META).forEach((key) => {
    prediction[key].reasons.forEach((r) => allReasons.push(`[${DISEASE_META[key].name}] ${r}`));
  });
  document.getElementById("repXaiList").innerHTML = allReasons.length
    ? allReasons.map((r) => `<li>${r}</li>`).join("")
    : `<li>No significant risk factors were identified across the modeled conditions.</li>`;

  const testsColsHTML = Object.keys(DISEASE_META)
    .filter((key) => prediction[key].level !== "low")
    .map((key) => {
      const meta = DISEASE_META[key];
      return `
      <div>
        <h4>${meta.name}</h4>
        <ul>${meta.tests.map((t) => `<li>• ${t}</li>`).join("")}</ul>
      </div>`;
    })
    .join("");
  document.getElementById("repTestsCols").innerHTML =
    testsColsHTML || `<div style="font-size:12.5px;color:var(--text-muted);">No urgent diagnostic tests recommended — all risk levels are low.</div>`;

  const specialistsHTML = Object.keys(DISEASE_META)
    .filter((key) => prediction[key].level !== "low")
    .map((key) => `<span class="spec-pill">${DISEASE_META[key].specialist}</span>`)
    .join("");
  document.getElementById("repSpecialists").innerHTML =
    specialistsHTML || `<span style="font-size:12.5px;color:var(--text-muted);">Routine follow-up with primary care physician.</span>`;
}

function reportGridItem(label, value) {
  return `
    <div class="rg-item">
      <div class="rg-label">${label}</div>
      <div class="rg-value">${value}</div>
    </div>`;
}
