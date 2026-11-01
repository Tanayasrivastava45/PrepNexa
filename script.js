/* =========================================================
   PREPNEXA CREDENTIALS & INITIALIZATION
========================================================= */

const SUPABASE_URL = "https://grizmzdmuboifbofvefk.supabase.co";
const SUPABASE_KEY = "sb_publishable_YCcLKsCGQo5JHv2Y7WQzGg_Gz79S6yl";
const BACKEND_API_URL = "https://prepnexa-api.onrender.com";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let currentUser = null;
let skillRadarChartInstance = null;
let progressChartInstance = null;
let currentFlashcardSubject = "DSA";
let currentFlashcardIndex = 0;
let activeFlashcardsList = [];
let adaptiveIndex = 0;
let adaptiveCorrect = 0;
let adaptiveQuestionsPool = [];
let activeAssessmentData = {};

/* EXPANDED FLASHCARDS BANK */
const MASTER_FLASHCARDS = {
    DSA: [
        { id: "d1", q: "Time complexity of Binary Search?", a: "O(log n)" },
        { id: "d2", q: "Stack follows which principle?", a: "LIFO (Last In First Out)" },
        { id: "d3", q: "Best case time complexity of Quick Sort?", a: "O(n log n)" },
        { id: "d4", q: "Queue follows which principle?", a: "FIFO (First In First Out)" },
        { id: "d5", q: "Which data structure is used for BFS in graphs?", a: "Queue" },
        { id: "d6", q: "Worst case time complexity of Merge Sort?", a: "O(n log n)" }
    ],
    CS_CORE: [
        { id: "c1", q: "What is Encapsulation?", a: "Wrapping data and methods into a single unit." },
        { id: "c2", q: "What is a Primary Key?", a: "A unique identifier for each row in a database table." },
        { id: "c3", q: "What is Virtual Memory?", a: "Memory management capability using secondary storage as RAM." },
        { id: "c4", q: "What is Deadlock?", a: "Situation where two or more processes wait indefinitely for each other." }
    ],
    VERBAL: [
        { id: "v1", q: "Past participle of 'Write'?", a: "Written" },
        { id: "v2", q: "Antonym of 'Abundant'?", a: "Scarce / Meager" }
    ],
    APTITUDE: [
        { id: "a1", q: "Formula for Speed?", a: "Distance / Time" },
        { id: "a2", q: "What is 15% of 200?", a: "30" }
    ]
};

/* SHUFFLE UTILITY */
function shuffleArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/* DYNAMIC QUESTION GENERATOR */
function generateDynamicQuestions(subject, count = 10) {
    const templates = {
        DSA: [
            { q: "Time complexity of searching in a balanced BST?", o: ["O(log n)", "O(n)", "O(1)"], c: 0 },
            { q: "Data structure required for recursion?", o: ["Stack", "Queue", "Array"], c: 0 },
            { q: "Auxiliary space complexity of Merge Sort?", o: ["O(n)", "O(1)", "O(log n)"], c: 0 },
            { q: "Which algorithm finds shortest path in a weighted graph?", o: ["Dijkstra's", "Kruskal's", "Prim's"], c: 0 },
            { q: "Worst case time complexity of Hash Table lookup?", o: ["O(n)", "O(1)", "O(log n)"], c: 0 }
        ],
        "CS Core": [
            { q: "Which concept allows interface reuse with multiple forms?", o: ["Polymorphism", "Encapsulation", "Inheritance"], c: 0 },
            { q: "ACID property 'A' stands for?", o: ["Atomicity", "Availability", "Accuracy"], c: 0 },
            { q: "Which OS scheduling uses time quantum?", o: ["Round Robin", "FCFS", "SJF"], c: 0 },
            { q: "Port number for HTTP?", o: ["80", "443", "21"], c: 0 }
        ],
        Verbal: [
            { q: "Choose correct past tense: 'He ____ to college yesterday.'", o: ["went", "go", "gone"], c: 0 },
            { q: "Synonym for 'Meticulous'?", o: ["Careful", "Careless", "Fast"], c: 0 }
        ],
        Aptitude: [
            { q: "20% of a number is 50. What is the number?", o: ["250", "200", "300"], c: 0 },
            { q: "A train covers 120 km in 2 hours. Speed?", o: ["60 km/h", "50 km/h", "70 km/h"], c: 0 }
        ]
    };

    let basePool = templates[subject] || templates["DSA"];
    let generated = [];

    for (let i = 0; i < count; i++) {
        let template = basePool[i % basePool.length];
        let choices = shuffleArray([...template.o]);
        let correctText = template.o[template.c];
        let correctIndex = choices.indexOf(correctText);

        generated.push({
            q: `[Set ${Math.floor(Math.random()*90+10)}] ${template.q}`,
            options: choices,
            correct: correctIndex,
            correctText: correctText
        });
    }

    return shuffleArray(generated);
}

/* NAVIGATION */
function showPage(pageId, element) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));

    document.getElementById(pageId)?.classList.add("active");
    if (element) element.classList.add("active");
}

/* AUTHENTICATION VIA SUPABASE */
async function signUpUser() {
    const name = document.getElementById("authName").value.trim();
    const role = document.getElementById("authRole").value;
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const message = document.getElementById("authMessage");

    if (!name || !role || !email || !password) {
        message.innerText = "Please fill all fields.";
        return;
    }

    if (!supabaseClient) {
        showApplication();
        return;
    }

    message.innerText = "Creating account...";
    const { data, error } = await supabaseClient.auth.signUp({
        email: email, password: password,
        options: { data: { name: name, role: role } }
    });

    if (error) {
        message.innerText = "Signup failed: " + error.message;
    } else {
        message.innerText = "Account created ✅ Please login.";
    }
}

async function loginUser() {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const message = document.getElementById("authMessage");

    if (!email || !password) {
        message.innerText = "Enter email and password.";
        return;
    }

    if (!supabaseClient) {
        showApplication();
        return;
    }

    message.innerText = "Logging in...";
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        message.innerText = error.message;
    } else {
        currentUser = data.user;
        showApplication();
        loadProfileFromSupabase();
    }
}

async function logoutUser() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    currentUser = null;
    hideApplication();
}

function showApplication() {
    document.getElementById("authScreen").style.display = "none";
    document.querySelector(".app").style.display = "flex";
}

function hideApplication() {
    document.getElementById("authScreen").style.display = "flex";
    document.querySelector(".app").style.display = "none";
}

async function loadProfileFromSupabase() {
    if (!currentUser || !supabaseClient) return;
    const { data } = await supabaseClient.from("profiles").select("*").eq("id", currentUser.id).single();
    if (data) {
        document.getElementById("welcomeTitle").innerText = `Hi, ${data.name} 👋`;
        document.getElementById("topRole").innerText = data.role;
        document.getElementById("studentName").value = data.name;
        document.getElementById("profileRole").value = data.role;
    }
}

async function saveProfile() {
    const name = document.getElementById("studentName").value.trim();
    const role = document.getElementById("profileRole").value;

    if (currentUser && supabaseClient) {
        await supabaseClient.from("profiles").upsert({ id: currentUser.id, name, role });
    }
    document.getElementById("welcomeTitle").innerText = `Hi, ${name} 👋`;
    document.getElementById("topRole").innerText = role;
    document.getElementById("profileMessage").innerText = "Profile saved ✅";
}

/* ASSESSMENTS */
function generateAndRenderAssessment(subject, containerId) {
    const questions = generateDynamicQuestions(subject, 10);
    activeAssessmentData[subject] = questions;

    const container = document.getElementById(containerId);
    container.innerHTML = questions.map((q, idx) => `
        <div class="question">
            <p><strong>${idx + 1}. ${q.q}</strong></p>
            ${q.options.map((opt, oIdx) => `
                <label class="option">
                    <input type="radio" name="${subject}_q${idx}" value="${oIdx}">
                    ${opt}
                </label>
            `).join('')}
        </div>
    `).join('');
}

function submitAssessment(subject, containerId, resultId, scoreInputId) {
    const questions = activeAssessmentData[subject];
    if (!questions) return alert("Please load assessment questions first.");

    let correctCount = 0;
    questions.forEach((q, idx) => {
        const sel = document.querySelector(`input[name="${subject}_q${idx}"]:checked`);
        if (sel && parseInt(sel.value) === q.correct) {
            correctCount++;
        } else {
            addMistake(subject, "General", q.q, q.correctText);
        }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    document.getElementById(scoreInputId).value = score;
    document.getElementById(resultId).innerText = `Score: ${score}% (${correctCount}/${questions.length} Correct)`;

    calculateReadiness();
}

/* ADAPTIVE TEST */
function startAdaptiveAssessment() {
    const subject = document.getElementById("adaptiveSubject").value;
    adaptiveQuestionsPool = generateDynamicQuestions(subject, 10);
    adaptiveIndex = 0;
    adaptiveCorrect = 0;

    document.getElementById("adaptiveBox").style.display = "block";
    document.getElementById("adaptiveResultCard").style.display = "none";
    showAdaptiveQuestion();
}

function showAdaptiveQuestion() {
    if (adaptiveIndex >= adaptiveQuestionsPool.length) {
        finishAdaptiveAssessment();
        return;
    }

    const q = adaptiveQuestionsPool[adaptiveIndex];
    document.getElementById("adaptiveCounter").innerText = `Question ${adaptiveIndex + 1} / ${adaptiveQuestionsPool.length}`;
    document.getElementById("adaptiveQuestion").innerText = q.q;

    const container = document.getElementById("adaptiveOptions");
    container.innerHTML = q.options.map((opt, idx) => `
        <button class="btn-secondary" style="display:block; width:100%; margin:8px 0; text-align:left;" onclick="selectAdaptiveOption(${idx})">${opt}</button>
    `).join('');
}

function selectAdaptiveOption(index) {
    const q = adaptiveQuestionsPool[adaptiveIndex];
    if (index === q.correct) {
        adaptiveCorrect++;
    } else {
        addMistake("Adaptive", "General", q.q, q.correctText);
    }
    adaptiveIndex++;
    showAdaptiveQuestion();
}

function finishAdaptiveAssessment() {
    document.getElementById("adaptiveBox").style.display = "none";
    document.getElementById("adaptiveResultCard").style.display = "block";

    const score = Math.round((adaptiveCorrect / adaptiveQuestionsPool.length) * 100);
    document.getElementById("adaptiveFinalScore").innerText = `Final Score: ${score}%`;
    document.getElementById("adaptiveFinalMessage").innerText = score >= 70 ? "Excellent Performance! 🎉" : "Needs Revision. Review your mistakes.";
}

/* READINESS CALCULATOR */
function calculateReadiness() {
    const dsa = Number(document.getElementById("dsaScore").value) || 0;
    const core = Number(document.getElementById("fundamentalsScore").value) || 0;
    const verbal = Number(document.getElementById("verbalScore").value) || 0;
    const aptitude = Number(document.getElementById("aptitudeScore").value) || 0;
    const role = document.getElementById("targetRole").value;

    let readiness = role === "SDE" ? (dsa * 0.40 + core * 0.25 + verbal * 0.15 + aptitude * 0.20) : (dsa * 0.25 + core * 0.25 + verbal * 0.25 + aptitude * 0.25);
    readiness = Math.round(readiness);

    document.getElementById("readinessResult").innerText = `${readiness}%`;
    updateDashboard(dsa, core, verbal, aptitude, readiness);
}

function updateDashboard(dsa, core, verbal, aptitude, readiness) {
    document.getElementById("summaryReadiness").innerText = `${readiness}%`;
    document.getElementById("heroScore").innerText = `${readiness}%`;
    document.getElementById("heroProgressBar").style.width = `${readiness}%`;

    document.getElementById("dashboardDSA").innerText = `${dsa}%`;
    document.getElementById("dashboardFundamentals").innerText = `${core}%`;
    document.getElementById("dashboardVerbal").innerText = `${verbal}%`;
    document.getElementById("dashboardAptitude").innerText = `${aptitude}%`;

    updateSkillRadar(dsa, core, verbal, aptitude);
}

/* MISTAKES NOTEBOOK */
function addMistake(subject, topic, question, correctAnswer) {
    let mistakes = JSON.parse(localStorage.getItem("prepsenseMistakes") || "[]");
    mistakes.push({ subject, topic, question, correct_answer: correctAnswer });
    localStorage.setItem("prepsenseMistakes", JSON.stringify(mistakes));
    renderMistakes();
}

function renderMistakes() {
    let mistakes = JSON.parse(localStorage.getItem("prepsenseMistakes") || "[]");
    const container = document.getElementById("mistakeList");
    if (!mistakes.length) return container.innerHTML = "No mistakes logged yet.";

    container.innerHTML = mistakes.map(m => `
        <div class="result-box" style="margin-bottom:10px;">
            <strong>[${m.subject}]</strong> ${m.question}<br>
            <span style="color:#22c55e;">Correct Answer: ${m.correct_answer}</span>
        </div>
    `).join('');
}

function clearMistakes() {
    localStorage.removeItem("prepsenseMistakes");
    renderMistakes();
}

/* FLASHCARDS */
function loadFlashcards() {
    currentFlashcardSubject = document.getElementById("flashcardSubject").value;
    activeFlashcardsList = shuffleArray(MASTER_FLASHCARDS[currentFlashcardSubject] || MASTER_FLASHCARDS["DSA"]);
    currentFlashcardIndex = 0;
    displayFlashcard();
}

function displayFlashcard() {
    if (!activeFlashcardsList.length) return;
    const card = activeFlashcardsList[currentFlashcardIndex];
    document.getElementById("flashcardQuestion").innerText = card.q;
    document.getElementById("flashcardAnswer").innerText = card.a;
    document.getElementById("flashcardNumber").innerText = `Card ${currentFlashcardIndex + 1} of ${activeFlashcardsList.length}`;
    document.getElementById("flashcardInner").classList.remove("flipped");
}

function flipFlashcard() {
    document.getElementById("flashcardInner").classList.toggle("flipped");
}

function nextFlashcard() {
    currentFlashcardIndex = (currentFlashcardIndex + 1) % activeFlashcardsList.length;
    displayFlashcard();
}

function previousFlashcard() {
    currentFlashcardIndex = (currentFlashcardIndex - 1 + activeFlashcardsList.length) % activeFlashcardsList.length;
    displayFlashcard();
}

function markFlashcardKnown() { nextFlashcard(); }
function markFlashcardRevision() {
    const card = activeFlashcardsList[currentFlashcardIndex];
    let queue = JSON.parse(localStorage.getItem("prepsenseRevisionQueue") || "[]");
    queue.push(card);
    localStorage.setItem("prepsenseRevisionQueue", JSON.stringify(queue));
    renderRevisionQueue();
    nextFlashcard();
}

function renderRevisionQueue() {
    let queue = JSON.parse(localStorage.getItem("prepsenseRevisionQueue") || "[]");
    const container = document.getElementById("revisionQueueList");
    if (!queue.length) return container.innerHTML = "Revision queue is empty.";
    container.innerHTML = queue.map(c => `<div class="result-box" style="margin-bottom:8px;"><strong>${c.q}</strong><br>${c.a}</div>`).join('');
}

/* RADAR CHART */
function updateSkillRadar(dsa=0, core=0, verbal=0, aptitude=0) {
    const canvas = document.getElementById("skillRadarChart");
    if (!canvas) return;
    if (skillRadarChartInstance) skillRadarChartInstance.destroy();

    skillRadarChartInstance = new Chart(canvas, {
        type: "radar",
        data: {
            labels: ["DSA", "CS Core", "Verbal", "Aptitude"],
            datasets: [{ label: "Skill Level", data: [dsa, core, verbal, aptitude], backgroundColor: "rgba(91,95,239,0.2)", borderColor: "#5b5fef" }]
        },
        options: { scales: { r: { min: 0, max: 100 } } }
    });
}

/* APPEARANCE & THEME */
function setModePreference(mode) {
    localStorage.setItem("prepnexaModePreference", mode);
    applyAppearance();
}

function setThemePreference(theme) {
    localStorage.setItem("prepnexaThemePreference", theme);
    applyAppearance();
}

function applyAppearance() {
    let mode = localStorage.getItem("prepnexaModePreference") || "light";
    let theme = localStorage.getItem("prepnexaThemePreference") || "indigo";

    if (mode === "system") {
        mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    document.documentElement.setAttribute("data-mode", mode);
    document.documentElement.setAttribute("data-theme", theme);
}

/* DIAGNOSIS VIA RENDER API */
async function diagnoseMistake() {
    const description = document.getElementById("mistakeInput").value.trim();
    if (!description) return;

    try {
        const response = await fetch(`${BACKEND_API_URL}/diagnose?description=${encodeURIComponent(description)}`);
        const data = await response.json();
        document.getElementById("diagnosisResult").innerText = data.diagnosis;
        document.getElementById("suggestion").innerText = data.suggestion;
    } catch {
        document.getElementById("diagnosisResult").innerText = "Diagnosis Service Offline";
        document.getElementById("suggestion").innerText = "Check your FastAPI backend server connection.";
    }
}

/* AI COACH VIA RENDER API */
function setupAiCoach() {
    const askAiBtn = document.getElementById("askAiBtn");
    const aiPrompt = document.getElementById("aiPrompt");
    const aiResponse = document.getElementById("aiResponse");

    if (askAiBtn) {
        askAiBtn.addEventListener("click", async () => {
            const prompt = aiPrompt.value.trim();
            if (!prompt) return aiResponse.innerText = "Please enter a question first.";

            aiResponse.innerText = "Thinking...";
            try {
                const response = await fetch(`${BACKEND_API_URL}/ai`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt })
                });
                const data = await response.json();
                aiResponse.innerText = data.response || data.detail || "No response received.";
            } catch (error) {
                aiResponse.innerText = "Unable to connect to PrepNexa AI Backend.";
            }
        });
    }
}

function useAiPrompt(type) {
    const aiPrompt = document.getElementById("aiPrompt");
    if (!aiPrompt) return;

    if (type === "studyPlan") aiPrompt.value = "Create a practical 7-day placement study plan covering DSA, CS Core, Aptitude, and Verbal.";
    if (type === "weakness") aiPrompt.value = "Analyze common placement weaknesses in DSA & CS Core and suggest improvements.";
    if (type === "interview") aiPrompt.value = "Give me 10 essential technical interview questions with short concise answers.";
    aiPrompt.focus();
}

/* FLOATING AI CHATBOT WIDGET LOGIC */
function toggleChatWidget() {
    const chatBox = document.getElementById("chatBox");
    if (chatBox) {
        chatBox.style.display = chatBox.style.display === "none" ? "flex" : "none";
    }
}

function handleChatKeyPress(event) {
    if (event.key === "Enter") sendWidgetMessage();
}

async function sendWidgetMessage() {
    const input = document.getElementById("widgetPrompt");
    const messagesContainer = document.getElementById("chatMessages");
    if (!input || !messagesContainer) return;

    const prompt = input.value.trim();
    if (!prompt) return;

    // Render User Message
    messagesContainer.innerHTML += `<div class="message user-message">${prompt}</div>`;
    input.value = "";
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Loading Indicator
    const loadingId = "bot-loading-" + Date.now();
    messagesContainer.innerHTML += `<div id="${loadingId}" class="message bot-message">Thinking...</div>`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch(`${BACKEND_API_URL}/ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt })
        });
        const data = await response.json();
        
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.innerText = data.response || data.detail || "No response received.";
        }
    } catch (err) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.innerText = "Unable to connect to PrepNexa AI Backend.";
        }
    }
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/* INIT */
window.addEventListener("load", () => {
    applyAppearance();
    loadFlashcards();
    renderMistakes();
    renderRevisionQueue();
    updateSkillRadar();
    setupAiCoach();
    
    generateAndRenderAssessment("DSA", "dsaContainer");
    generateAndRenderAssessment("Verbal", "verbalContainer");
    generateAndRenderAssessment("Aptitude", "aptitudeContainer");
    generateAndRenderAssessment("CS Core", "csCoreContainer");
});