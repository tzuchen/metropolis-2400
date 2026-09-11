# Metropolis Completion Workflow

For every completed code-changing task in this repository:

1. Run the relevant verification, then restart the Vite development server on port 2400 with host `0.0.0.0`. Stop an existing process bound to that port before starting the replacement.
2. Inspect `git status`, commit the verified task changes with a focused message, and push the current branch to `origin`.
3. Do not include unrelated pre-existing user changes in a commit. If the task cannot be separated safely, report the conflict before committing.

## Local LLM Code Review

For read-only code reviews, call the local OpenAI-compatible endpoint `http://localhost:8000/v1/chat/completions` with model `spark-vllm-docker` and `chat_template_kwargs.enable_thinking` set to `false`, so conclusions are returned in `message.content` rather than `reasoning_content`.

- Split large reviews into focused modules or files.
- The prompt must prohibit patches, commands, writes, and external side effects.
- Report only evidence-backed findings, including severity, location, risk, and minimal verification.
- This is read-only and does not authorize edits, tests that write files, commits, pushes, or server restarts.
