# Links archive design audit

target: local `/links/` on `clyons/feedly-stars-to-til`

goal: Let readers scan recent saves or reliably retrieve one item from a 2,625-link archive without losing the site's calm editorial character.

| # | area | issue | sev | fix | eff | status |
|---|---|---|---|---|---|---|
| 1 | accessibility | Year, item-action, and pagination links rendered only 14px high. Spacing met the WCAG 2.2 AA exception in several cases, but the controls missed the project's 44×44px comfort target. | HIGH | Give every Links utility target a minimum 44px hit area and preserve the cardless visual treatment. | S | Fixed |
| 2 | clarity | The archive search had no visible submit action, and its long placeholder was clipped at desktop width. Keyboard submission worked but was implicit. | MED | Add a visible Search button and use the concise `Search links` prompt while retaining the accessible label and GET fallback. | S | Fixed |

## What should stay

- The large Links title, collection/source count, and chronological ledger create a clear hierarchy without turning the archive into a dashboard.
- Fifty-row static pagination and Pagefind's bounded results keep the browser document and search rendering proportionate to the collection.
- Local `Notes & details` and external `Read at…` actions correctly distinguish durable site context from the publisher destination.
- Search, dated archives, RSS, canonical URLs, visible focus, reduced-motion handling, light/dark themes, and the 320px no-overflow floor are already coherent.

## Verdict

READY after the two direct fixes. No redesign is justified: the current visual system is more legible and distinctive than the card-grid bookmark-manager convention, and it follows current archive patterns without copying their dated small-target ergonomics.

Automated keyboard, contrast, target-size, interaction, and responsive checks are release evidence, not a claim of full WCAG conformance. A manual screen-reader pass remains appropriate after production deployment.
