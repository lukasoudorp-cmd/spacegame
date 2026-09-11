# Space Corp 2.0

Browsergame waarin je een satellietbedrijf opbouwt, contracten voltooit en je vloot verbetert.

## Spelen

Download de repository en open `index.html` in Chrome. Houd de mappen `js` en `vendor` bij de HTML. De game werkt ook offline.

## Online zetten

In GitHub: Settings → Pages → Deploy from a branch → main → /(root) → Save.

## Ontwikkeling

- `index.html` en `style.css`: interface en vormgeving.
- `js/`: spelregels, opslag, kaart en bediening.
- `vendor/`: meegeleverde D3-bibliotheek.
- `tests/regression.cjs`: 17 controles op spellogica en kaartprojecties.

Tests uitvoeren met Node.js: `node tests/regression.cjs`.

De voortgang wordt lokaal in de browser opgeslagen. Bewaar compatibiliteit met `spaceCorp_save_v2` bij toekomstige wijzigingen.

Zie `LEES-MIJ.txt` voor spelregels en bediening, en `CREDITS.txt` voor bronnen en licenties.
