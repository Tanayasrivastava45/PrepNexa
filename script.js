
/* =====================================================
   PREPNEXA
   Main JavaScript
   Authentication + Dashboard + Assessments + AI Coach
===================================================== */


/* =====================================================
   1. CONFIGURATION
===================================================== */

// Supabase configuration
const SUPABASE_URL = "https://grizmzdmuboifbofvefk.supabase.co";

// Replace this placeholder with your Supabase publishable key.
// Never use your Supabase service-role or secret key here.
const SUPABASE_KEY = "sb_publishable_YCcLKsCGQo5JHv2Y7WQzGg_Gz79S6yl";
// Your Render backend URL
// Change this only if your Render service has a different URL.
const API_BASE_URL = "https://prepnexa-api.onrender.com";

let supabaseClient = null;
let currentUser = null;
let authMode = "login";
let currentAssessment = null;
let chatHistory = [];
let currentFlashcardIndex = 0;
let flashcardAnswerVisible = false;

let scores = {
    dsa: 0,
    cs_core: 0,
    verbal: 0,
    aptitude: 0
};

let charts = {
    readiness: null,
    performance: null,
    learning: null
};

const STORAGE_KEYS = {
    scores: "prepnexa_scores",
    study: "prepnexa_study_tasks",
    mistakes: "prepnexa_mistakes",
    flashcards: "prepnexa_flashcards",
    revision: "prepnexa_revision",
    theme: "prepnexa_theme",
    profilePhoto: "prepnexa_profile_photo"
};


/* =====================================================
   2. ASSESSMENT QUESTIONS
===================================================== */

const assessmentData = {

    dsa: {
        title: "Data Structures & Algorithms",
        questions: [
            {
                question: "Which data structure follows LIFO?",
                options: ["Queue", "Stack", "Tree", "Graph"],
                answer: 1
            },
            {
                question: "What is the average time complexity of binary search?",
                options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
                answer: 2
            },
            {
                question: "Which data structure is commonly used in BFS?",
                options: ["Stack", "Queue", "Heap", "Array"],
                answer: 1
            }
        ]
    },

    verbal: {
        title: "Verbal Ability",
        questions: [
            {
                question: "Choose the synonym of 'Abundant'.",
                options: ["Scarce", "Plentiful", "Weak", "Limited"],
                answer: 1
            },
            {
                question: "Choose the grammatically correct sentence.",
                options: [
                    "She go to college.",
                    "She going to college.",
                    "She goes to college.",
                    "She gone to college."
                ],
                answer: 2
            },
            {
                question: "Choose the antonym of 'Expand'.",
                options: ["Increase", "Extend", "Contract", "Enlarge"],
                answer: 2
            }
        ]
    },

    aptitude: {
        title: "Quantitative Aptitude",
        questions: [
            {
                question: "What is 20% of 250?",
                options: ["25", "40", "50", "60"],
                answer: 2
            },
            {
                question: "A train travels 120 km in 2 hours. What is its speed?",
                options: ["40 km/h", "50 km/h", "60 km/h", "80 km/h"],
                answer: 2
            },
            {
                question: "What is the average of 10, 20 and 30?",
                options: ["15", "20", "25", "30"],
                answer: 1
            }
        ]
    },

    oops: {
        title: "OOPs",
        questions: [
            {
                question: "Which concept allows the same function name with different parameters?",
                options: ["Inheritance", "Overloading", "Encapsulation", "Abstraction"],
                answer: 1
            },
            {
                question: "Which OOP concept hides internal implementation?",
                options: ["Abstraction", "Inheritance", "Polymorphism", "Compilation"],
                answer: 0
            },
            {
                question: "Which keyword is commonly used to create an object in Java?",
                options: ["class", "void", "new", "static"],
                answer: 2
            },
            {
                question: "Which concept allows a class to acquire properties of another class?",
                options: ["Encapsulation", "Inheritance", "Abstraction", "Overloading"],
                answer: 1
            }
        ]
    },

    dbms: {
        title: "Database Management Systems",
        questions: [
            {
                question: "What does SQL stand for?",
                options: [
                    "Structured Query Language",
                    "Simple Question Language",
                    "System Query Logic",
                    "Structured Quick Logic"
                ],
                answer: 0
            },
            {
                question: "Which key uniquely identifies a row?",
                options: ["Foreign Key", "Primary Key", "Candidate Key", "Composite Key"],
                answer: 1
            },
            {
                question: "Which command retrieves data from a database?",
                options: ["INSERT", "UPDATE", "SELECT", "DELETE"],
                answer: 2
            },
            {
                question: "Which normal form removes partial dependency?",
                options: ["1NF", "2NF", "3NF", "BCNF"],
                answer: 1
            }
        ]
    },

    os: {
        title: "Operating Systems",
        questions: [
            {
                question: "Which of these is an operating system?",
                options: ["MySQL", "Linux", "HTML", "Python"],
                answer: 1
            },
            {
                question: "What is a process?",
                options: [
                    "A program in execution",
                    "A storage device",
                    "A programming language",
                    "A compiler"
                ],
                answer: 0
            },
            {
                question: "Which scheduling algorithm uses time slices?",
                options: ["FCFS", "SJF", "Round Robin", "Priority only"],
                answer: 2
            },
            {
                question: "What is deadlock?",
                options: [
                    "A type of memory",
                    "Processes waiting indefinitely for resources",
                    "A file system",
                    "A CPU register"
                ],
                answer: 1
            }
        ]
    },

    cn: {
        title: "Computer Networks",
        questions: [
            {
                question: "How many layers are there in the OSI model?",
                options: ["4", "5", "7", "8"],
                answer: 2
            },
            {
                question: "Which protocol is used to transfer web pages securely?",
                options: ["FTP", "HTTP", "HTTPS", "SMTP"],
                answer: 2
            },
            {
                question: "What does IP stand for?",
                options: [
                    "Internet Protocol",
                    "Internal Process",
                    "Internet Program",
                    "Input Protocol"
                ],
                answer: 0
            },
            {
                question: "Which device connects different networks?",
                options: ["Hub", "Router", "Repeater", "Keyboard"],
                answer: 1
            }
        ]
    }
};


/* =====================================================
   3. DEFAULT STUDY TASKS AND FLASHCARDS
===================================================== */

const defaultStudyTasks = [
    { id: 1, name: "Practice 2 DSA problems", completed: false },
    { id: 2, name: "Revise one OOPs concept", completed: false },
    { id: 3, name: "Practice 10 aptitude questions", completed: false },
    { id: 4, name: "Revise DBMS notes", completed: false },
    { id: 5, name: "Practice one SQL query", completed: false },
    { id: 6, name: "Revise Computer Networks", completed: false }
];

const defaultFlashcards = [
    {
        question: "What is the time complexity of binary search?",
        answer: "O(log n)"
    },
    {
        question: "What is encapsulation?",
        answer: "Wrapping data and methods into a single unit."
    },
    {
        question: "What is a primary key?",
        answer: "A column or set of columns that uniquely identifies a row."
    },
    {
        question: "What is deadlock?",
        answer: "A situation where processes wait indefinitely for resources."
    },
    {
        question: "What is inheritance?",
        answer: "A mechanism through which one class acquires another class's properties."
    },
    {
        question: "What is normalization?",
        answer: "Organizing database tables to reduce redundancy."
    },
    {
        question: "What is an IP address?",
        answer: "A logical address used to identify a device on a network."
    },
    {
        question: "What is polymorphism?",
        answer: "The ability of one interface or method to have multiple forms."
    }
];


/* =====================================================
   4. HELPER FUNCTIONS
===================================================== */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }
}

function showMessage(id, message, type = "info") {
    const element = getElement(id);

    if (!element) return;

    element.textContent = message;
    element.style.color =
        type === "error" ? "#ff647c" :
        type === "success" ? "#20c9a6" :
        "";
}

function getStoredData(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
        console.error("Storage error:", error);
        return fallback;
    }
}

function saveStoredData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error("Could not save local data:", error);
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


/* =====================================================
   5. SUPABASE INITIALIZATION
===================================================== */

function initializeSupabase() {
    if (!window.supabase) {
        console.error("Supabase library was not loaded.");
        return false;
    }

    if (
        !SUPABASE_KEY ||
        SUPABASE_KEY === "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE"
    ) {
        console.warn("Add your Supabase publishable key in script.js.");
        return false;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

        return true;

    } catch (error) {
        console.error("Supabase initialization failed:", error);
        return false;
    }
}


/* =====================================================
   6. AUTHENTICATION SCREEN
===================================================== */

function showAuthForm(mode = "login") {
    authMode = mode;

    const signupFields = getElement("signupFields");
    const loginTab = getElement("loginTab");
    const signupTab = getElement("signupTab");
    const submitButton = getElement("authSubmitBtn");

    if (signupFields) {
        signupFields.style.display =
            mode === "signup" ? "block" : "none";
    }

    if (loginTab) {
        loginTab.classList.toggle("active", mode === "login");
    }

    if (signupTab) {
        signupTab.classList.toggle("active", mode === "signup");
    }

    if (submitButton) {
        submitButton.textContent =
            mode === "signup" ? "Create Account" : "Login";
    }

    showMessage("authMessage", "");
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage(
            "authMessage",
            "Please add your Supabase publishable key in script.js.",
            "error"
        );
        return;
    }

    const email = getElement("authEmail")?.value.trim();
    const password = getElement("authPassword")?.value;
    const name = getElement("authName")?.value.trim();
    const role = getElement("authRole")?.value || "Student";

    if (!email || !password) {
        showMessage("authMessage", "Please enter email and password.", "error");
        return;
    }

    if (password.length < 6) {
        showMessage(
            "authMessage",
            "Password must contain at least 6 characters.",
            "error"
        );
        return;
    }

    const submitButton = getElement("authSubmitBtn");

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Please wait...";
    }

    try {
        if (authMode === "signup") {
            if (!name) {
                throw new Error("Please enter your name.");
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role
                    }
                }
            });

            if (error) throw error;

            if (data.session && data.user) {
                currentUser = data.user;
                await ensureProfileExists(name, role);
                await openApplication();
            } else {
                showMessage(
                    "authMessage",
                    "Account created! Please check your email and confirm your account before logging in.",
                    "success"
                );
            }

        } else {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            currentUser = data.user;
            await ensureProfileExists();
            await openApplication();
        }

    } catch (error) {
        console.error("Authentication error:", error);

        showMessage(
            "authMessage",
            error.message || "Authentication failed. Please try again.",
            "error"
        );

    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                authMode === "signup" ? "Create Account" : "Login";
        }
    }
}


/* =====================================================
   7. PROFILE AND SESSION
===================================================== */

async function ensureProfileExists(name = "", role = "Student") {
    if (!supabaseClient || !currentUser) return;

    const profile = {
        id: currentUser.id,
        name:
            name ||
            currentUser.user_metadata?.name ||
            currentUser.email?.split("@")[0] ||
            "Student",
        role:
            role ||
            currentUser.user_metadata?.role ||
            "Student"
    };

    const { error } = await supabaseClient
        .from("profiles")
        .upsert(profile, { onConflict: "id" });

    if (error) {
        console.warn("Profile save warning:", error.message);
    }
}

async function loadProfile() {
    if (!supabaseClient || !currentUser) return;

    try {
        const { data, error } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

        if (error) throw error;

        const name =
            data?.name ||
            currentUser.user_metadata?.name ||
            currentUser.email?.split("@")[0] ||
            "Student";

        setText("userName", name);
        setText("profileName", name);
        setText("profileEmail", currentUser.email || "");
        setText("profileRole", data?.role || "Student");

        const profileNameInput = getElement("profileNameInput");
        if (profileNameInput) profileNameInput.value = name;

        const roleInput = getElement("profileRoleInput");
        if (roleInput) roleInput.value = data?.role || "Student";

        const savedPhoto = localStorage.getItem(STORAGE_KEYS.profilePhoto);

        if (savedPhoto) {
            const photo = getElement("profilePhoto");
            if (photo) photo.src = savedPhoto;
        }

    } catch (error) {
        console.error("Profile loading error:", error);
    }
}

async function openApplication() {
    const authScreen = getElement("authScreen");
    const app = getElement("app");

    if (authScreen) authScreen.style.display = "none";
    if (app) app.style.display = "flex";

    await loadProfile();
    await loadScores();
    await loadStudyTasks();
    await loadMistakes();
    await loadDashboard();

    showPage("dashboard");
}

async function checkAuthentication() {
    if (!supabaseClient) return;

    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        currentUser = data.session?.user || null;

        if (currentUser) {
            await ensureProfileExists();
            await openApplication();
        }

    } catch (error) {
        console.error("Session check failed:", error);
    }
}

async function logoutUser() {
    if (supabaseClient) {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Logout error:", error);
        }
    }

    currentUser = null;
    chatHistory = [];

    const app = getElement("app");
    const authScreen = getElement("authScreen");

    if (app) app.style.display = "none";
    if (authScreen) authScreen.style.display = "flex";

    showAuthForm("login");
}


/* =====================================================
   8. PAGE NAVIGATION
===================================================== */

const pageTitles = {
    dashboard: "Dashboard",
    assessments: "Assessments",
    readiness: "Placement Readiness",
    studyPlan: "Study Plan",
    flashcards: "Flashcards",
    revision: "Revision Queue",
    mistakes: "Mistake Notebook",
    diagnosis: "Skill Diagnosis",
    aiCoach: "PrepNexa AI Coach",
    progress: "My Progress",
    profile: "My Profile",
    preferences: "Preferences"
};

function showPage(pageId, clickedElement = null) {
    if (pageId === "csCore") {
        pageId = "assessments";

        setTimeout(() => {
            getElement("csCore")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 100);
    }

    const pages = document.querySelectorAll(".page");

    pages.forEach(page => page.classList.remove("active"));

    let selectedPage = getElement(pageId);

    if (!selectedPage) {
        selectedPage = getElement(`${pageId}Page`);
    }

    if (selectedPage) {
        selectedPage.classList.add("active");
    } else {
        console.warn("Page not found:", pageId);
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    if (clickedElement) {
        clickedElement.classList.add("active");
    } else {
        const navItem = document.querySelector(
            `.nav-item[data-page="${pageId}"]`
        );

        if (navItem) navItem.classList.add("active");
    }

    setText("pageTitle", pageTitles[pageId] || "PrepNexa");

    if (pageId === "readiness") {
        calculateReadiness();
        renderCharts();
    }

    if (pageId === "progress") {
        renderCharts();
    }

    if (pageId === "flashcards") {
        renderFlashcard();
    }

    if (pageId === "revision") {
        renderRevisionQueue();
    }

    if (pageId === "mistakes") {
        renderMistakes();
    }
}


/* =====================================================
   9. ASSESSMENT SYSTEM
===================================================== */

function startAssessment(type) {
    const assessment = assessmentData[type];

    if (!assessment) {
        alert("Assessment not found.");
        return;
    }

    currentAssessment = type;

    const container = getElement("assessmentContainer");
    const result = getElement("assessmentResult");

    if (!container) {
        alert("Assessment container was not found in index.html.");
        return;
    }

    if (result) result.innerHTML = "";

    let html = `
        <div class="content-card">
            <h2>${escapeHTML(assessment.title)}</h2>
            <p>Answer all questions and submit your assessment.</p>
            <form id="activeAssessmentForm">
    `;

    assessment.questions.forEach((question, index) => {
        html += `
            <div class="assessment-question">
                <h3>${index + 1}. ${escapeHTML(question.question)}</h3>
        `;

        question.options.forEach((option, optionIndex) => {
            html += `
                <label>
                    <input
                        type="radio"
                        name="question${index}"
                        value="${optionIndex}"
                    >
                    ${escapeHTML(option)}
                </label>
            `;
        });

        html += `</div>`;
    });

    html += `
                <button type="submit" class="primary-btn">
                    Submit Assessment
                </button>
            </form>
        </div>
    `;

    container.innerHTML = html;

    getElement("activeAssessmentForm")
        ?.addEventListener("submit", submitAssessment);

    container.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

async function submitAssessment(event) {
    event.preventDefault();

    if (!currentAssessment) return;

    const assessment = assessmentData[currentAssessment];
    const form = getElement("activeAssessmentForm");

    if (!form) return;

    let correct = 0;
    let unanswered = 0;

    assessment.questions.forEach((question, index) => {
        const selected = form.querySelector(
            `input[name="question${index}"]:checked`
        );

        if (!selected) {
            unanswered++;
            return;
        }

        if (Number(selected.value) === question.answer) {
            correct++;
        }
    });

    if (unanswered > 0) {
        alert(`Please answer all ${unanswered} remaining question(s).`);
        return;
    }

    const total = assessment.questions.length;
    const percentage = Math.round((correct / total) * 100);

    if (currentAssessment === "oops" ||
        currentAssessment === "dbms" ||
        currentAssessment === "os" ||
        currentAssessment === "cn") {

        await saveCoreScore(currentAssessment, percentage);

    } else {
        scores[currentAssessment] = percentage;
        saveStoredData(STORAGE_KEYS.scores, scores);
        await saveAssessmentScore(currentAssessment, percentage);
    }

    const result = getElement("assessmentResult");

    if (result) {
        result.innerHTML = `
            <div class="content-card">
                <h2>Assessment Completed!</h2>
                <h1 style="color:var(--secondary);font-size:38px;">
                    ${percentage}%
                </h1>
                <p>You answered ${correct} out of ${total} correctly.</p>
                <p>${getPerformanceMessage(percentage)}</p>
                <button class="primary-btn" onclick="calculateReadiness()">
                    Update Readiness
                </button>
            </div>
        `;
    }

    form.innerHTML = `
        <h3>Assessment submitted successfully.</h3>
        <p>Your score has been recorded.</p>
    `;

    await loadScores();
    await loadDashboard();
}

function getPerformanceMessage(score) {
    if (score >= 80) return "Excellent work! Keep it up.";
    if (score >= 60) return "Good progress. Keep practicing.";
    if (score >= 40) return "You are improving. Revise weak topics.";
    return "Let's strengthen your fundamentals. Practice regularly.";
}

async function saveAssessmentScore(type, score) {
    if (!supabaseClient || !currentUser) return;

    try {
        const row = {
            user_id: currentUser.id,
            [`${type}_score`]: score
        };

        const { error } = await supabaseClient
            .from("assessment_scores")
            .insert(row);

        if (error) throw error;

    } catch (error) {
        console.error("Assessment score save error:", error.message);
    }
}

async function saveCoreScore(subject, score) {
    const key = `prepnexa_${subject}_score`;

    const coreScores = getStoredData(key, []);
    coreScores.push(score);

    saveStoredData(key, coreScores);

    const average = Math.round(
        ["oops", "dbms", "os", "cn"].reduce((sum, item) => {
            const values = getStoredData(`prepnexa_${item}_score`, []);
            const latest = values.length
                ? values[values.length - 1]
                : 0;

            return sum + latest;
        }, 0) / 4
    );

    scores.cs_core = average;
    saveStoredData(STORAGE_KEYS.scores, scores);

    if (supabaseClient && currentUser) {
        try {
            const { error } = await supabaseClient
                .from("assessment_scores")
                .insert({
                    user_id: currentUser.id,
                    cs_core_score: average
                });

            if (error) throw error;

        } catch (error) {
            console.error("CS Core score save error:", error.message);
        }
    }
}


/* =====================================================
   10. LOAD SCORES AND READINESS
===================================================== */

async function loadScores() {
    scores = getStoredData(STORAGE_KEYS.scores, {
        dsa: 0,
        cs_core: 0,
        verbal: 0,
        aptitude: 0
    });

    if (!supabaseClient || !currentUser) {
        updateScoreDisplay();
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("assessment_scores")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: true });

        if (error) throw error;

        if (data && data.length) {
            data.forEach(row => {
                ["dsa", "cs_core", "verbal", "aptitude"].forEach(key => {
                    const column = `${key}_score`;

                    if (row[column] !== null && row[column] !== undefined) {
                        scores[key] = Number(row[column]);
                    }
                });
            });

            saveStoredData(STORAGE_KEYS.scores, scores);
        }

    } catch (error) {
        console.error("Could not load scores:", error.message);
    }

    updateScoreDisplay();
}

function updateScoreDisplay() {
    setText("dsaScore", `${scores.dsa || 0}%`);
    setText("csCoreScore", `${scores.cs_core || 0}%`);
    setText("verbalScore", `${scores.verbal || 0}%`);
    setText("aptitudeScore", `${scores.aptitude || 0}%`);
}

function calculateReadiness() {
    const sde =
        scores.dsa * 0.40 +
        scores.cs_core * 0.25 +
        scores.verbal * 0.15 +
        scores.aptitude * 0.20;

    const aiml =
        scores.dsa * 0.30 +
        scores.cs_core * 0.25 +
        scores.verbal * 0.15 +
        scores.aptitude * 0.30;

    const data =
        scores.dsa * 0.15 +
        scores.cs_core * 0.25 +
        scores.verbal * 0.20 +
        scores.aptitude * 0.40;

    const results = {
        sde: Math.round(sde),
        aiml: Math.round(aiml),
        data: Math.round(data)
    };

    setText("sdeReadiness", `${results.sde}%`);
    setText("aimlReadiness", `${results.aiml}%`);
    setText("dataReadiness", `${results.data}%`);

    const overall = Math.round(
        (results.sde + results.aiml + results.data) / 3
    );

    setText("readinessScore", `${overall}%`);

    const fill = getElement("readinessProgressFill");

    if (fill) fill.style.width = `${overall}%`;

    saveStoredData("prepnexa_readiness", results);

    renderCharts();

    return results;
}


/* =====================================================
   11. DASHBOARD
===================================================== */

async function loadDashboard() {
    updateScoreDisplay();
    calculateReadiness();

    const overall = Math.round(
        (scores.dsa + scores.cs_core + scores.verbal + scores.aptitude) / 4
    );

    setText("overallScore", `${overall}%`);

    const tasks = getStoredData(
        STORAGE_KEYS.study,
        defaultStudyTasks
    );

    const completed = tasks.filter(task => task.completed).length;

    setText("completedTasks", completed);
    setText("totalTasks", tasks.length);

    const percent = tasks.length
        ? Math.round((completed / tasks.length) * 100)
        : 0;

    setText("studyProgressPercent", `${percent}%`);

    const fill = getElement("studyProgressFill");

    if (fill) fill.style.width = `${percent}%`;
}


/* =====================================================
   12. CHARTS
===================================================== */

function renderCharts() {
    if (!window.Chart) return;

    const readinessCanvas = getElement("readinessChart");

    if (readinessCanvas) {
        if (charts.readiness) charts.readiness.destroy();

        const readiness = getStoredData(
            "prepnexa_readiness",
            { sde: 0, aiml: 0, data: 0 }
        );

        charts.readiness = new Chart(readinessCanvas, {
            type: "bar",
            data: {
                labels: ["SDE", "AIML", "DATA"],
                datasets: [{
                    label: "Readiness %",
                    data: [
                        readiness.sde,
                        readiness.aiml,
                        readiness.data
                    ],
                    backgroundColor: [
                        "#7967ff",
                        "#20c9a6",
                        "#ffb454"
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    const performanceCanvas = getElement("performanceChart");

    if (performanceCanvas) {
        if (charts.performance) charts.performance.destroy();

        charts.performance = new Chart(performanceCanvas, {
            type: "radar",
            data: {
                labels: ["DSA", "CS Core", "Verbal", "Aptitude"],
                datasets: [{
                    label: "Your Performance",
                    data: [
                        scores.dsa,
                        scores.cs_core,
                        scores.verbal,
                        scores.aptitude
                    ],
                    backgroundColor: "rgba(121,103,255,0.2)",
                    borderColor: "#7967ff",
                    pointBackgroundColor: "#20c9a6"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    const learningCanvas = getElement("learningChart");

    if (learningCanvas) {
        if (charts.learning) charts.learning.destroy();

        const tasks = getStoredData(
            STORAGE_KEYS.study,
            defaultStudyTasks
        );

        const completed = tasks.filter(task => task.completed).length;
        const pending = tasks.length - completed;

        charts.learning = new Chart(learningCanvas, {
            type: "doughnut",
            data: {
                labels: ["Completed", "Pending"],
                datasets: [{
                    data: [completed, pending],
                    backgroundColor: ["#20c9a6", "#7967ff"]
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}


/* =====================================================
   13. STUDY PLAN
===================================================== */

async function loadStudyTasks() {
    let tasks = getStoredData(
        STORAGE_KEYS.study,
        defaultStudyTasks
    );

    if (supabaseClient && currentUser) {
        try {
            const { data, error } = await supabaseClient
                .from("study_progress")
                .select("*")
                .eq("user_id", currentUser.id);

            if (error) throw error;

            if (data && data.length) {
                tasks = data.map((task, index) => ({
                    id: task.id || index + 1,
                    name: task.task_name,
                    completed: Boolean(task.is_completed),
                    databaseId: task.id
                }));

                saveStoredData(STORAGE_KEYS.study, tasks);
            }

        } catch (error) {
            console.warn("Study plan loading warning:", error.message);
        }
    }

    renderStudyTasks(tasks);
}

function renderStudyTasks(tasks = null) {
    if (!tasks) {
        tasks = getStoredData(
            STORAGE_KEYS.study,
            defaultStudyTasks
        );
    }

    const container = getElement("studyTasks");

    if (!container) return;

    container.innerHTML = tasks.map(task => `
        <div class="study-task">
            <input
                type="checkbox"
                ${task.completed ? "checked" : ""}
                onchange="toggleStudyTask(${Number(task.id)})"
            >
            <span>${escapeHTML(task.name)}</span>
        </div>
    `).join("");

    const completed = tasks.filter(task => task.completed).length;
    const percent = tasks.length
        ? Math.round((completed / tasks.length) * 100)
        : 0;

    setText("studyProgressPercent", `${percent}%`);

    const fill = getElement("studyProgressFill");
    if (fill) fill.style.width = `${percent}%`;

    renderCharts();
}

async function toggleStudyTask(taskId) {
    const tasks = getStoredData(
        STORAGE_KEYS.study,
        defaultStudyTasks
    );

    const task = tasks.find(item => Number(item.id) === Number(taskId));

    if (!task) return;

    task.completed = !task.completed;

    saveStoredData(STORAGE_KEYS.study, tasks);
    renderStudyTasks(tasks);
    loadDashboard();

    if (supabaseClient && currentUser) {
        try {
            const { error } = await supabaseClient
                .from("study_progress")
                .insert({
                    user_id: currentUser.id,
                    task_name: task.name,
                    is_completed: task.completed
                });

            if (error) {
                console.warn("Study progress save warning:", error.message);
            }

        } catch (error) {
            console.warn(error);
        }
    }
}


/* =====================================================
   14. FLASHCARDS
===================================================== */

function getFlashcards() {
    return getStoredData(
        STORAGE_KEYS.flashcards,
        defaultFlashcards
    );
}

function renderFlashcard() {
    const cards = getFlashcards();

    if (!cards.length) {
        setText("flashcardQuestion", "No flashcards available.");
        setText("flashcardAnswer", "");
        return;
    }

    currentFlashcardIndex =
        currentFlashcardIndex % cards.length;

    const card = cards[currentFlashcardIndex];

    setText("flashcardQuestion", card.question);

    setText(
        "flashcardAnswer",
        flashcardAnswerVisible ? card.answer : "Tap to reveal answer"
    );

    setText(
        "flashcardCount",
        `${currentFlashcardIndex + 1} / ${cards.length}`
    );
}

function showFlashcardAnswer() {
    flashcardAnswerVisible = !flashcardAnswerVisible;
    renderFlashcard();
}

function nextFlashcard() {
    const cards = getFlashcards();

    if (!cards.length) return;

    currentFlashcardIndex =
        (currentFlashcardIndex + 1) % cards.length;

    flashcardAnswerVisible = false;
    renderFlashcard();
}

function addFlashcard() {
    const question = getElement("newFlashcardQuestion")?.value.trim();
    const answer = getElement("newFlashcardAnswer")?.value.trim();

    if (!question || !answer) {
        alert("Please enter both question and answer.");
        return;
    }

    const cards = getFlashcards();

    cards.push({ question, answer });

    saveStoredData(STORAGE_KEYS.flashcards, cards);

    if (getElement("newFlashcardQuestion")) {
        getElement("newFlashcardQuestion").value = "";
    }

    if (getElement("newFlashcardAnswer")) {
        getElement("newFlashcardAnswer").value = "";
    }

    renderFlashcard();
}


/* =====================================================
   15. REVISION QUEUE
===================================================== */

function getRevisionItems() {
    return getStoredData(STORAGE_KEYS.revision, []);
}

function addToRevision(text) {
    if (!text || !text.trim()) return;

    const items = getRevisionItems();

    items.push({
        id: Date.now(),
        text: text.trim(),
        completed: false
    });

    saveStoredData(STORAGE_KEYS.revision, items);
    renderRevisionQueue();
}

function renderRevisionQueue() {
    const container = getElement("revisionList");

    if (!container) return;

    const items = getRevisionItems();

    if (!items.length) {
        container.innerHTML = "<p>Your revision queue is empty.</p>";
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="study-task">
            <input
                type="checkbox"
                ${item.completed ? "checked" : ""}
                onchange="toggleRevisionItem(${Number(item.id)})"
            >
            <span>${escapeHTML(item.text)}</span>
            <button
                class="primary-btn"
                onclick="deleteRevisionItem(${Number(item.id)})"
            >
                Delete
            </button>
        </div>
    `).join("");
}

function toggleRevisionItem(id) {
    const items = getRevisionItems();

    const item = items.find(entry => Number(entry.id) === Number(id));

    if (!item) return;

    item.completed = !item.completed;

    saveStoredData(STORAGE_KEYS.revision, items);
    renderRevisionQueue();
}

function deleteRevisionItem(id) {
    const items = getRevisionItems().filter(
        item => Number(item.id) !== Number(id)
    );

    saveStoredData(STORAGE_KEYS.revision, items);
    renderRevisionQueue();
}


/* =====================================================
   16. MISTAKE NOTEBOOK
===================================================== */

async function addMistake() {
    const subject = getElement("mistakeSubject")?.value.trim();
    const topic = getElement("mistakeTopic")?.value.trim();
    const question = getElement("mistakeQuestion")?.value.trim();
    const answer = getElement("mistakeAnswer")?.value.trim();

    if (!subject || !topic || !question) {
        alert("Please enter subject, topic and question.");
        return;
    }

    const mistake = {
        id: Date.now(),
        subject,
        topic,
        question,
        answer,
        created_at: new Date().toISOString()
    };

    const mistakes = getStoredData(STORAGE_KEYS.mistakes, []);

    mistakes.unshift(mistake);

    saveStoredData(STORAGE_KEYS.mistakes, mistakes);

    if (supabaseClient && currentUser) {
        try {
            const { error } = await supabaseClient
                .from("mistakes")
                .insert({
                    user_id: currentUser.id,
                    subject,
                    topic,
                    question,
                    correct_answer: answer
                });

            if (error) throw error;

        } catch (error) {
            console.error("Mistake save warning:", error.message);
        }
    }

    [
        "mistakeSubject",
        "mistakeTopic",
        "mistakeQuestion",
        "mistakeAnswer"
    ].forEach(id => {
        if (getElement(id)) getElement(id).value = "";
    });

    renderMistakes();
    alert("Mistake saved successfully!");
}

async function loadMistakes() {
    let mistakes = getStoredData(STORAGE_KEYS.mistakes, []);

    if (supabaseClient && currentUser) {
        try {
            const { data, error } = await supabaseClient
                .from("mistakes")
                .select("*")
                .eq("user_id", currentUser.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (data) {
                mistakes = data.map((item, index) => ({
                    id: item.id || index,
                    subject: item.subject,
                    topic: item.topic,
                    question: item.question,
                    answer: item.correct_answer
                }));

                saveStoredData(STORAGE_KEYS.mistakes, mistakes);
            }

        } catch (error) {
            console.warn("Mistake loading warning:", error.message);
        }
    }

    renderMistakes(mistakes);
}

function renderMistakes(mistakes = null) {
    if (!mistakes) {
        mistakes = getStoredData(STORAGE_KEYS.mistakes, []);
    }

    const container = getElement("mistakeList");

    if (!container) return;

    if (!mistakes.length) {
        container.innerHTML = "<p>No mistakes saved yet. Add one to start revising.</p>";
        return;
    }

    container.innerHTML = mistakes.map(item => `
        <div class="mistake-item">
            <h3>${escapeHTML(item.subject)} — ${escapeHTML(item.topic)}</h3>
            <p><strong>Question:</strong> ${escapeHTML(item.question)}</p>
            <p><strong>Correct answer:</strong> ${escapeHTML(item.answer || "Not provided")}</p>
            <button
                class="primary-btn"
                onclick="addToRevision(${JSON.stringify(
                    `${item.subject}: ${item.topic}`
                ).replace(/'/g, "\\'")})"
            >
                Add to Revision
            </button>
        </div>
    `).join("");
}


/* =====================================================
   17. SKILL DIAGNOSIS
===================================================== */

async function diagnoseMistake() {
    const input =
        getElement("mistakeDescription") ||
        getElement("diagnosisInput");

    const description = input?.value.trim();

    if (!description) {
        alert("Please describe your mistake first.");
        return;
    }

    const resultElement =
        getElement("diagnosisResult") ||
        getElement("diagnosisOutput");

    if (resultElement) {
        resultElement.textContent = "Analyzing your mistake...";
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/diagnose?description=${encodeURIComponent(description)}`
        );

        if (!response.ok) {
            throw new Error("Diagnosis service is currently unavailable.");
        }

        const data = await response.json();

        const diagnosis =
            data.diagnosis ||
            data.result ||
            data.message ||
            "No diagnosis returned.";

        if (resultElement) {
            resultElement.textContent = diagnosis;
        }

    } catch (error) {
        console.error("Diagnosis error:", error);

        if (resultElement) {
            resultElement.textContent =
                "Could not connect to the diagnosis service. Please try again later.";
        }
    }
}


/* =====================================================
   18. PREPNEXA AI COACH
===================================================== */

function addChatMessage(message, sender = "assistant") {
    const container = getElement("chatMessages");

    if (!container) return;

    const messageElement = document.createElement("div");

    messageElement.className =
        sender === "user"
            ? "chat-message user-message"
            : "chat-message assistant-message";

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    messageElement.appendChild(paragraph);
    container.appendChild(messageElement);

    container.scrollTop = container.scrollHeight;
}

async function sendAiMessage() {
    const input = getElement("aiPrompt");
    const button = getElement("askAiBtn");

    if (!input) return;

    const message = input.value.trim();

    if (!message) return;

    if (button) {
        button.disabled = true;
        button.textContent = "Thinking...";
    }

    addChatMessage(message, "user");

    input.value = "";

    chatHistory.push({
        role: "user",
        content: message
    });

    const status = getElement("aiResponse");

    if (status) status.textContent = "PrepNexa AI is thinking...";

    try {
        const response = await fetch(`${API_BASE_URL}/ai`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message,
                history: chatHistory.slice(-12)
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.detail ||
                data.message ||
                `AI service error (${response.status}).`
            );
        }

        const answer =
            data.answer ||
            data.response ||
            data.reply ||
            "I couldn't generate a response. Please try again.";

        addChatMessage(answer, "assistant");

        chatHistory.push({
            role: "assistant",
            content: answer
        });

        if (status) status.textContent = "Connected to PrepNexa AI";

    } catch (error) {
        console.error("AI Coach error:", error);

        let friendlyMessage =
            "Sorry, I couldn't connect to PrepNexa AI right now. Please try again.";

        if (
            error.message.includes("429") ||
            error.message.toLowerCase().includes("quota")
        ) {
            friendlyMessage =
                "The AI service has reached its usage limit. Please try again later.";
        } else if (
            error.message.includes("503") ||
            error.message.toLowerCase().includes("unavailable")
        ) {
            friendlyMessage =
                "The AI service is temporarily unavailable. Please try again shortly.";
        }

        addChatMessage(friendlyMessage, "assistant");

        if (status) status.textContent = "AI connection issue";

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Send";
        }

        input.focus();

        const container = getElement("chatMessages");

        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
}


/* =====================================================
   19. PROFILE MANAGEMENT
===================================================== */

async function saveProfile() {
    if (!currentUser || !supabaseClient) return;

    const name =
        getElement("profileNameInput")?.value.trim();

    const role =
        getElement("profileRoleInput")?.value.trim() || "Student";

    if (!name) {
        alert("Please enter your name.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from("profiles")
            .upsert({
                id: currentUser.id,
                name,
                role
            }, {
                onConflict: "id"
            });

        if (error) throw error;

        setText("userName", name);
        setText("profileName", name);
        setText("profileRole", role);

        alert("Profile updated successfully!");

    } catch (error) {
        console.error("Profile update error:", error);
        alert("Could not update profile: " + error.message);
    }
}

function handleProfilePhoto(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        alert("Please select an image smaller than 2 MB.");
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        const imageData = reader.result;

        const photo = getElement("profilePhoto");

        if (photo) photo.src = imageData;

        localStorage.setItem(STORAGE_KEYS.profilePhoto, imageData);
    };

    reader.readAsDataURL(file);
}


/* =====================================================
   20. THEME AND PREFERENCES
===================================================== */

function applyTheme(theme) {
    document.body.classList.remove("light-theme", "dark-theme");
    document.body.classList.add(`${theme}-theme`);

    localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function toggleTheme() {
    const isLight =
        document.body.classList.contains("light-theme");

    applyTheme(isLight ? "dark" : "light");
}

function changeTheme(theme) {
    if (theme !== "light" && theme !== "dark") return;

    applyTheme(theme);
}


/* =====================================================
   21. EVENT LISTENERS
===================================================== */

function initializeEventListeners() {

    // Authentication
    getElement("authForm")?.addEventListener(
        "submit",
        handleAuthSubmit
    );

    getElement("loginTab")?.addEventListener("click", () => {
        showAuthForm("login");
    });

    getElement("signupTab")?.addEventListener("click", () => {
        showAuthForm("signup");
    });

    // AI Coach
    getElement("askAiBtn")?.addEventListener(
        "click",
        sendAiMessage
    );

    getElement("aiPrompt")?.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendAiMessage();
        }
    });

    // Theme
    getElement("themeToggle")?.addEventListener(
        "click",
        toggleTheme
    );

    // Profile photo
    getElement("profilePhotoInput")?.addEventListener(
        "change",
        handleProfilePhoto
    );

    // Profile save
    getElement("saveProfileBtn")?.addEventListener(
        "click",
        saveProfile
    );

    // Flashcard click
    getElement("flashcardArea")?.addEventListener(
        "click",
        showFlashcardAnswer
    );

    // Revision queue
    getElement("addRevisionBtn")?.addEventListener("click", () => {
        const input = getElement("revisionInput");

        if (input) {
            addToRevision(input.value);
            input.value = "";
        }
    });
}


/* =====================================================
   22. INITIALIZATION
===================================================== */

async function initializePrepNexa() {

    // Apply saved theme
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);

    applyTheme(savedTheme || "dark");

    // Load saved local scores
    scores = getStoredData(STORAGE_KEYS.scores, scores);

    // Load local study tasks if not already saved
    if (!localStorage.getItem(STORAGE_KEYS.study)) {
        saveStoredData(STORAGE_KEYS.study, defaultStudyTasks);
    }

    // Load default flashcards if not already saved
    if (!localStorage.getItem(STORAGE_KEYS.flashcards)) {
        saveStoredData(STORAGE_KEYS.flashcards, defaultFlashcards);
    }

    initializeEventListeners();

    initializeSupabase();

    updateScoreDisplay();
    renderFlashcard();
    renderStudyTasks();
    renderRevisionQueue();
    renderMistakes();

    if (supabaseClient) {
        await checkAuthentication();

        supabaseClient.auth.onAuthStateChange(
            async (event, session) => {
                if (event === "SIGNED_IN" && session?.user) {
                    currentUser = session.user;
                }

                if (event === "SIGNED_OUT") {
                    currentUser = null;
                }
            }
        );
    }

    console.log("PrepNexa initialized successfully.");
}


// Start the application after HTML is loaded.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePrepNexa);
} else {
    initializePrepNexa();
}


/* =====================================================
   23. MAKE FUNCTIONS AVAILABLE TO HTML BUTTONS
===================================================== */

window.showAuthForm = showAuthForm;
window.showPage = showPage;
window.logoutUser = logoutUser;
window.toggleTheme = toggleTheme;
window.changeTheme = changeTheme;

window.calculateReadiness = calculateReadiness;
window.startAssessment = startAssessment;

window.showFlashcardAnswer = showFlashcardAnswer;
window.nextFlashcard = nextFlashcard;
window.addFlashcard = addFlashcard;

window.addMistake = addMistake;
window.diagnoseMistake = diagnoseMistake;
window.saveProfile = saveProfile;

window.toggleStudyTask = toggleStudyTask;
window.addToRevision = addToRevision;
window.toggleRevisionItem = toggleRevisionItem;
window.deleteRevisionItem = deleteRevisionItem;

window.sendAiMessage = sendAiMessage;
window.renderCharts = renderCharts;
