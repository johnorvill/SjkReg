# SjkReg

En enkel webbversion av Excel-sökningen för hundregister.

## Innehåll

- `scripts/extract_excel.py` läser bladet `Hundar` från den angivna `.xlsm`-filen och skriver `data/hundar.json`.
- `index.html`, `style.css` och `app.js` visar en dashboard där man kan söka på registreringsnummer.

## Uppdatera data

Kör:

```powershell
python .\scripts\extract_excel.py
```

## Starta lokalt

Eftersom appen läser JSON via `fetch` behöver den köras via en enkel webbserver:

```powershell
python -m http.server 8000
```

Öppna sedan:

`http://localhost:8000`

## Nuvarande relationer

- Hund
- Avkomma
- Hunds syskon
- Fader
- Moder
- Faders syskon
- Moders syskon

Det går att bygga ut vidare med fler generationer om du vill.
