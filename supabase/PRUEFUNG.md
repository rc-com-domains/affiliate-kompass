# Live-Prüfung der zentralen Speicherung · 14. Oktober 2026

Über die GitHub-Pages-Oberfläche mit freigegebenem Supabase-Anmeldenutzer geprüft:

- Website-Namen geändert: zentral gespeichert in Version 2, in frisch geöffneter zweiter Ansicht nach Aktualisieren sichtbar. Zurückgesetzt in Version 3.
- Skool-Angebotsnamen geändert: zentral gespeichert in Version 4, in zweiter Ansicht sichtbar. Zurückgesetzt in Version 5.
- Offenen Vorschlag zum Camping-Apps-Artikel testweise freigegeben: Version 6; zweite Ansicht zeigt „Manuell freigegeben · nicht veröffentlicht“. Wieder geöffnet in Version 7. Keine externe Website verändert.
- Vier Websites, sieben Angebote, 14 Vorschläge bleiben erhalten. Testnamen und Freigabestatus sind zurückgesetzt. Die Versionshistorie dokumentiert die Teständerungen.

Die zweite Ansicht läuft als eigenständige Seite im gleichen Browserprofil. Beide Ansichten laden den Bestand aus Supabase, nicht aus gemeinsamem Browserspeicher. Ein physisch anderes Gerät wurde nicht bedient. Die Anmeldung dort muss mit demselben freigegebenen Nutzer erfolgen; vorhandene Änderungen lassen sich über „Bestand aktualisieren“ laden.

Die serverseitige Nutzerprüfung und Versionskonflikt-Abweisung wurden zuvor direkt in der Live-Datenbank mit der authenticated-Rolle geprüft. Luna bleibt deaktiviert.
