# My personal site

**Live site: <https://abooraig.github.io/me/>**

| Page | What it contains |
| --- | --- |
| [Home](https://abooraig.github.io/me/) | Introduction, research interests, a small interactive demo on trusting noisy sensors, latest updates |
| [CV](https://abooraig.github.io/me/cv.html) | Education, experience, publication, awards, leadership, skills, languages, references. [PDF version](CV_AboOraig.pdf) |
| [Projects](https://abooraig.github.io/me/projects.html) | Featured research work and other projects, with links to the code repositories |
| [Contact](https://abooraig.github.io/me/contact.html) | Email, profiles and a contact form |

## How it is built

Plain HTML, CSS and JavaScript. There is no framework, no build step and no dependency to install.

- One shared stylesheet for the four pages, with colours, fonts and spacing defined as CSS variables at the top of `assets/css/styles.css`.
- Fonts (Inter, Space Grotesk, IBM Plex Mono) are self-hosted, so loading a page contacts no other host.
- The contact form posts to [Formspree](https://formspree.io), with inline validation and a honeypot field against spam. It is the only third-party service the site uses.
- The Home demo is a small canvas simulation in vanilla JavaScript. It is a toy to illustrate sensor trust, not my research model.

## Repository layout

```
.
├── index.html
├── cv.html
├── projects.html
├── contact.html
└── assets/
    ├── css/styles.css
    ├── js/                contact.js, sensor-demo.js
    ├── fonts/             self-hosted .woff2 files and their licences
    └── img/
        ├── og-image.png   link-preview card (1200 × 630)
        ├── profile/       portrait images
        └── projects/      project figures
```

## Credits and licence

- Fonts: [Inter](https://github.com/rsms/inter), [Space Grotesk](https://github.com/floriankarsten/space-grotesk) and [IBM Plex Mono](https://github.com/IBM/plex), all under the SIL Open Font License 1.1. The licence texts are in `assets/fonts/`.
- Text, CV, images and the share card: © 2026 Mohammed ABO ORAIG. All rights reserved.

## Contact

Through the [contact page](https://abooraig.github.io/me/contact.html), or my profiles on [GitHub](https://github.com/AboOraig), [LinkedIn](https://www.linkedin.com/in/mohammed-abo-oraig/) and [ORCID](https://orcid.org/0009-0007-1928-8496).
