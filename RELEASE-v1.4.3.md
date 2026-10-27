# Norwood.ma v1.4.3 — Facebook score-share caption handling

**Release date:** October 27, 2026

## User-facing changes

- Removed Facebook’s unsupported `quote` parameter from the share URL.
- The Facebook route now copies the score caption and quiz link and downloads the score graphic for attachment while opening Facebook’s composer.
- Updated the Facebook destination chooser to explain that Facebook controls the post text field.

## Platform limitation

Facebook does not allow web share links to prefill custom post text. The quiz link is shared through the link preview; users can paste the copied caption and attach the downloaded score graphic before posting.
