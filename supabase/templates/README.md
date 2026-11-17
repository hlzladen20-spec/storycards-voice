# Bestätigungsmail im StoryCards-Design

Status: Die HTML-Vorlage ist fertig und geprüft, aber noch nicht im gehosteten Supabase-Projekt aktiviert. Ein GitHub-Push oder Render-Deployment aktiviert diese Mail **nicht**.

## Im bestehenden Projekt aktivieren

1. [Supabase-Mailvorlagen öffnen](https://supabase.com/dashboard/project/tidaagozwtxphtkoavab/auth/templates) und **Confirm sign up** wählen.
2. Die bisherige Betreffzeile und das bisherige HTML zuerst lokal sichern, damit die Änderung bei Bedarf rückgängig gemacht werden kann.
3. Als Betreff eintragen: **Bestätige deine E-Mail-Adresse · StoryCards Voice**
4. Den vollständigen Quelltext von `confirmation.html` in das HTML-/Body-Feld einfügen. Die Platzhalter `{{ .ConfirmationURL }}` müssen exakt erhalten bleiben. Keine echte Bestätigungs-URL, API-Schlüssel oder Zugangsdaten eintragen.
5. Die Supabase-Vorschau am Handy und am Desktop prüfen und die Vorlage speichern.
6. Mit einem eigenen Testkonto eine neue Bestätigungsmail anfordern. Prüfen: deutsche Betreffzeile, Button, Ersatzlink, Bestätigung und Rückkehr zur App. Einmal bestätigte Links nicht wiederverwenden. Bestehende Konten und Lernstände bleiben unverändert.

Die Änderung gilt für künftig versendete Registrierungsbestätigungen. Bereits zugestellte Mails ändern sich nicht. Andere Mailtypen wie Passwort zurücksetzen bleiben unverändert.

## Design und Sicherheit

- App-Farben: Creme `#f4f1e7`, Dunkelgrün `#173f3a`, grüner Button `#11836c`.
- Deutscher Text, eine klare Hauptaktion und ein kopierbarer Ersatzlink.
- Tabellenlayout mit Inline-Stilen und Outlook-Fallback; ohne JavaScript, Trackingpixel, externe Bilder oder nachgeladene Schriftarten.
- Keine Änderung an Redirect-URLs, Bestätigungspflicht, Auth-Tokens, Datenbank oder Kontoberechtigungen. Der von Supabase erzeugte Bestätigungslink wird unverändert verwendet.
- Die Darstellung kann je nach Mailprogramm und erzwungenem Dunkelmodus abweichen. Der tatsächliche Versand und die Darstellung in Gmail/Outlook müssen nach Aktivierung geprüft werden.

## Absendername

Das HTML ändert nicht die Absenderadresse oder den Anzeigenamen „Supabase Auth“. Für einen eigenen Absender wird ein eigener SMTP-Versand mit verifizierter Absenderadresse benötigt. Falls dieser eingerichtet ist, kann der Anzeigename **StoryCards Voice** lauten. Hier wurde kein Versanddienst eingerichtet, keine Domain angelegt und kein kostenpflichtiger Tarif aktiviert.

Die Einstellungen oder ein automatisch ergänzter Anbieter-Footer hängen vom tatsächlichen Versanddienst ab. Die Vorlage allein entfernt solche Zusätze nicht zuverlässig.

Quellen, geprüft am 17.11.2026:

- [Supabase: Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
