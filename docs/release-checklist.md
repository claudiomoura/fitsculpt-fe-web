# Release Checklist

## Purpose

This checklist defines the minimum release standard for FitSculpt beta drops.

A release should be fast but not careless.

## Release Standard

A release is ready when:
- the intended change is actually complete
- the highest-known risks are understood
- the founder can make a clear go/no-go decision
- user-facing confusion has been considered
- release notes or communication are clear enough for the beta context

## Checklist

### Scope
- [ ] Release scope is clear.
- [ ] Included Linear issues are identified.
- [ ] Out-of-scope items are explicitly excluded.

### Product Readiness
- [ ] Core intended flow works for this release.
- [ ] No known blocker remains for the target beta users.
- [ ] Known issues are documented if they are acceptable.

### Beta Fit
- [ ] This release improves usefulness, clarity, or completeness.
- [ ] This release does not create avoidable confusion for beta users.
- [ ] This release still fits the current beta scope.

### Documentation And Tracking
- [ ] Relevant docs in `GitHub /docs` are updated if operating rules changed.
- [ ] Linear reflects the real status of release work.
- [ ] Any important decision is logged in `docs/decision-log.md`.
- [ ] Important context has been saved to memory.

### Communication
- [ ] Founder has a short release summary.
- [ ] User-facing explanation is ready if needed.
- [ ] Known limitations are stated plainly if they matter.

### Approval
- [ ] Founder has reviewed the release state.
- [ ] Founder has made the final go/no-go decision.

## Release Summary Template

```markdown
# Release Summary

Release name / date:

## Objective
[what this release is meant to achieve]

## Included
- item
- item

## Known Issues
- item
- item

## Beta Impact
- usefulness:
- clarity:
- completeness:

## Risks
- item

## Recommendation
Go / No-Go

## Founder Decision
Approved / Not approved
```

## Explicitly Undecided

The following are not fixed yet:
- naming convention for releases
- formal versioning scheme
- exact test checklist by release type
