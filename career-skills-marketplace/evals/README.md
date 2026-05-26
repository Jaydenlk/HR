# Eval Fixtures

This directory contains test fixtures for validating Career Skills Marketplace behavior. Each fixture describes a scenario, specifies which skills should be invoked, and defines assertions over the output.

---

## Directory Layout

```
evals/
  README.md             — this file
  workflow/             — end-to-end workflow fixtures (10 files)
    jd-match-resume-chain.json
    profile-to-career-path.json
    jd-too-short.json
    fabrication-refused.json
    source-conflict-propagation.json
    low-quality-source-filtered.json
    no-adapters-degradation.json
    china-market-case.json
    cross-language-jd-resume.json
    unethical-request-refused.json
```

---

## Fixture Format

Each fixture is a JSON object with the following fields:

```json
{
  "name": "kebab-case-identifier",
  "description": "One sentence: what behavior this fixture validates.",
  "input": {
    "user_message": "The user's natural-language input.",
    "context": {
      "resume_text": "Optional resume content.",
      "jd_text": "Optional job description.",
      "additional_context": {}
    }
  },
  "expected_skills_invoked": ["skill-a", "skill-b"],
  "expected_output_properties": {
    "confidence_level": "low|medium|high",
    "has_source_citations": true,
    "refuses_fabrication": false
  },
  "assertions": [
    {
      "type": "assertion-type",
      "path": "dot.separated.output.path",
      "expected": "expected value or pattern"
    }
  ]
}
```

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier, kebab-case |
| `description` | Yes | One sentence explaining the behavior under test |
| `input.user_message` | Yes | The raw user input string |
| `input.context` | No | Structured context passed alongside the message |
| `expected_skills_invoked` | Yes | Ordered or unordered list of skills the orchestrator should call |
| `expected_output_properties` | Yes | Top-level properties expected on the final output |
| `assertions` | Yes | Array of one or more verifiable assertions |

---

## Assertion Types

| Type | Checks |
|------|--------|
| `contains` | Output path value contains the expected substring |
| `equals` | Output path value equals the expected value exactly |
| `not_present` | Output path does not exist in the response |
| `confidence_below` | Confidence score is strictly less than the threshold |
| `confidence_above` | Confidence score is strictly greater than the threshold |
| `skill_invoked` | A named skill appears in the execution trace |
| `skill_not_invoked` | A named skill does not appear in the execution trace |
| `refusal_present` | The output contains a structured refusal block |
| `source_cited` | At least one source citation is present |

---

## How to Add a New Fixture

1. Create a new `.json` file in `evals/workflow/` with a descriptive kebab-case name.
2. Fill in all required fields following the format above.
3. Include at least one `assertions` entry — a fixture with an empty assertions array will be rejected in review.
4. Do not include real personal data. All names, schools, and companies in examples must be synthetic or anonymized.
5. Add a pointer in the `evals/README.md` directory listing (the table above) describing what the fixture tests.

---

## Running Evals

Fixtures are consumed by the eval harness (when integrated) or manually inspected during code review. To validate JSON syntax locally:

```bash
# Validate all workflow fixtures (requires Python 3)
python3 -c "
import json, os, glob
for f in glob.glob('evals/workflow/*.json'):
    with open(f) as fp:
        json.load(fp)
    print('OK', f)
"
```

All 10 current fixtures must parse without errors before any PR touching `evals/` can be merged.
