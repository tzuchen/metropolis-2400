# Metropolis Completion Workflow

For every completed code-changing task in this repository:

1. Run the relevant verification, then restart the Vite development server on port 2400 with host `0.0.0.0`. Stop an existing process bound to that port before starting the replacement.
2. Inspect `git status`, commit the verified task changes with a focused message, and push the current branch to `origin`.
3. Do not include unrelated pre-existing user changes in a commit. If the task cannot be separated safely, report the conflict before committing.
