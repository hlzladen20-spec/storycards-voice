# StoryCards Voice: Nutzerkonten einrichten

Der Programmcode ist vorbereitet. Ohne diese Einrichtung ist Online-Speicherung noch nicht betriebsbereit.

1. Im richtigen Supabase-Projekt den **SQL Editor** öffnen, **New query** wählen und den Inhalt von `migrations/202610260001_learning_accounts.sql` ausführen. Es werden ausschließlich die neue Lerndatentabelle, ihre Zugriffsregeln und eine Speicherfunktion angelegt. Bestehende Lerndaten auf den Geräten werden nicht gelöscht.
2. Unter **Authentication → URL Configuration** die Site URL auf `https://storycards-voice.onrender.com` setzen. Dieselbe URL und `https://storycards-voice.onrender.com/**` in die erlaubten Redirect URLs aufnehmen. Keine Wildcard für beliebige fremde Domains verwenden.
3. E-Mail/Passwort-Anmeldung aktiv lassen, **Confirm email** aktiv lassen. Unter **Authentication → Email** einen eigenen SMTP-Versanddienst einrichten, bevor fremde Tester eingeladen werden. Der integrierte Testversand ist beschränkt und reicht nicht für einen normalen Testbetrieb mit beliebigen Empfängern.
4. Im SQL Editor prüfen: `select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'learning_snapshots';` muss `rowsecurity = true` zeigen.
5. Erst danach die vorbereiteten App-Änderungen veröffentlichen und mit zwei eigenen Testkonten prüfen: Registrierung/Bestätigung, Passwort zurücksetzen, Anmeldung, Abmeldung, Kontotrennung, Offline-Änderungen und Synchronisierung auf zwei Geräten. Nie echte persönliche Lerndaten für Sicherheitsprüfungen verwenden.

## Verhalten

- Ohne Konto bleibt die App lokal nutzbar. Vorhandene Karten werden niemals automatisch einem neuen Konto zugeordnet.
- Unter Profil können lokale Lerndaten ausdrücklich in ein noch leeres Konto übernommen werden. Der lokale Originalstand bleibt erhalten.
- Angemeldete Nutzer erhalten getrennte lokale Datenbereiche pro Nutzer und pro Sprache. Online werden nur Lernkarten, Lernstände und Lernziele gespeichert; keine Mikrofonaufnahmen, Passwörter oder Anmeldetokens im Lerndatensatz.
- Gespeichert wird nach Änderungen und beim Wiederverbinden. Auf dem zweiten Gerät beim Öffnen neu laden; bei unterschiedlichen Versionen entscheidet der Nutzer. Kein stilles Überschreiben.
- Vor einem manuellen Konfliktentscheid werden Sicherheitskopien lokal aufbewahrt. Die App bietet außerdem einen JSON-Sicherungsdownload. Eine Synchronisierung ist kein Ersatz für serverseitige Backups.
- Der öffentliche Publishable Key darf im Browser stehen. Schutz entsteht durch RLS und die angemeldete Nutzeridentität. Niemals `service_role` oder Secret Keys ins Frontend eintragen.

## Grenzen vor einer kommerziellen Veröffentlichung

Noch erforderlich: Ende-zu-Ende-Sicherheitstest der RLS mit zwei echten Testkonten, Konto-/Datenlöschung auf Nutzerwunsch, dokumentierte Wiederherstellung serverseitiger Backups, Datenschutzinformationen, SMTP-Zustellbarkeit sowie serverseitige Authentifizierung und Nutzungsgrenzen für kostenpflichtige KI-Endpunkte. Diese KI-Endpunkte sind durch diese Kontofunktion noch nicht für anonyme Zugriffe gesperrt.

Die Windows-App speichert ihre lokalen Daten weiterhin im bisherigen Benutzerordner. Anmeldesitzungen werden wie bei der Web-App lokal gespeichert. Auf gemeinsam genutzten Geräten immer abmelden.

Bibliothek: supabase-js 2.118.0, lokal gebündelte offizielle UMD-Ausgabe; Lizenz unter public/vendor/SUPABASE-LICENSE.

Quellen: https://supabase.com/docs/guides/database/postgres/row-level-security und https://supabase.com/docs/guides/auth/passwords
