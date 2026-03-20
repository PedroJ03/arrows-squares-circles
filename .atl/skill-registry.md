# Skill Registry

**Orchestrator use only.** Read this registry once per session to resolve skill paths, then pass pre-resolved paths directly to each sub-agent's launch prompt. Sub-agents receive the path and load the skill directly — they do NOT read this registry.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When writing Go tests, using teatest, or adding test coverage. | go-testing | /home/pedroj/.claude/skills/go-testing/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI. | skill-creator | /home/pedroj/.claude/skills/skill-creator/SKILL.md |

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| (none) |  |  |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
