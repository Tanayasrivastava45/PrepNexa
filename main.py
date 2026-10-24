from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DIAGNOSIS LOGIC
# =========================================================

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

        return "Null / None Handling Error"

    else:

        return "General Logic Error"


def give_suggestion(diagnosis):

    if diagnosis == "Duplicate Handling Error":

        return (
            "Use a set or frequency count "
            "to handle duplicate values."
        )

    elif diagnosis == "Boundary Error":

        return (
            "Check loop limits and "
            "array indexes carefully."
        )

    elif diagnosis == "Recursion Error":

        return (
            "Check your base case "
            "and recursive call."
        )

    elif diagnosis == "Loop Logic Error":

        return (
            "Check the loop condition, "
            "increment/decrement, and termination."
        )

    elif diagnosis == "Null / None Handling Error":

        return (
            "Check whether the value exists "
            "before accessing or using it."
        )

    else:

        return (
            "Dry run your logic step by step "
            "and check variable values."
        )


# =========================================================
# HOME ROUTE
# =========================================================

@app.get("/")
def home():

    return {
        "message": "PrepNexa API is working!"
    }


# =========================================================
# DIAGNOSIS ROUTE
# =========================================================

@app.get("/diagnose")
def diagnose(description: str):

    diagnosis = diagnose_mistake(description)

    suggestion = give_suggestion(diagnosis)

    return {

        "mistake": description,

        "diagnosis": diagnosis,

        "suggestion": suggestion

    }