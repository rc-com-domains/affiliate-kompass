# Supabase einrichten

Die Anbindung ist im Code vorbereitet. Die gemeinsame Live-Datenbank ist erst aktiv, nachdem diese Schritte abgeschlossen und Projekt-URL/Publishable Key eingetragen sind. Bis dahin zeigt die Oberfläche ausdrücklich **Lokale Prüfversion** an.

1. Unter https://supabase.com/dashboard ein Konto und ein neues Projekt `affiliate-kompass` anlegen. Für dieses Projekt eine passende EU-Region wählen. Das Datenbankpasswort selbst setzen und aufbewahren; es wird nicht für die Browser-Anbindung benötigt.
2. Im **SQL Editor** erst `01-schema.sql`, danach `02-bestand-import.sql` aus diesem Ordner ausführen. Der Import enthält vier Websites, sieben Angebote und 14 Vorschläge mit Freigaben, Bewertungen und Veröffentlichungsnachweisen. Wiederholter Import überschreibt keine vorhandene Datenbank.
3. Unter **Authentication → Users → Add user → Create user** deinen persönlichen Benutzer mit E-Mail und Passwort anlegen und bestätigen (Auto Confirm). Keine öffentliche Registrierung notwendig. Danach in `03-nutzer-freigeben.sql` den Platzhalter `DEINE-ANMELDE-EMAIL` ersetzen und das SQL ausführen. Die abschließende Abfrage muss deinen Nutzer anzeigen. Weitere interne Personen bei Bedarf genauso freigeben; alle freigegebenen Nutzer arbeiten am gleichen Bestand.
4. Unter **Authentication → URL Configuration** als Site URL `https://rc-com-domains.github.io/affiliate-kompass/` eintragen. Unter **Authentication → Sign In / Providers** E-Mail-/Passwort-Anmeldung aktivieren und öffentliche Neuregistrierung deaktivieren. Die Datenbank-Freigabeliste sperrt nicht freigegebene Nutzer zusätzlich.
5. Unter **Project Settings / Connect / API Keys** die Projekt-URL (`https://….supabase.co`) und den **Publishable Key** (`sb_publishable_…`) kopieren. Bei älteren Projekten ist der `anon` Key ebenfalls unterstützt. Diese beiden öffentlichen Angaben können im Chat mitgeteilt werden; danach werden sie in `docs/supabase-config.js` eingetragen und GitHub Pages aktualisiert. Niemals Secret Key, `service_role`, Datenbankpasswort oder dein Anmeldepasswort ins Repository oder den Chat geben.
6. Den GitHub-Pages-Link öffnen. Nach dem bisherigen Test-Sichtschutz folgt bei aktivierter Konfiguration die echte Supabase-Anmeldung. Auf Gerät A eine Website oder ein Angebot bearbeiten; Status **Zentral gespeichert** abwarten. Auf Gerät B anmelden und **Bestand aktualisieren** klicken. Änderungen müssen dort erscheinen.

## Abweichende lokale Daten übernehmen

Falls du nach dem letzten Stand im Browser eigene Änderungen vorgenommen hast, vor Einrichtung **Bestand exportieren** verwenden. Der mitgelieferte Import ist der bekannte Stand vom 13. Oktober 2026. Zum Erzeugen eines aktualisierten Importskripts: `python3 supabase/import-erzeugen.py /absoluter/pfad/zum/export.json`. Dieses aktualisierte Importskript vor dem ersten Import ausführen. Nach einem vorhandenen Import keine Datenbank zurücksetzen; spätere Änderungen erfolgen kontrolliert über die angemeldete Oberfläche.

## Speicherung und Zugriff

Der komplette verknüpfte Bestand liegt zunächst als gemeinsames JSONB-Dokument in PostgreSQL. Das erhält die bisherige Datenstruktur, einschließlich Bewertungs- und Veröffentlichungsnachweisen. Jede Änderung prüft die aktuelle Version; veraltete Schreibstände werden abgewiesen. Der vorherige Bestand bleibt in `affiliate_history` erhalten. Tabellen haben RLS und keine direkten Browser-Schreibrechte. Ausschließlich freigegebene Auth-Nutzer dürfen die beschränkten Datenbankfunktionen verwenden.

Luna und automatische Veröffentlichung bleiben deaktiviert. Die Grenze von drei Affiliate-Linkstellen gilt auch bei serverseitiger Freigabeprüfung; Linkzählstände stammen weiterhin aus dem letzten Pilot-Abgleich. Der nächste Ausbau sollte sie vor Veröffentlichungen erneut prüfen.

Prüfungen lokal mit PostgreSQL/PGlite: Gastzugriff gesperrt, nicht freigegebener Nutzer gesperrt, vollständiger Import, genehmigter Schreibzugriff, Versionskonflikt, Pflicht-Themen, unveränderbare Bewertungsmetadaten, Historie und wiederholter Import ohne Überschreiben. Noch kein Live-Test in einem echten Supabase-Projekt durchgeführt.
