import os
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types


app = FastAPI(title="PrepNexa API")


# -----------------------------
# CORS
# -----------------------------

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
# Rule-based diagnosis
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
# Request model
# -----------------------------

class AIRequest(BaseModel):
    prompt: str


# -----------------------------
# Home
# -----------------------------

@app.get("/")
def home():

    return {
        "message": "PrepNexa API is working!",
        "ai_enabled": bool(GEMINI_API_KEY)
    }


# -----------------------------
# Diagnosis
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
# Gemini AI
# -----------------------------

@app.post("/ai")
def ai_response(request: AIRequest):

    if not client:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured."
        )

    prompt = request.prompt.strip()

    if not prompt:
        raise HTTPException(
            status_code=400,
            detail="Prompt cannot be empty."
        )

    try:

        response = None

        for attempt in range(3):

            try:

                response = client.models.generate_content(
                    model="gemini-3.5-flash-lite",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=(
                            "You are PrepNexa AI, a placement preparation coach "
                            "for engineering students. Help with DSA, Aptitude, "
                            "Verbal, OOPs, DBMS, OS, Computer Networks and interviews. "
                            "Give clear, short and practical answers. "
                            "Use simple Hinglish when useful."
                        ),
                        max_output_tokens=500,
                        temperature=0.4
                    )
                )

                break

            except Exception as e:

                error_text = str(e)

                print(
                    f"Gemini attempt {attempt + 1} failed:",
                    error_text
                )

                if (
                    "503" in error_text
                    or "UNAVAILABLE" in error_text
                ) and attempt < 2:

                    wait_time = 2 ** attempt

                    print(
                        f"Gemini busy. Retrying in {wait_time} seconds..."
                    )

                    time.sleep(wait_time)

                    continue

                raise

        if response is None:
            raise Exception("Gemini did not return a response.")

        answer = response.text

        if not answer:
            answer = "I could not generate an answer. Please try again."

        return {
            "response": answer
        }

    except Exception as e:

        print("Gemini error:", str(e))

        raise HTTPException(
            status_code=500,
            detail="Gemini AI request failed."
        )