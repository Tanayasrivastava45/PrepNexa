import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai


app = FastAPI(title="PrepNexa API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Gemini setup
# -----------------------------

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = None

if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)


# -----------------------------
# Existing rule-based diagnosis
# -----------------------------

def diagnose_mistake(description):
    description = description.lower()

    if "duplicate" in description:
        return "Duplicate Handling Error"

    elif "index" in description:
        return "Boundary Error"

    elif "base case" in description or "recursion" in description:
        return "Recursion Error"

    elif "loop" in description:
        return "Loop Logic Error"

    elif "null" in description or "none" in description:
        return "Null Handling Error"

    else:
        return "General Logic Error"


def give_suggestion(diagnosis):

    if diagnosis == "Duplicate Handling Error":
        return "Use a set or frequency count to handle duplicates."

    elif diagnosis == "Boundary Error":
        return "Check loop limits and array indexes carefully."

    elif diagnosis == "Recursion Error":
        return "Check your base case and recursive call."

    elif diagnosis == "Loop Logic Error":
        return "Check loop condition and increment/decrement logic."

    elif diagnosis == "Null Handling Error":
        return "Check whether the value exists before accessing it."

    else:
        return "Dry run your code step by step and inspect variable values."


# -----------------------------
# Gemini request model
# -----------------------------

class AIRequest(BaseModel):
    prompt: str


# -----------------------------
# Home route
# -----------------------------

@app.get("/")
def home():
    return {
        "message": "PrepNexa API is working!",
        "ai_enabled": bool(GEMINI_API_KEY)
    }


# -----------------------------
# Existing diagnosis route
# -----------------------------

@app.get("/diagnose")
def diagnose(description: str):

    diagnosis = diagnose_mistake(description)

    suggestion = give_suggestion(diagnosis)

    return {
        "mistake": description,
        "diagnosis": diagnosis,
        "suggestion": suggestion
    }


# -----------------------------
# Gemini AI endpoint
# -----------------------------

@app.post("/ai")
def ai_response(request: AIRequest):

    if not client:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured."
        )

    if not request.prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="Prompt cannot be empty."
        )

    try:

        full_prompt = f"""
You are PrepNexa AI, a placement preparation assistant for engineering students.

Your job is to help students prepare for internships and placements.

You can help with:
- DSA
- Aptitude
- Verbal Ability
- OOPs
- DBMS
- Operating Systems
- Computer Networks
- Interview preparation
- Placement readiness
- Study plans
- Mistake analysis

Explain answers clearly and practically.

If the student is confused, explain in simple language.
If useful, use short bullet points.

Student question:

{request.prompt}
"""

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=full_prompt
        )

        return {
            "response": response.text
        }

    except Exception as e:

        print("Gemini error:", str(e))

        raise HTTPException(
            status_code=500,
            detail="Gemini AI request failed."
        )