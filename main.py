
import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai


# ==========================================
# 1. APP CONFIGURATION
# ==========================================

app = FastAPI(
    title="PrepNexa API",
    description="Placement Readiness and AI Coaching API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# 2. GEMINI CONFIGURATION
# ==========================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash-lite"
)

gemini_client = None

if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )


# ==========================================
# 3. AI COACH INSTRUCTIONS
# ==========================================

AI_INSTRUCTIONS = """
You are PrepNexa AI Coach, a friendly and knowledgeable
placement preparation assistant.

Your purpose is to help students prepare for internships,
technical interviews and campus placements.

You can help with:

1. Data Structures and Algorithms
2. Java and Python programming
3. OOPs
4. DBMS and SQL
5. Operating Systems
6. Computer Networks
7. Aptitude and Logical Reasoning
8. Verbal Ability
9. HR and Technical Interviews
10. Resume and Placement Preparation

Teaching rules:

- Explain concepts in simple language.
- Understand the student's question before answering.
- Use Hinglish when the student uses Hinglish.
- Use examples wherever useful.
- Explain coding questions step by step.
- Include dry runs for DSA questions when helpful.
- Explain time and space complexity for algorithms.
- Compare brute force and optimized approaches.
- Keep answers structured and easy to understand.
- Never invent facts or pretend code was executed.
- If a question is unclear, ask for clarification.

Be supportive, patient and beginner-friendly.
"""


# ==========================================
# 4. REQUEST MODELS
# ==========================================

class ChatMessage(BaseModel):
    role: str
    content: str


class AIRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    question: Optional[str] = None

    history: list[ChatMessage] = Field(
        default_factory=list
    )


# ==========================================
# 5. MISTAKE DIAGNOSIS
# ==========================================

def diagnose_mistake(description: str):

    description = description.lower()

    if "duplicate" in description:
        return "Duplicate Handling Error"

    elif "index" in description or "out of range" in description:
        return "Boundary Error"

    elif "base case" in description or "recursion" in description:
        return "Recursion Error"

    elif "loop" in description:
        return "Loop Logic Error"

    elif "null" in description or "none" in description:
        return "Null Handling Error"

    elif "infinite" in description:
        return "Infinite Loop Error"

    elif "overflow" in description:
        return "Overflow Error"

    else:
        return "General Logic Error"


def give_suggestion(diagnosis: str):

    suggestions = {
        "Duplicate Handling Error":
            "Use a set or frequency counter to handle duplicate values.",

        "Boundary Error":
            "Check array indexes, loop limits and boundary conditions.",

        "Recursion Error":
            "Check your base case and recursive function calls.",

        "Loop Logic Error":
            "Check your loop condition and increment or decrement logic.",

        "Null Handling Error":
            "Check whether a variable contains a valid value before accessing it.",

        "Infinite Loop Error":
            "Make sure your loop condition eventually becomes false.",

        "Overflow Error":
            "Check the data type and maximum value supported by the variable.",

        "General Logic Error":
            "Dry run your code step by step and inspect variable values."
    }

    return suggestions.get(
        diagnosis,
        suggestions["General Logic Error"]
    )


# ==========================================
# 6. HOME ROUTE
# ==========================================

@app.get("/")
def home():

    return {
        "message": "PrepNexa API is working!",
        "status": "online"
    }


# ==========================================
# 7. HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "gemini_configured": gemini_client is not None,
        "model": GEMINI_MODEL
    }


# ==========================================
# 8. MISTAKE DIAGNOSIS API
# ==========================================

@app.get("/diagnose")
def diagnose(description: str):

    diagnosis = diagnose_mistake(description)

    suggestion = give_suggestion(diagnosis)

    return {
        "mistake": description,
        "diagnosis": diagnosis,
        "suggestion": suggestion
    }


# ==========================================
# 9. PREPNEXA AI COACH API
# ==========================================

@app.post("/ai")
def ai_coach(request: AIRequest):

    # Accept different frontend request field names
    user_message = (
        request.message
        or request.prompt
        or request.question
        or ""
    ).strip()

    if not user_message:
        raise HTTPException(
            status_code=400,
            detail="Please enter a question."
        )

    if len(user_message) > 8000:
        raise HTTPException(
            status_code=400,
            detail="Your question is too long. Please shorten it."
        )

    if gemini_client is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured on the server."
        )

    # Build conversation context
    conversation = AI_INSTRUCTIONS + "\n\n"

    for item in request.history[-8:]:

        if item.role.lower() not in ["user", "assistant", "model"]:
            continue

        conversation += (
            f"{item.role.upper()}: "
            f"{item.content[:4000]}\n"
        )

    conversation += (
        f"\nSTUDENT QUESTION: {user_message}\n"
        "\nGive a clear and helpful answer."
    )

    try:

        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=conversation
        )

        answer = response.text

        if not answer:
            raise HTTPException(
                status_code=502,
                detail="AI returned an empty response. Please try again."
            )

        return {
            "answer": answer,
            "response": answer,
            "reply": answer,
            "model": GEMINI_MODEL
        }

    except HTTPException:
        raise

    except Exception as error:

        error_message = str(error).lower()

        print("Gemini API Error:", str(error))

        # Free-tier quota exceeded
        if (
            "429" in error_message
            or "resource_exhausted" in error_message
            or "quota" in error_message
        ):

            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API free-tier quota has been reached. "
                    "Please wait until your quota resets and try again."
                )
            )

        # Temporary model/server issue
        if (
            "503" in error_message
            or "unavailable" in error_message
        ):

            raise HTTPException(
                status_code=503,
                detail=(
                    "Gemini is temporarily busy. "
                    "Please try again after some time."
                )
            )

        raise HTTPException(
            status_code=502,
            detail="AI request failed. Please try again later."
        )


# ==========================================
# 10. RUN LOCALLY
# ==========================================

# Local command:
# python3 -m uvicorn main:app --reload --port 8001

# Render start command:
# uvicorn main:app --host 0.0.0.0 --port $PORT
