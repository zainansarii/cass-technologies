# Cass Technologies Ltd

The public company website for Cass Technologies Ltd, the UK software company behind Macros, Petey and Cass.

## Preview locally

Run `python3 -m http.server 8000` from the repository root and visit `http://localhost:8000`. The site serves plain HTML and CSS, with optional canvas interactions. There are no build dependencies.

## Publish

GitHub Pages serves the root of the `main` branch. The production domain is `getcass.com`. All local resources use relative paths so a project-page URL also works before the custom domain is connected.

## Design and assets

The Cass wordmark and journal-dot treatment are adapted from the original Cass web app. The company header uses outlined lowercase TAN Nimbus lettering. Hovering over the hero grid reveals four dot patterns. Tapping the grid or activating it with the keyboard also changes the pattern. A static wave print is available without JavaScript. The portfolio uses the Macros, Petey and Cass wordmarks. Fraunces, JetBrains Mono and the Momo Trust Display face in the Macros wordmark are distributed under the SIL Open Font License. Their notices are in `licenses/`.
