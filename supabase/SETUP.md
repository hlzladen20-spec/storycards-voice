# StoryCards Voice: Nutzerkonten einrichten

Der Programmcode ist vorbereitet. Ohne diese Einrichtung ist Online-Speicherung noch nicht betriebsbereit.

1. Im richtigen Supabase-Projekt den **SQL Editor** öffnen, **New query** wählen und den Inhalt von `migrations/202610260001_learning_accounts.sql` ausführen. Es werden ausschließlich die neue Lerndatentabelle, ihre Zugriffsregeln und eine Speicherfunktion angelegt. Bestehende Lerndaten auf den Geräten werden nicht gelöscht.
2. Unter **Authentication → URL Configuration** die Site URL auf `https://storycards-voice.onrender.com` setzen. Dieselbe URL und `https://storycards-voice.onrender.com/**` in die erlaubten Redirect URLs aufnehmen. Keine Wildcard für beliebige fremde Domains verwenden.
3. E-Mail/Passwort-Anmeldung aktiv lassen, **Confirm email** aktiv lassen. Unter **Authentication → Email** einen eigenen SMTP-Versanddienst einrichten, bevor fremde Tester eingeladen werden. Der integrierte Testversand ist beschränkt und reicht nicht für einen normalen Testbetrieb mit beliebigen Empfängern.
4. Im SQL Editor prüfen: `select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'learning_snapshots';` muss `rowsecurity = true` zeigen.
5. Erst danach die vorbereiteten App-Änderungen veröffentlichen und mit zwei eigenen Testkonten prüfen: Registrierung/Bestätigung, Passwort zurücksetzen, Anmeldung, Abmeldung, Kontotrennung, Offline-Änderungen und Synchronisierung auf zwei Geräten. Nie echte persönliche Lerndaten für Sicherheitsprüfungen verwenden.

## Verhalten

- Die App verlangt eine Anmeldung. Vorhandene lokale Karten bleiben erhalten; vor dem Start wird eine ausdrückliche Übernahme in ein leeres Konto angeboten. Ohne erfolgreiche Anmeldung startet keine Lernrunde.
- Unter Profil können lokale Lerndaten ausdrücklich in ein noch leeres Konto übernommen werden. Der lokale Originalstand bleibt erhalten.
- Angemeldete Nutzer erhalten getrennte lokale Datenbereiche pro Nutzer und pro Sprache. Online werden nur Lernkarten, Lernstände und Lernziele gespeichert; keine Mikrofonaufnahmen, Passwörter oder Anmeldetokens im Lerndatensatz.
- Gespeichert wird nach Änderungen und beim Wiederverbinden. Auf dem zweiten Gerät beim Öffnen neu laden; bei unterschiedlichen Versionen entscheidet der Nutzer. Kein stilles Überschreiben.
- Vor einem manuellen Konfliktentscheid werden Sicherheitskopien lokal aufbewahrt. Die App bietet außerdem einen JSON-Sicherungsdownload. Eine Synchronisierung ist kein Ersatz für serverseitige Backups.
- Der öffentliche Publishable Key darf im Browser stehen. Schutz entsteht durch RLS und die angemeldete Nutzeridentität. Niemals `service_role` oder Secret Keys ins Frontend eintragen.

## Grenzen vor einer kommerziellen Veröffentlichung

Noch erforderlich: Ende-zu-Ende-Abnahme mit zwei bestätigten echten Testkonten, Konto-/Datenlöschung auf Nutzerwunsch, dokumentierte Wiederherstellung serverseitiger Backups, vollständige Datenschutzinformationen, SMTP-Zustellbarkeit und passende nutzerspezifische Kostenlimits. Die KI-Endpunkte verlangen jetzt serverseitig eine bestätigte Supabase-Identität. Ein offener Healthcheck und öffentliche Anmelde-Assets erlauben keine KI-Aufrufe.

Die Windows-App speichert ihre lokalen Daten weiterhin im bisherigen Benutzerordner. Anmeldesitzungen werden wie bei der Web-App lokal gespeichert. Auf gemeinsam genutzten Geräten immer abmelden.

Bibliothek: supabase-js 2.118.0, lokal gebündelte offizielle UMD-Ausgabe; Lizenz unter public/vendor/SUPABASE-LICENSE.

Quellen: https://supabase.com/docs/guides/database/postgres/row-level-security und https://supabase.com/docs/guides/auth/passwords

## Pflichtanmeldung und Admin-Verbrauch, Version 68

Das bestehende Projekt `tidaagozwtxphtkoavab` bleibt verbindlich. Die additiven Migrationen `20261116180312_authenticated_usage.sql` und `20261116181739_usage_account_directory.sql` wurden dort bereits ausgeführt. Sie verändern keine `learning_snapshots`. Die zweite Migration trennt die serververwaltete Kontenliste von den internen Auth-Tabellen; zusätzliche Leserechte auf `auth.users` sind nicht erforderlich.

Vor Veröffentlichung in Render unter **Environment** `SUPABASE_SECRET_KEY` als geheime Variable hinzufügen: einen geheimen Schlüssel desselben Supabase-Projekts, nicht den Publishable Key. Niemals in Chat, GitHub, App-Code oder Downloadpaketen ablegen. `SUPABASE_SERVICE_ROLE_KEY` wird für bestehende Serverkonfigurationen ebenfalls unterstützt. Ohne Server-Schlüssel starten keine kostenpflichtigen KI-Aufrufe. `ADMIN_EMAILS` ist optional; Standard ist ausschließlich `markcecil2@gmail.com`.

Nach Veröffentlichung mit dieser Adresse ein normales Konto erstellen, E-Mail bestätigen und anmelden. Erst eine aktuelle, serverseitig von Supabase bestätigte Identität mit bestätigter E-Mail bekommt Zugriff auf **Profil → Adminbereich**. Nutzer-Metadaten, Client-IDs und selbst angegebene E-Mail-Adressen gewähren keine Rechte.

### Was gemessen wird

- REST-Aufrufe: Vor dem Provider-Aufruf wird ein dauerhafter `pending`-Datensatz angelegt. Aus der tatsächlichen Provider-Antwort werden Modell, Provider-ID, Eingabe-, Ausgabe-, Gesamt-, Cache- und, soweit geliefert, Audio-Tokens gespeichert. Enthält die Antwort nur Audiosekunden, bleiben Tokenzahlen unbekannt.
- WebRTC: Der Server verbindet einen eigenen Realtime-Sideband über die Call-ID, bevor die SDP-Antwort zum Browser zurückgeht. Er verarbeitet `response.done` und die abgeschlossenen Eingabe-Transkriptionen. Replays werden über eindeutige Event-Schlüssel dedupliziert. Browsergemeldete Tokenzahlen werden nicht angenommen.
- Gemeinsam wiederverwendete Sprachausgabe erzeugt keine neuen Tokens. Ein neuer Audioclip wird dem Konto zugeordnet, das die tatsächliche Generierung ausgelöst hat. Folgeabrufe aus dem Cache erhalten keine erfundenen Kosten.
- Abgebrochene/fehlende Messungen bleiben als unvollständig sichtbar. Bei einem Schreibfehler oder einer getrennten Sideband-Verbindung wird das Gespräch beendet, soweit der Provider erreichbar ist. Bei Prozessabstürzen bleiben offene Sitzungszeilen bestehen. Keine Vollständigkeitsgarantie oder rückwirkende Rekonstruktion bei solchen Lücken; mit OpenAI-Abrechnung abgleichen. Die Anzeige bezeichnet Summen als bestätigten Mindestverbrauch, sobald Lücken vorliegen.
- Keine Prompts, Aufnahmen, Gesprächsinhalte oder Zugangsdaten in `ai_usage_events`. Lernstände werden wie zuvor getrennt synchronisiert.
- Bericht pro Konto sowie Details pro UTC-Tag, Funktion und Modell; Zeitraum maximal 366 Tage, CSV-Export. Cache- und Audio-Tokens sind Teilmengen der Gesamttokens. Es wird bewusst kein pauschaler Eurobetrag berechnet.

Verbrauchstabelle und Kontenliste haben RLS und bewusst **keine** Client-Policies oder Client-Grants: Nur der Server mit geheimem Schlüssel darf sie lesen/schreiben. Die Datenbankprüfung meldet deshalb erwartungsgemäß den informativen Hinweis „RLS enabled no policy“. Der Adminbericht ist `SECURITY INVOKER` und ausschließlich für `service_role` ausführbar. Konten erscheinen nach der ersten bestätigten Nutzung; bei jeder Serveranfrage wird die verifizierte Kontenliste aktualisiert.

Windows: Die lokale Oberfläche und der bisherige Datenspeicher bleiben. Alle `/api/`-Aufrufe werden mit dem angemeldeten Bearer-Token zum gleichen gehosteten Server weitergeleitet, statt OpenAI lokal und ungemessen aufzurufen. Alte, noch nicht aktualisierte Installationen sind dadurch nicht rückwirkend kontrollierbar und müssen aktualisiert werden.

Prüfung: automatisierte Tests mit simulierten Provider-Antworten (keine bezahlten Testaufrufe), echte Datenbank-Grants/RLS sowie leere Berichtsabfrage. Noch notwendig für den Live-Abnahmetest: Server-Schlüssel auf Render, erfolgreiche Veröffentlichung, bestätigtes Nutzerkonto, eine echte Sprachsitzung und Abgleich der Berichtswerte mit OpenAI. Vorher ist die Funktion vorbereitet, aber nicht live abgenommen.

Quellen: https://developers.openai.com/api/docs/guides/voice-server-controls?api=realtime&voice-api=realtime und https://developers.openai.com/api/reference/resources/realtime/server-events
