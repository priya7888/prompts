# Evaluators Custom Metric Rules

This directory contains analytical formulas and assertion scripts used by the evaluation engine.
Automated metrics currently supported:
- **String Containment**: Validates output contains standard substrings.
- **Length Constraint**: Verifies token response brevity.
- **Semantic Similarity / LLM-as-a-Judge**: Custom weights blending correctness and coherence.
