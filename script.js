/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL = "https://grizmzdmuboifbofvefk.supabase.co";

const SUPABASE_KEY =git init
    "sb_publishable_YCcLKsCGQo5JHv2Y7WQzGg_Gz79S6yl";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


let currentUser = null;

let skillRadarChartInstance = null;

let progressChartInstance = null;

let currentFlashcardSubject = "DSA";

let currentFlashcardIndex = 0;

let knownFlashcards =
    new Set();

let adaptiveIndex = 0;

let adaptiveCorrect = 0;



/* =========================================================
   AUTH MESSAGE
========================================================= */

function showAuthMessage(
    message,
    type = "normal"
) {

    const element =
        document.getElementById(
            "authMessage"
        );


    if (!element) {
        return;
    }


    element.innerText =
        message;


    if (type === "success") {

        element.style.color =
            "#22c55e";

    }
    else if (
        type === "error"
    ) {

        element.style.color =
            "#ef4444";

    }
    else {

        element.style.color =
            "#6b7280";

    }

}



/* =========================================================
   SIGN UP
========================================================= */

async function signUpUser() {

    const name =
        document.getElementById("authName").value.trim();

    const role =
        document.getElementById("authRole").value;

    const email =
        document.getElementById("authEmail").value.trim();

    const password =
        document.getElementById("authPassword").value;

    const message =
        document.getElementById("authMessage");


    if (!name || !role || !email || !password) {

        message.innerText =
            "Please fill all fields.";

        message.style.color =
            "red";

        return;
    }


    if (password.length < 6) {

        message.innerText =
            "Password must be at least 6 characters.";

        message.style.color =
            "red";

        return;
    }


    message.innerText =
        "Creating account...";

    message.style.color =
        "#6b7280";


    try {

        const { data, error } =
            await supabaseClient.auth.signUp({

                email: email,

                password: password,

                options: {

                    data: {
                        name: name,
                        role: role
                    }

                }

            });


        console.log("SIGNUP DATA:", data);
        console.log("SIGNUP ERROR:", error);


        if (error) {

            message.innerText =
                "Signup failed: " + error.message;

            message.style.color =
                "red";

            return;
        }


        if (!data.user) {

            message.innerText =
                "Signup failed: Supabase did not create a user.";

            message.style.color =
                "red";

            return;
        }


        localStorage.setItem(
            "prepnexaPendingProfile",
            JSON.stringify({
                name: name,
                role: role
            })
        );


        message.innerText =
            "Account created ✅ Check your email for verification, then login.";

        message.style.color =
            "green";


        console.log(
            "USER CREATED:",
            data.user
        );

    }
    catch (err) {

        console.error(
            "SIGNUP CRASH:",
            err
        );


        message.innerText =
            "Signup error: " + err.message;

        message.style.color =
            "red";
    }
}



/* =========================================================
   LOGIN
========================================================= */

async function loginUser() {

    const email =
        document
            .getElementById(
                "authEmail"
            )
            .value
            .trim();


    const password =
        document
            .getElementById(
                "authPassword"
            )
            .value;


    if (
        !email ||
        !password
    ) {

        showAuthMessage(
            "Enter your email and password.",
            "error"
        );

        return;

    }


    showAuthMessage(
        "Logging in..."
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .auth
            .signInWithPassword({

                email:
                    email,

                password:
                    password

            });


    if (error) {

        showAuthMessage(
            error.message,
            "error"
        );

        return;

    }


    currentUser =
        data.user;


    await ensureProfileExists();


    showApplication();


    await loadProfileFromSupabase();

    await loadMistakesFromSupabase();

    await loadScoresFromSupabase();


    showAuthMessage(
        "Login successful ✅",
        "success"
    );

}



/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser() {

    await supabaseClient
        .auth
        .signOut();


    currentUser =
        null;


    hideApplication();

}



/* =========================================================
   CHECK SESSION
========================================================= */

async function checkAuthentication() {

    const {
        data
    } =
        await supabaseClient
            .auth
            .getSession();


    if (
        data.session &&
        data.session.user
    ) {

        currentUser =
            data.session.user;


        showApplication();


        await ensureProfileExists();

        await loadProfileFromSupabase();

        await loadMistakesFromSupabase();

        await loadScoresFromSupabase();

    }
    else {

        hideApplication();

    }

}



function showApplication() {

    document
        .getElementById(
            "authScreen"
        )
        .style
        .display =
        "none";


    document
        .querySelector(
            ".app"
        )
        .style
        .display =
        "flex";

}



function hideApplication() {

    document
        .getElementById(
            "authScreen"
        )
        .style
        .display =
        "flex";


    document
        .querySelector(
            ".app"
        )
        .style
        .display =
        "none";

}



/* =========================================================
   PROFILE DATABASE
========================================================= */

async function ensureProfileExists() {

    if (!currentUser) {
        return;
    }


    const {
        data
    } =
        await supabaseClient
            .from(
                "profiles"
            )
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();


    if (data) {
        return;
    }


    let name =
        currentUser
            .user_metadata
            ?.name ||
        "User";


    let role =
        currentUser
            .user_metadata
            ?.role ||
        "";


    const pending =
        localStorage.getItem(
            "prepnexaPendingProfile"
        );


    if (pending) {

        const saved =
            JSON.parse(pending);


        name =
            saved.name || name;


        role =
            saved.role || role;

    }


    await saveProfileToSupabase(
        currentUser,
        name,
        role
    );

}



async function saveProfileToSupabase(
    user,
    name,
    role
) {

    const {
        error
    } =
        await supabaseClient
            .from(
                "profiles"
            )
            .upsert({

                id:
                    user.id,

                name:
                    name,

                role:
                    role

            });


    if (error) {

        console.error(
            "Profile save error:",
            error
        );

    }

}



async function loadProfileFromSupabase() {

    if (!currentUser) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "profiles"
            )
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .single();


    if (
        error ||
        !data
    ) {

        return;

    }


    const profile = {

        name:
            data.name,

        role:
            data.role

    };


    localStorage.setItem(
        "prepsenseProfile",
        JSON.stringify(profile)
    );


    updateProfileUI(profile);

}



/* =========================================================
   SAVE PROFILE BUTTON
========================================================= */

async function saveProfile() {

    const name =
        document
            .getElementById(
                "studentName"
            )
            .value
            .trim();


    const role =
        document
            .getElementById(
                "profileRole"
            )
            .value;


    if (
        !name ||
        !role
    ) {

        document
            .getElementById(
                "profileMessage"
            )
            .innerText =
            "Please enter name and role.";

        return;

    }


    const profile = {
        name,
        role
    };


    localStorage.setItem(
        "prepsenseProfile",
        JSON.stringify(profile)
    );


    if (currentUser) {

        await saveProfileToSupabase(
            currentUser,
            name,
            role
        );

    }


    updateProfileUI(profile);


    document
        .getElementById(
            "profileMessage"
        )
        .innerText =
        "Profile saved ✅";

}



function updateProfileUI(
    profile
) {

    document
        .getElementById(
            "welcomeTitle"
        )
        .innerText =
        "Hi, " +
        profile.name +
        " 👋";


    document
        .getElementById(
            "topRole"
        )
        .innerText =
        getRoleName(
            profile.role
        );


    document
        .getElementById(
            "studentName"
        )
        .value =
        profile.name;


    document
        .getElementById(
            "profileRole"
        )
        .value =
        profile.role;


    document
        .getElementById(
            "targetRole"
        )
        .value =
        profile.role;


    updateProfilePhotoUI();

}



function getRoleName(
    role
) {

    if (role === "SDE") {
        return "Software Developer";
    }


    if (role === "AIML") {
        return "AI / ML Engineer";
    }


    if (role === "DATA") {
        return "Data Analyst";
    }


    return "Target Role";

}



/* =========================================================
   NAVIGATION
========================================================= */

function showPage(
    pageId,
    element
) {

    document
        .querySelectorAll(
            ".page"
        )
        .forEach(
            page =>
                page.classList.remove(
                    "active"
                )
        );


    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item =>
                item.classList.remove(
                    "active"
                )
        );


    document
        .getElementById(
            pageId
        )
        ?.classList.add(
            "active"
        );


    element
        ?.classList
        .add(
            "active"
        );

}



function openProfileSettings() {

    showPage(
        "profileSettings"
    );

}



/* =========================================================
   HELPER
========================================================= */

function getSelectedValue(
    name
) {

    const answer =
        document.querySelector(
            `input[name="${name}"]:checked`
        );


    return answer
        ? answer.value
        : null;

}



/* =========================================================
   DSA
========================================================= */

async function submitDSATest() {

    const answers = [

        getSelectedValue("dsa1"),

        getSelectedValue("dsa2"),

        getSelectedValue("dsa3")

    ];


    if (
        answers.some(
            a => !a
        )
    ) {

        alert(
            "Answer all questions."
        );

        return;

    }


    const correct = [
        "B",
        "B",
        "B"
    ];


    let score =
        answers.filter(
            (a,i) =>
                a === correct[i]
        ).length;


    score =
        Math.round(
            score / 3 * 100
        );


    document
        .getElementById(
            "dsaScore"
        )
        .value =
        score;


    document
        .getElementById(
            "dsaResult"
        )
        .innerText =
        `DSA Score: ${score}%`;


    if (
        answers[0] !== "B"
    ) {

        await addMistake(
            "DSA",
            "Binary Search",
            "Time complexity of Binary Search?",
            "O(log n)"
        );

    }


    if (
        answers[1] !== "B"
    ) {

        await addMistake(
            "DSA",
            "Stack",
            "Stack follows?",
            "LIFO"
        );

    }


    if (
        answers[2] !== "B"
    ) {

        await addMistake(
            "DSA",
            "Searching",
            "Best search for sorted array?",
            "Binary Search"
        );

    }


    autoCalculateReadiness();

}



/* =========================================================
   VERBAL
========================================================= */

async function submitVerbalTest() {

    const answers = [

        getSelectedValue("verbal1"),

        getSelectedValue("verbal2"),

        getSelectedValue("verbal3")

    ];


    if (
        answers.some(
            a => !a
        )
    ) {

        alert(
            "Answer all questions."
        );

        return;

    }


    const correct = [
        "B",
        "B",
        "C"
    ];


    let score =
        answers.filter(
            (a,i) =>
                a === correct[i]
        ).length;


    score =
        Math.round(
            score / 3 * 100
        );


    document
        .getElementById(
            "verbalScore"
        )
        .value =
        score;


    document
        .getElementById(
            "verbalResult"
        )
        .innerText =
        `Verbal Score: ${score}%`;


    autoCalculateReadiness();

}



/* =========================================================
   APTITUDE
========================================================= */

async function submitAptitudeTest() {

    const answers = [

        getSelectedValue("aptitude1"),

        getSelectedValue("aptitude2"),

        getSelectedValue("aptitude3")

    ];


    if (
        answers.some(
            a => !a
        )
    ) {

        alert(
            "Answer all questions."
        );

        return;

    }


    const correct = [
        "C",
        "B",
        "C"
    ];


    let score =
        answers.filter(
            (a,i) =>
                a === correct[i]
        ).length;


    score =
        Math.round(
            score / 3 * 100
        );


    document
        .getElementById(
            "aptitudeScore"
        )
        .value =
        score;


    document
        .getElementById(
            "aptitudeResult"
        )
        .innerText =
        `Aptitude Score: ${score}%`;


    autoCalculateReadiness();

}



/* =========================================================
   CS CORE
========================================================= */

function openCSCorePart(
    partId
) {

    document
        .querySelectorAll(
            ".cs-core-part"
        )
        .forEach(
            part =>
                part.style.display =
                    "none"
        );


    document
        .getElementById(
            partId
        )
        .style
        .display =
        "block";

}



async function submitCSCoreTest(
    subject,
    names,
    correctAnswers
) {

    const answers =
        names.map(
            getSelectedValue
        );


    if (
        answers.some(
            answer => !answer
        )
    ) {

        alert(
            "Answer all four questions."
        );

        return;

    }


    const correct =
        answers.filter(
            (answer,index) =>
                answer ===
                correctAnswers[index]
        )
        .length;


    const score =
        Math.round(
            correct / 4 * 100
        );


    const resultId =
        subject
            .replaceAll(
                " ",
                ""
            ) +
        "Result";


    document
        .getElementById(
            resultId
        )
        .innerText =
        `${subject}: ${score}%`;


    let scores =
        JSON.parse(
            localStorage.getItem(
                "prepsenseCSCoreSections"
            ) || "{}"
        );


    scores[subject] =
        score;


    localStorage.setItem(
        "prepsenseCSCoreSections",
        JSON.stringify(scores)
    );


    calculateCSCoreOverall();

}



function calculateCSCoreOverall() {

    const scores =
        JSON.parse(
            localStorage.getItem(
                "prepsenseCSCoreSections"
            ) || "{}"
        );


    const required = [

        "OOPs",

        "DBMS",

        "Operating System",

        "Computer Networks"

    ];


    if (
        required.some(
            subject =>
                scores[subject] ===
                undefined
        )
    ) {

        return;

    }


    const total =
        required.reduce(
            (sum,subject) =>
                sum +
                scores[subject],
            0
        );


    const overall =
        Math.round(
            total / 4
        );


    document
        .getElementById(
            "fundamentalsScore"
        )
        .value =
        overall;


    document
        .getElementById(
            "fundamentalsResult"
        )
        .innerText =
        `CS Core Overall: ${overall}%`;


    autoCalculateReadiness();

}



/* =========================================================
   READINESS
========================================================= */

function autoCalculateReadiness() {

    const values = [

        document.getElementById(
            "dsaScore"
        ).value,

        document.getElementById(
            "fundamentalsScore"
        ).value,

        document.getElementById(
            "verbalScore"
        ).value,

        document.getElementById(
            "aptitudeScore"
        ).value

    ];


    if (
        values.every(
            value =>
                value !== ""
        )
    ) {

        calculateReadiness();

    }

}



async function calculateReadiness() {

    const dsa =
        Number(
            document.getElementById(
                "dsaScore"
            ).value
        );


    const core =
        Number(
            document.getElementById(
                "fundamentalsScore"
            ).value
        );


    const verbal =
        Number(
            document.getElementById(
                "verbalScore"
            ).value
        );


    const aptitude =
        Number(
            document.getElementById(
                "aptitudeScore"
            ).value
        );


    const role =
        document.getElementById(
            "targetRole"
        ).value;


    let readiness;


    if (role === "SDE") {

        readiness =
            dsa * .40 +
            core * .25 +
            verbal * .15 +
            aptitude * .20;

    }
    else if (
        role === "AIML"
    ) {

        readiness =
            dsa * .30 +
            core * .25 +
            verbal * .15 +
            aptitude * .30;

    }
    else {

        readiness =
            dsa * .15 +
            core * .25 +
            verbal * .20 +
            aptitude * .40;

    }


    readiness =
        Math.round(
            readiness
        );


    const scores = {

        DSA:
            dsa,

        "CS Core":
            core,

        Verbal:
            verbal,

        Aptitude:
            aptitude

    };


    const strongest =
        Object
            .keys(scores)
            .reduce(
                (a,b) =>
                    scores[a] >
                    scores[b]
                        ? a
                        : b
            );


    const weakest =
        Object
            .keys(scores)
            .reduce(
                (a,b) =>
                    scores[a] <
                    scores[b]
                        ? a
                        : b
            );


    document
        .getElementById(
            "readinessResult"
        )
        .innerText =
        `Placement Readiness: ${readiness}%`;


    document
        .getElementById(
            "strongArea"
        )
        .innerText =
        `Strongest Area: ${strongest}`;


    document
        .getElementById(
            "weakArea"
        )
        .innerText =
        `Weakest Area: ${weakest}`;


    document
        .getElementById(
            "readinessRecommendation"
        )
        .innerText =
        `Focus first on ${weakest}.`;


    updateDashboard(
        dsa,
        core,
        verbal,
        aptitude,
        readiness,
        strongest,
        weakest
    );


    generateStudyPlan(
        weakest
    );


    await saveAssessmentScore(

        dsa,
        core,
        verbal,
        aptitude,
        readiness

    );


    saveProgressLocal(

        dsa,
        core,
        verbal,
        aptitude,
        readiness

    );

}



/* =========================================================
   SAVE SCORES DATABASE
========================================================= */

async function saveAssessmentScore(
    dsa,
    core,
    verbal,
    aptitude,
    readiness
) {

    if (!currentUser) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from(
                "assessment_scores"
            )
            .insert({

                user_id:
                    currentUser.id,

                dsa_score:
                    dsa,

                cs_core_score:
                    core,

                verbal_score:
                    verbal,

                aptitude_score:
                    aptitude,

                readiness_score:
                    readiness

            });


    if (error) {

        console.error(
            "Score save error:",
            error
        );

    }

}



async function loadScoresFromSupabase() {

    if (!currentUser) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "assessment_scores"
            )
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending:
                        false
                }
            )
            .limit(1);


    if (
        error ||
        !data ||
        !data.length
    ) {

        return;

    }


    const score =
        data[0];


    document.getElementById(
        "dsaScore"
    ).value =
        score.dsa_score;


    document.getElementById(
        "fundamentalsScore"
    ).value =
        score.cs_core_score;


    document.getElementById(
        "verbalScore"
    ).value =
        score.verbal_score;


    document.getElementById(
        "aptitudeScore"
    ).value =
        score.aptitude_score;


    updateDashboard(

        score.dsa_score,

        score.cs_core_score,

        score.verbal_score,

        score.aptitude_score,

        score.readiness_score,

        "--",

        "--"

    );

}



/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard(
    dsa,
    core,
    verbal,
    aptitude,
    readiness,
    strongest,
    weakest
) {

    document.getElementById(
        "summaryReadiness"
    ).innerText =
        `${readiness}%`;


    document.getElementById(
        "heroScore"
    ).innerText =
        `${readiness}%`;


    document.getElementById(
        "heroProgressBar"
    ).style.width =
        `${readiness}%`;


    document.getElementById(
        "dashboardDSA"
    ).innerText =
        `${dsa}%`;


    document.getElementById(
        "dashboardFundamentals"
    ).innerText =
        `${core}%`;


    document.getElementById(
        "dashboardVerbal"
    ).innerText =
        `${verbal}%`;


    document.getElementById(
        "dashboardAptitude"
    ).innerText =
        `${aptitude}%`;


    document.getElementById(
        "dsaSkillText"
    ).innerText =
        `${dsa}%`;


    document.getElementById(
        "dsaSkillBar"
    ).style.width =
        `${dsa}%`;


    document.getElementById(
        "fundamentalsSkillText"
    ).innerText =
        `${core}%`;


    document.getElementById(
        "fundamentalsSkillBar"
    ).style.width =
        `${core}%`;


    document.getElementById(
        "verbalSkillText"
    ).innerText =
        `${verbal}%`;


    document.getElementById(
        "verbalSkillBar"
    ).style.width =
        `${verbal}%`;


    document.getElementById(
        "aptitudeSkillText"
    ).innerText =
        `${aptitude}%`;


    document.getElementById(
        "aptitudeSkillBar"
    ).style.width =
        `${aptitude}%`;


    document.getElementById(
        "summaryStrongest"
    ).innerText =
        strongest;


    document.getElementById(
        "summaryWeakest"
    ).innerText =
        weakest;


    document.getElementById(
        "smartFocus"
    ).innerText =
        weakest === "--"
            ? "Keep practicing."
            : `Focus on ${weakest} first.`;


    updateSkillRadar(
        dsa,
        core,
        verbal,
        aptitude
    );

}



/* =========================================================
   MISTAKES DATABASE
========================================================= */

async function addMistake(
    subject,
    topic,
    question,
    correctAnswer
) {

    const localMistakes =
        JSON.parse(
            localStorage.getItem(
                "prepsenseMistakes"
            ) || "[]"
        );


    localMistakes.push({

        subject,
        topic,
        question,
        correct_answer:
            correctAnswer

    });


    localStorage.setItem(
        "prepsenseMistakes",
        JSON.stringify(
            localMistakes
        )
    );


    if (currentUser) {

        await supabaseClient
            .from(
                "mistakes"
            )
            .insert({

                user_id:
                    currentUser.id,

                subject:
                    subject,

                topic:
                    topic,

                question:
                    question,

                correct_answer:
                    correctAnswer

            });

    }


    renderMistakes(
        localMistakes
    );

}



async function loadMistakesFromSupabase() {

    if (!currentUser) {
        return;
    }


    const {
        data
    } =
        await supabaseClient
            .from(
                "mistakes"
            )
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending:
                        false
                }
            );


    if (!data) {
        return;
    }


    localStorage.setItem(
        "prepsenseMistakes",
        JSON.stringify(data)
    );


    renderMistakes(
        data
    );

}



function renderMistakes(
    mistakes
) {

    const container =
        document.getElementById(
            "mistakeList"
        );


    if (!mistakes.length) {

        container.innerHTML =
            "No mistakes recorded yet.";

        return;

    }


    container.innerHTML =
        mistakes.map(
            item => `

            <div class="result-box">

                <strong>
                    ${item.subject}
                </strong>

                <br>

                ${item.question}

                <br>

                Correct:
                ${item.correct_answer}

            </div>

            `
        ).join("");

}



async function clearMistakes() {

    localStorage.removeItem(
        "prepsenseMistakes"
    );


    if (currentUser) {

        await supabaseClient
            .from(
                "mistakes"
            )
            .delete()
            .eq(
                "user_id",
                currentUser.id
            );

    }


    renderMistakes([]);

}



/* =========================================================
   STUDY PLAN
========================================================= */

function generateStudyPlan(
    weakest
) {

    const plans = {

        DSA: [

            "Arrays",

            "Searching",

            "Sorting",

            "Binary Search",

            "Linked List",

            "Mock Test",

            "Revision"

        ],


        "CS Core": [

            "OOPs",

            "DBMS",

            "Operating System",

            "Computer Networks",

            "Flashcards",

            "Mock Test",

            "Revision"

        ],


        Verbal: [

            "Grammar",

            "Tenses",

            "Vocabulary",

            "Sentence Correction",

            "Reading",

            "Mock Test",

            "Revision"

        ],


        Aptitude: [

            "Percentage",

            "Ratio",

            "Speed Time Distance",

            "Number Series",

            "Reasoning",

            "Mock Test",

            "Revision"

        ]

    };


    const plan =
        plans[weakest];


    const container =
        document.getElementById(
            "studyPlan"
        );


    container.innerHTML =
        "";


    plan.forEach(
        (task,index) => {

            container.innerHTML += `

                <div class="task-item">

                    <input
                        type="checkbox"
                        id="studyTask${index}"
                        onchange="updateStudyProgress()"
                    >

                    ${task}

                </div>

            `;

        }
    );

}



async function updateStudyProgress() {

    const tasks =
        document.querySelectorAll(
            "#studyPlan .task-item"
        );


    let completed =
        0;


    const databaseTasks = [];


    tasks.forEach(
        task => {

            const checkbox =
                task.querySelector(
                    "input"
                );


            const taskName =
                task.textContent
                    .trim();


            if (
                checkbox.checked
            ) {

                completed++;

                task.classList.add(
                    "completed"
                );

            }
            else {

                task.classList.remove(
                    "completed"
                );

            }


            databaseTasks.push({

                task_name:
                    taskName,

                is_completed:
                    checkbox.checked

            });

        }
    );


    const percentage =
        tasks.length
            ? Math.round(
                completed /
                tasks.length *
                100
            )
            : 0;


    document.getElementById(
        "studyProgressBar"
    ).style.width =
        `${percentage}%`;


    document.getElementById(
        "studyProgressText"
    ).innerText =
        `${percentage}% completed`;


    if (
        currentUser &&
        databaseTasks.length
    ) {

        await supabaseClient
            .from(
                "study_progress"
            )
            .delete()
            .eq(
                "user_id",
                currentUser.id
            );


        await supabaseClient
            .from(
                "study_progress"
            )
            .insert(

                databaseTasks.map(
                    task => ({

                        user_id:
                            currentUser.id,

                        ...task

                    })
                )

            );

    }

}



/* =========================================================
   FLASHCARDS
========================================================= */

const flashcards = {

    DSA: [

        {
            id: "d1",
            q: "Binary Search complexity?",
            a: "O(log n)"
        },

        {
            id: "d2",
            q: "Stack principle?",
            a: "LIFO"
        }

    ],


    CS_CORE: [

        {
            id: "c1",
            q: "What is Encapsulation?",
            a: "Hiding internal data."
        },

        {
            id: "c2",
            q: "What is a Primary Key?",
            a: "A unique row identifier."
        }

    ],


    VERBAL: [

        {
            id: "v1",
            q: "Past tense of go?",
            a: "Went"
        }

    ],


    APTITUDE: [

        {
            id: "a1",
            q: "Distance formula?",
            a: "Speed × Time"
        }

    ]

};



function loadFlashcards() {

    currentFlashcardSubject =
        document.getElementById(
            "flashcardSubject"
        ).value;


    currentFlashcardIndex =
        0;


    displayFlashcard();

}



function displayFlashcard() {

    const cards =
        flashcards[
            currentFlashcardSubject
        ];


    const card =
        cards[
            currentFlashcardIndex
        ];


    document.getElementById(
        "flashcardQuestion"
    ).innerText =
        card.q;


    document.getElementById(
        "flashcardAnswer"
    ).innerText =
        card.a;


    document.getElementById(
        "flashcardNumber"
    ).innerText =
        `Card ${
            currentFlashcardIndex + 1
        } / ${cards.length}`;


    document.getElementById(
        "flashcardInner"
    ).classList.remove(
        "flipped"
    );

}



function flipFlashcard() {

    document.getElementById(
        "flashcardInner"
    ).classList.toggle(
        "flipped"
    );

}



function nextFlashcard() {

    const cards =
        flashcards[
            currentFlashcardSubject
        ];


    currentFlashcardIndex =
        (
            currentFlashcardIndex +
            1
        ) %
        cards.length;


    displayFlashcard();

}



function previousFlashcard() {

    const cards =
        flashcards[
            currentFlashcardSubject
        ];


    currentFlashcardIndex =
        (
            currentFlashcardIndex -
            1 +
            cards.length
        ) %
        cards.length;


    displayFlashcard();

}



function markFlashcardKnown() {

    const card =
        flashcards[
            currentFlashcardSubject
        ][
            currentFlashcardIndex
        ];


    knownFlashcards.add(
        card.id
    );


    localStorage.setItem(
        "prepsenseKnownFlashcards",
        JSON.stringify(
            [...knownFlashcards]
        )
    );


    removeRevisionCard(
        card.id
    );


    nextFlashcard();

}



function markFlashcardRevision() {

    const card =
        flashcards[
            currentFlashcardSubject
        ][
            currentFlashcardIndex
        ];


    let queue =
        JSON.parse(
            localStorage.getItem(
                "prepsenseRevisionQueue"
            ) || "[]"
        );


    if (
        !queue.find(
            item =>
                item.id === card.id
        )
    ) {

        queue.push({

            ...card,

            subject:
                currentFlashcardSubject

        });

    }


    localStorage.setItem(
        "prepsenseRevisionQueue",
        JSON.stringify(queue)
    );


    renderRevisionQueue();

    nextFlashcard();

}



function removeRevisionCard(
    id
) {

    let queue =
        JSON.parse(
            localStorage.getItem(
                "prepsenseRevisionQueue"
            ) || "[]"
        );


    queue =
        queue.filter(
            card =>
                card.id !== id
        );


    localStorage.setItem(
        "prepsenseRevisionQueue",
        JSON.stringify(queue)
    );


    renderRevisionQueue();

}



function renderRevisionQueue() {

    const queue =
        JSON.parse(
            localStorage.getItem(
                "prepsenseRevisionQueue"
            ) || "[]"
        );


    const container =
        document.getElementById(
            "revisionQueueList"
        );


    if (!queue.length) {

        container.innerHTML =
            "🎉 Revision queue is empty.";

        return;

    }


    container.innerHTML =
        queue.map(
            card => `

            <div class="result-box">

                <strong>
                    ${card.subject}
                </strong>

                <br>

                ${card.q}

                <br>

                Answer:
                ${card.a}

            </div>

            `
        ).join("");

}



/* =========================================================
   ADAPTIVE TEST
========================================================= */

const adaptiveQuestions = [

    {
        q: "Which structure follows LIFO?",
        options: [
            "Queue",
            "Stack",
            "Tree"
        ],
        correct: 1
    },

    {
        q: "Binary Search requires?",
        options: [
            "Sorted data",
            "Random data",
            "Graph"
        ],
        correct: 0
    },

    {
        q: "What prevents infinite recursion?",
        options: [
            "Base case",
            "Array",
            "Hashing"
        ],
        correct: 0
    }

];



function startAdaptiveAssessment() {

    adaptiveIndex =
        0;


    adaptiveCorrect =
        0;


    document.getElementById(
        "adaptiveBox"
    ).style.display =
        "block";


    document.getElementById(
        "adaptiveResultCard"
    ).style.display =
        "none";


    showAdaptiveQuestion();

}



function showAdaptiveQuestion() {

    if (
        adaptiveIndex >=
        adaptiveQuestions.length
    ) {

        finishAdaptiveAssessment();

        return;

    }


    const question =
        adaptiveQuestions[
            adaptiveIndex
        ];


    document.getElementById(
        "adaptiveCounter"
    ).innerText =
        `Question ${
            adaptiveIndex + 1
        } / ${
            adaptiveQuestions.length
        }`;


    document.getElementById(
        "adaptiveQuestion"
    ).innerText =
        question.q;


    const container =
        document.getElementById(
            "adaptiveOptions"
        );


    container.innerHTML =
        "";


    question.options.forEach(
        (option,index) => {

            const button =
                document.createElement(
                    "button"
                );


            button.innerText =
                option;


            button.onclick =
                () => {

                    if (
                        index ===
                        question.correct
                    ) {

                        adaptiveCorrect++;

                    }


                    adaptiveIndex++;

                    showAdaptiveQuestion();

                };


            container.appendChild(
                button
            );

        }
    );

}



function finishAdaptiveAssessment() {

    document.getElementById(
        "adaptiveBox"
    ).style.display =
        "none";


    document.getElementById(
        "adaptiveResultCard"
    ).style.display =
        "block";


    const score =
        Math.round(
            adaptiveCorrect /
            adaptiveQuestions.length *
            100
        );


    document.getElementById(
        "adaptiveFinalScore"
    ).innerText =
        `${score}%`;


    document.getElementById(
        "adaptiveFinalMessage"
    ).innerText =
        score >= 70
            ? "Good performance ✅"
            : "Revise and try again.";

}



/* =========================================================
   PROGRESS
========================================================= */

function saveProgressLocal(
    dsa,
    core,
    verbal,
    aptitude,
    readiness
) {

    let history =
        JSON.parse(
            localStorage.getItem(
                "prepsenseHistory"
            ) || "[]"
        );


    history.push({

        dsa,
        core,
        verbal,
        aptitude,
        readiness

    });


    localStorage.setItem(
        "prepsenseHistory",
        JSON.stringify(history)
    );


    renderProgress();

}



function renderProgress() {

    const history =
        JSON.parse(
            localStorage.getItem(
                "prepsenseHistory"
            ) || "[]"
        );


    const historyList =
        document.getElementById(
            "historyList"
        );


    historyList.innerHTML =
        history.map(
            (item,index) => `

            <div class="result-box">

                Attempt ${index + 1}

                <br>

                Readiness:
                ${item.readiness}%

            </div>

            `
        ).join("");


    const canvas =
        document.getElementById(
            "progressChart"
        );


    if (
        !canvas ||
        !history.length
    ) {
        return;
    }


    if (
        progressChartInstance
    ) {

        progressChartInstance
            .destroy();

    }


    progressChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "line",

                data: {

                    labels:
                        history.map(
                            (_,index) =>
                                `Attempt ${index + 1}`
                        ),

                    datasets: [

                        {

                            label:
                                "Readiness",

                            data:
                                history.map(
                                    item =>
                                        item.readiness
                                )

                        }

                    ]

                }

            }
        );

}



/* =========================================================
   RADAR
========================================================= */

function updateSkillRadar(
    dsa = 0,
    core = 0,
    verbal = 0,
    aptitude = 0
) {

    const canvas =
        document.getElementById(
            "skillRadarChart"
        );


    if (!canvas) {
        return;
    }


    if (
        skillRadarChartInstance
    ) {

        skillRadarChartInstance
            .destroy();

    }


    skillRadarChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "radar",

                data: {

                    labels: [

                        "DSA",

                        "CS Core",

                        "Verbal",

                        "Aptitude"

                    ],

                    datasets: [

                        {

                            label:
                                "Skill Level",

                            data: [

                                dsa,

                                core,

                                verbal,

                                aptitude

                            ]

                        }

                    ]

                },

                options: {

                    scales: {

                        r: {

                            min: 0,

                            max: 100

                        }

                    }

                }

            }
        );

}



/* =========================================================
   PROFILE PHOTO
========================================================= */

function handleProfilePhoto(
    event
) {

    const file =
        event.target.files[0];


    if (!file) {
        return;
    }


    const reader =
        new FileReader();


    reader.onload =
        function(e) {

            localStorage.setItem(
                "prepnexaProfilePhoto",
                e.target.result
            );


            updateProfilePhotoUI();

        };


    reader.readAsDataURL(
        file
    );

}



function removeProfilePhoto() {

    localStorage.removeItem(
        "prepnexaProfilePhoto"
    );


    updateProfilePhotoUI();

}



function updateProfilePhotoUI() {

    const photo =
        localStorage.getItem(
            "prepnexaProfilePhoto"
        );


    const saved =
        JSON.parse(
            localStorage.getItem(
                "prepsenseProfile"
            ) || "{}"
        );


    const initial =
        saved.name
            ? saved.name[0]
                .toUpperCase()
            : "U";


    [

        document.getElementById(
            "avatarText"
        ),

        document.getElementById(
            "profilePhotoPreview"
        )

    ].forEach(
        element => {

            if (!element) {
                return;
            }


            if (photo) {

                element.style.backgroundImage =
                    `url("${photo}")`;


                element.innerText =
                    "";

            }
            else {

                element.style.backgroundImage =
                    "";


                element.innerText =
                    initial;

            }

        }
    );

}



/* =========================================================
   APPEARANCE
========================================================= */

function setModePreference(
    mode
) {

    localStorage.setItem(
        "prepnexaModePreference",
        mode
    );


    applyAppearance();

}



function setThemePreference(
    theme
) {

    localStorage.setItem(
        "prepnexaThemePreference",
        theme
    );


    applyAppearance();

}



function applyAppearance() {

    let mode =
        localStorage.getItem(
            "prepnexaModePreference"
        ) || "system";


    const theme =
        localStorage.getItem(
            "prepnexaThemePreference"
        ) || "indigo";


    if (mode === "system") {

        mode =
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches
                ? "dark"
                : "light";

    }


    document.documentElement
        .setAttribute(
            "data-mode",
            mode
        );


    document.documentElement
        .setAttribute(
            "data-theme",
            theme
        );

}



/* =========================================================
   DIAGNOSIS
========================================================= */

async function diagnoseMistake() {

    const description =
        document.getElementById(
            "mistakeInput"
        ).value.trim();


    if (!description) {
        return;
    }


    try {

        const response =
            await fetch(

                "https://prepnexa-api.onrender.com/diagnose?description=" +

                encodeURIComponent(
                    description
                )

            );


        const data =
            await response.json();


        document.getElementById(
            "diagnosisResult"
        ).innerText =
            data.diagnosis;


        document.getElementById(
            "suggestion"
        ).innerText =
            data.suggestion;

    }
    catch {

        document.getElementById(
            "diagnosisResult"
        ).innerText =
            "Backend not running";


        document.getElementById(
            "suggestion"
        ).innerText =
            "Start FastAPI server first.";

    }

}



/* =========================================================
   START APP
========================================================= */

window.addEventListener(
    "load",
    async function() {

        applyAppearance();


        const known =
            JSON.parse(
                localStorage.getItem(
                    "prepsenseKnownFlashcards"
                ) || "[]"
            );


        knownFlashcards =
            new Set(known);


        loadFlashcards();

        renderRevisionQueue();

        renderProgress();

        updateProfilePhotoUI();


        await checkAuthentication();

    }
);