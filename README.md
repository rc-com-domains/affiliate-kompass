# Affiliate-Kompass

Interne, klickbare Prüfversion zur Verwaltung von Websites, freigegebenen Affiliate-Angeboten und bewerteten Vorschlägen.

## Prüf-HTML öffnen

[`pruefung.html`](./pruefung.html) herunterladen und im Browser öffnen. Die Datei ist eigenständig; es sind keine Installation, Domain oder zusätzlichen Dateien nötig.

Alternativ im lokalen Checkout:

```sh
python3 -m http.server 8767 --bind 127.0.0.1
```

Dann http://127.0.0.1:8767/pruefung.html öffnen.

## Übernommener Bestand

- Vier Websites, sieben konkrete Affiliate-Angebote und 14 Vorschläge.
- Themen, zentrale Nutzungsfreigaben, Bewertungen, Freigabestatus und bisherige Veröffentlichungsnachweise.
- Einstellbare Schwellen und maximal drei Affiliate-Linkstellen pro Artikelseite.
- Angebots- und Artikellinks öffnen in einem neuen Tab.

Die eingebetteten Daten sind ein Stand vom 13. Oktober 2026. Änderungen bleiben im Browser und können über **Bestand exportieren** als JSON gesichert werden. Sie werden noch nicht ins Repository oder in eine zentrale Datenbank geschrieben.

Neue Luna-Abgleiche und Veröffentlichungen sind deaktiviert. Freigaben dienen der Prüfung und ändern keine externe Website.

## Zugriff

Das Repository ist privat. Die Prüfdatei erhält ausschließlich der Personenkreis mit Repository-Zugriff oder einer ausdrücklich weitergegebenen Dateikopie. Eine heruntergeladene Datei hat keinen zusätzlichen Login.

Diese Phase stellt die Prüf-HTML bereit. Eine dauerhaft gehostete HTTPS-Ansicht mit Login, zentraler Datenbank und Luna-Anbindung ist ein späterer Ausbauschritt. GitHub zeigt HTML im Repository als Quelltext; die Datei wird zum Durchklicken im Browser geöffnet.

## HTTPS-Prüfversion

https://affiliate-kompass-pruefung.brawny-snow-5908.chatgpt.site

Die Prüfversion läuft als serverseitiger Worker. Ein eigenes Anwendungspasswort schützt die Auslieferung der gesamten HTML und des eingebetteten Bestands. Zusätzlich ist der Hosting-Zugang aktuell auf den Eigentümer beschränkt; die Freigabe für externe Besucher wurde von der automatischen Freigabeprüfung abgelehnt.

- HTTPS; Passwort-Hash und Sitzungsschlüssel ausschließlich in den Hosting-Secrets.
- Signierte Sitzung für zwölf Stunden, Cookie Secure/HttpOnly/SameSite=Strict.
- noindex/nofollow/noarchive als HTTP-Header und HTML-Meta; robots.txt sperrt Crawling.
- Keine Browser- oder Proxy-Zwischenspeicherung.
- Kein Zugriff auf Quell- oder Datenbankdateien über die Website.
- Fünf Authentifizierungstests bestanden; serverseitige Sperre auch live geprüft.

Hosting-Quellen: `deployment/`. Nach Änderung der Prüf-HTML den Worker mit `python3 deployment/prepare-worker.py` erzeugen. Tests: `cd deployment && node --test auth.test.mjs`.

Die Bestandsverwaltung bleibt für diese Prüfphase browserlokal. Neue Luna-Abgleiche sind deaktiviert.
