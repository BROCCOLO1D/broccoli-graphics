# Example inputs

These committed fixtures power the deterministic documentation pipeline used by `npm run examples` to generate README previews.

| Fixture | Purpose |
| --- | --- |
| `doll-face.jpg` | Project example fixture used for static dithering and ASCII previews. |
| `sun-runner.jpg` | Maintainer-provided meme example fixture used for static comparison previews. |
| `statement-source.gif` | Maintainer-provided animated GIF fixture used for the README hero conversion. |

The runtime package stays dependency-free; image decoding and GIF encoding are limited to dev-only documentation generation.
