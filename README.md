# Riftbound Vault - Prototype 1

A personal Riftbound collection manager inspired by the visual simplicity of Connor Lafferty's inventory page, but redesigned around a 12-box physical collection plus decks and loans.

## What already works

- Loads the latest Riftbound card catalog from the community `riftbound-cards` release when online.
- Visual card gallery with card images and quantity badges.
- Search by name, set, or card number.
- Filters by card type, domain, and set.
- Local inventory quantities with +1, +4, +10, and -1 controls.
- Bulk-entry mode for sorted stacks.
- Automatic 12-box storage routing.
- Storage box views with physical quantities.
- Deck creation and card assignment. Cards in decks remain owned but are no longer available.
- Loan tracking by borrower. Loaned cards remain owned but are no longer available until returned.
- Collection summary counts.
- JSON backup export.
- PWA shell so it can become an installable phone/desktop app once hosted over HTTPS.

## Current 12-box routing

1. Fury Units
2. Fury Other
3. Calm Units
4. Calm Other
5. Mind Units
6. Mind Other
7. Body Units
8. Body Other
9. Chaos Units
10. Chaos Other
11. Order Units
12. Order Other

Non-Champion Units route to the Units box. Champions and all other card types route to Other. Unit boxes are subdivided by energy cost (1, 2, 3, 4, 5, 6+).

## How to run this prototype locally

The simplest development method on Windows is from this folder:

```powershell
py -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

Opening `index.html` directly may also work for basic testing, but PWA installation and some browser networking features require a local web server or HTTPS.

## Data ownership

Prototype 1 stores your personal inventory, decks, and loans in browser localStorage. No account is required and nothing is uploaded by the app.

Before real collection entry across multiple devices, the next infrastructure step is to replace localStorage with a private cloud database and login. The UI/data model is intentionally structured so that migration does not require redesigning the app.

## Card data

The app attempts to load `cards.json` from the latest release of:

- https://github.com/LouisCourrian/riftbound-cards

Card data and artwork are owned by Riot Games. This is intended as a non-commercial personal/community tool and is not affiliated with Riot Games.
