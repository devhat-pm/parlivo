# Architecture decision records

One file per decision, numbered sequentially: `NNNN-kebab-title.md`. Write one for any new dependency or architectural change (CLAUDE.md, standing rule 3). Never edit an accepted ADR's decision; supersede it with a new ADR and set the old one's status to "Superseded by NNNN".

Template:

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD
- Source: ARCHITECTURE.md section(s) or prompt

## Context

## Decision

## Consequences
```

| ADR                                                       | Title                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [0001](0001-livekit-agents-over-custom-media-services.md) | LiveKit Agents instead of custom media services and a message bus on the audio path |
| [0002](0002-translation-model-size-bandwidth-bound.md)    | Translation model size is set by L4 memory bandwidth: Qwen3 4B int8 by default      |
