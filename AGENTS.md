# Metropolis Completion Workflow

For every completed code-changing task in this repository:

1. Run the relevant verification, then restart the Vite development server on port 2400 with host `0.0.0.0`. Stop an existing process bound to that port before starting the replacement.
2. Inspect `git status`, commit the verified task changes with a focused message, and push the current branch to `origin`.
3. Do not include unrelated pre-existing user changes in a commit. If the task cannot be separated safely, report the conflict before committing.

## Local LLM Code Review

Use `/home/orin/.local/bin/local-llm` for read-only code reviews. It defaults to non-thinking mode; do not pass `--thinking` for routine review so findings are returned directly in the output.

- Target at most about 500 lines or one focused module per prompt.
- The prompt must prohibit patches, commands, writes, and external side effects.
- Report only evidence-backed findings, including severity, location, risk, and minimal verification.
- This is read-only and does not authorize edits, tests that write files, commits, pushes, or server restarts.

Start longer review commands with `setsid ... > /tmp/review.stderr 2>&1 < /dev/null &` rather than `nohup` or background heredocs, because `setsid` detaches the process from Codex process-group cleanup. After completion, poll and read the `/tmp` output file and stderr.

setsid /home/orin/.local/bin/local-llm \
  -f <file> \
  -p "<review prompt>" \
  -s "<system prompt>" \
  -m <token budget> \
  -o /tmp/report.md > /tmp/review.stderr 2>&1 < /dev/null &
