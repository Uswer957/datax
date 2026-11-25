# Anleitung: data.json aktualisieren

Diese Datei ist die verbindliche Anleitung für die geplanten Läufe, die `data.json` füllen. Die Läufe lesen sie bei jedem Start. Änderungen an den Inhalten der Läufe werden hier gemacht (per Pull Request), nicht in den geplanten Aufgaben.

## Lauf-Typen

| Lauf | Zeit (Europe/Berlin) | Umfang |
|---|---|---|
| **Morgenlauf** | 5:03 Uhr | Alles in dieser Datei: Abschnitte **[jeder Lauf]** und **[Morgenlauf]**. |
| **Schnelllauf** | 6, 7, 8, 9, 10, 12, 15, 17, 18 Uhr (je :03) | Nur Abschnitte **[jeder Lauf]**. Abschnitte **[Morgenlauf]** unverändert lassen, außer eine Meldung dieses Laufs betrifft sie direkt (dann nur die betroffene Stelle anpassen). |

Ziel des Schnelllaufs: in wenigen Minuten fertig sein. Nur ändern, was sich seit dem letzten Lauf tatsächlich bewegt hat; Unverändertes stehen lassen. Keine Abschnitte „zur Sicherheit“ neu recherchieren.

**Vorrang in JEDEM Lauf (auch Schnelllauf): Fehlt ein in dieser Datei beschriebenes Feld in data.json oder ist es leer (leere Liste, null, fehlender Schlüssel), wird es in diesem Lauf sofort vollständig und belegt angelegt – nicht auf den Morgenlauf warten.** Das gilt auch für Abschnitte mit [Morgenlauf]. Vor dem Push kurz prüfen, dass kein beschriebenes Feld mehr fehlt oder leer ist.

Meldungen, die im Schnelllauf aus einer Kachel verdrängt werden, dürfen statt gelöscht an den Anfang von `mehr.<passender Schlüssel>.meldungen` wandern (dann dort die älteste entfernen, max. 8).

## Ablauf

1. Repository klonen, `data.json` und `medien.json` lesen. Struktur und Feldnamen exakt beibehalten (app.js liest sie). **Nur `data.json` ändern** (nicht diese Datei, nicht medien.json, energie.json oder kacheln.json).
2. Mit Websuche aktuelle Inhalte recherchieren (Stand jetzt, Zeitzone Europe/Berlin). Nur belegte Fakten, nichts erfinden; was du nicht sicher findest, weglassen.
3. `"aktualisiert"` auf z. B. `"24.11.2026, 14:03 Uhr"` setzen.
4. JSON prüfen (`python -m json.tool`), committen („Daten aktualisiert TT.MM. HH:MM“) und direkt auf main pushen (vorher `git pull --rebase`; bei Konflikt in data.json die neuere Fassung von main als Basis nehmen und die eigenen Änderungen erneut anwenden). Keine anderen Dateien ändern, keine Pull Requests. data.json ist mit indent=2, ohne Newline am Ende formatiert.
5. Keine persönlichen Daten in die Datei schreiben, die Seite ist öffentlich.

## Pflichtfelder jeder Meldung

Gilt für maerkte.schlagzeilen, politik.welt, politik.usa, politik.deutschland, politik.recht, politik.recht_eu, politik.recht_usa, sport-Schlagzeilen, alle Meldungslisten unter konflikte und energie.news sowie alle mehr.*.meldungen:

- `"quelle"`: das ORIGINALE Medium, das die Meldung veröffentlicht hat (z. B. "Reuters", "Tagesschau", "Handelsblatt", "Fox News"), und `"url"`: https-Link direkt auf den Artikel dieses Mediums. KEINE Aggregatoren, Newsletter oder Ticker als Quelle (z. B. nicht „Everything Briefing“, „Newsquawk“, Substack-Newsletter, news.de, MSN, Yahoo-Zusammenfassungen, Google News). Findest du eine Meldung nur über einen Aggregator, das Originalmedium suchen und dessen Artikel verlinken; gelingt das nicht, die Meldung weglassen.
- `"zeit"`: Veröffentlichungszeitpunkt des verlinkten Artikels in Berliner Zeit im Format "TT.MM., HH:MM" (z. B. "24.11., 13:20"); ist nur das Datum bekannt, "TT.MM.". Nicht schätzen. Ältere Meldungen behalten ihr ursprüngliches Datum.
- `"medien"`: Liste von 2 bis 5 Medien, die über genau diese Geschichte berichten (per Websuche geprüft, nicht geraten), inklusive der quelle. Schreibweise exakt wie die Schlüssel in medien.json (z. B. "Tagesschau", "Spiegel", "FAZ", "Welt", "Handelsblatt", "Reuters", "AP", "CNN", "New York Times", "Fox News", "Wall Street Journal"), damit die Seite die politische Einordnung als Icon zeigen kann. Bei politik.usa und mehr.usa möglichst Medien aus beiden Lagern suchen; berichtet nur ein Lager, so ehrlich angeben. Bestehende Meldungen ohne zeit/medien beim nächsten Lauf nachrüsten oder ersetzen.

---

## Briefing (Tab „Briefing“, erster Tab der Seite)

`briefing`: {"stand": "TT.MM., HH:MM Uhr", "saetze": [...], "details": [...], "begriffe": [...], "literatur": [...]}.

### briefing.stand, saetze, details — [jeder Lauf]

- **saetze** („Das Wichtigste in Kürze“): genau 5 Einträge {"tag": ein Wort wie Märkte, Daten, Zinsen, Politik, Konflikte, Deutschland, Unternehmen, Energie, "text": ein knackiger Satz}. Die fünf Dinge, die heute wirklich zählen, wichtigstes zuerst: was passiert ist, was heute ansteht (mit Uhrzeit in Berliner Zeit) und warum es wichtig ist. Konkret mit Zahlen, keine Floskeln. Bei jedem Lauf neu schreiben; nach Veröffentlichung wichtiger Daten (z. B. 14:30 Uhr US-Daten) das Ergebnis einarbeiten. Jeder Eintrag in saetze bekommt zusätzlich "quelle" (Originalmedium) und "url" (https-Link direkt auf den Artikel, gleiche Regeln wie bei Meldungen: kein Aggregator). Die Seite macht den Satz damit klickbar. Fehlt url, verlinkt sie auf die url des details-Eintrags mit gleichem tag, deshalb jeden details-Eintrag ebenfalls mit quelle und url versehen.
- **details** („Ausführlich & Ausblick“): 4 bis 6 Themen, passend zu den saetzen, je {"tag", "titel", "text": 2 bis 3 Absätze Hintergrund und Einordnung (Absätze mit Leerzeile "\n\n" trennen), "wirkung": [3 bis 4 Einträge {"markt": konkreter Markt oder Datenpunkt, z. B. "US-Renditen 10 J.", "EUR/USD", "DAX-Exporteure", "Gold", "Fed-Erhöhung 9.12.", "richtung": "steigt"/"faellt"/"seitwaerts"/"unsicher", "warum": ein Satz Begründung; bei "unsicher" die Szenarien nennen, z. B. „Kernrate über 3,2 %: Renditen steigen. Darunter: fallen.“}], "quelle", "url", "zeit"}. Die wirkung ist eine begründete Einschätzung, wie die Nachricht voraussichtlich auf Kurse, Zinsen, Währungen, Rohstoffe oder anstehende Termine wirkt – plausibel und vorsichtig formuliert, keine Kursziele, keine Anlageempfehlung. Ist ein erwartetes Ereignis eingetreten (z. B. Daten veröffentlicht), Text und Wirkung anpassen. Im Schnelllauf nur Themen umschreiben, bei denen sich etwas bewegt hat.

### briefing.begriffe, literatur — [Morgenlauf]

- **begriffe** („Was man wissen muss“): 5 bis 8 Fachbegriffe, die man zum Verständnis der heutigen Themen braucht, je {"begriff", "erklaerung": 1 bis 3 Sätze, verständlich und fachlich korrekt, auf Niveau eines Wirtschaftsstudenten}. Im Morgenlauf neu zusammenstellen. Schnelllauf: nur einen Begriff ergänzen, wenn ein neues Thema in die saetze kommt.
- **literatur** („Zum Weiterlesen“): 3 bis 5 Empfehlungen passend zu den Themen des Tages, je {"titel", "autor": Autor/Herausgeber und Jahr, "url": optional, nur echte, geprüfte Links (z. B. Notenbank-, Statistikamt- oder Verlagsseite), "warum": ein Satz}. Nur Bücher, Studien und Quellen, die es nachweislich gibt (Fachbücher, Standardlehrbücher, Notenbank-Erklärseiten, Primärquellen wie BEA, Destatis, EZB). Nichts erfinden.

---

## Märkte

### maerkte.schlagzeilen — [jeder Lauf]

6 bis 8 wichtigste, brisanteste Wirtschafts- und Finanzschlagzeilen des Tages. Felder: tag (z. B. Geldpolitik, Energie, Krypto, Unternehmen), titel, warum (ein Satz Einordnung), quelle, url, zeit, medien.

### maerkte.kalender („Wirtschaftskalender“) — [jeder Lauf]

{"stand": "TT.MM., HH:MM Uhr", "termine": [...]}. Termine von gestern bis 7 Tage voraus, nur wichtige Daten (US: PCE, CPI, PPI, Arbeitsmarktbericht, Erstanträge, BIP, ISM, Einzelhandel, JOLTS, Fed-Protokolle/Beige Book; Euroraum/Deutschland: HVPI-Schnellschätzung, Ifo, ZEW, BIP, Einkaufsmanager; dazu UK-CPI, China-PMI/CPI, Japan-CPI, wenn in der Woche). Je {"zeit": ISO-Zeitpunkt mit Berliner Offset, z. B. "2026-11-25T14:30:00+01:00", "land": "US"/"EZ"/"DE"/"UK"/"CN"/"JP", "wichtig": 1 bis 3 (3 = marktbewegend), "was": deutscher Name mit Zeitraum, z. B. "PCE-Kerninflation Okt. (J/J)", "prognose": Konsens als Text, z. B. "3,2 %" (unbekannt → null), "vorher": Vorwert, "ist": tatsächlicher Wert, solange nicht veröffentlicht null, "abweichung": nur wenn ist gesetzt, "hoeher"/"tiefer"/"gleich" gegenüber Konsens, "lesart": optional ein kurzer Satz, was das Ergebnis für Zinsen und Märkte bedeutet (bei wichtig 3 nach Veröffentlichung immer)}. Konsens nur aus seriösen Quellen (Reuters, Bloomberg, Investing.com, MarketWatch, Trading Economics); weichen Quellen voneinander ab, Reuters/Bloomberg bevorzugen. Nach Veröffentlichung ist und abweichung eintragen; für Ereignisse ohne Zahl (Beige Book, Protokolle) ist = "veröffentlicht". Termine älter als gestern entfernen.
Schnelllauf: nur ist/abweichung/lesart der seit dem letzten Lauf veröffentlichten Termine eintragen und Konsens bei Änderungen nachziehen. Morgenlauf: Liste für die kommenden 7 Tage vollständig prüfen.

### maerkte.notenbanken („Notenbank-Uhr“) — [jeder Lauf]

{"stand": z. B. "Markterwartung 25.11., 10:00 Uhr", "banken": [genau 4 in dieser Reihenfolge: Fed, EZB, BoE, BoJ]}. Je {"kuerzel": "Fed"/"EZB"/"BoE"/"BoJ", "name", "zins": aktueller Leitzins als Text (Fed als Zielspanne wie „3,75–4,00 %“, EZB „Einlagensatz 2,50 %“, BoE „Bank Rate 4,00 %“, BoJ „1,25 %“), "termin": ISO-Zeitpunkt der Bekanntgabe der NÄCHSTEN Entscheidung mit Berliner Offset (Fed 20:00 Uhr MEZ, EZB 14:15 Uhr, BoE 13:00 Uhr MEZ; BoJ ohne feste Uhrzeit → ca. 04:00 Uhr MEZ und "zeit_ca": true), "szenarien": [{"was": "+25 bp"/"Halten"/"−25 bp"/"+50 bp", "p": Zahl in Prozent}] (nur Szenarien mit p ≥ 1, Summe ≈ 100), "notiz": 1 bis 2 Sätze, was die Erwartung gerade treibt, oder die letzte Entscheidung mit Abstimmung, "quelle": Quelle und Datum, z. B. "CME FedWatch, 25.11.", "url"}. Quellen: Fed = CME FedWatch (bzw. Medienberichte darüber); EZB/BoE/BoJ = Geldmarktpreise laut Reuters/Bloomberg, LSEG, centralbank.watch oder rateprobability.com. Gehen Quellen weit auseinander, in notiz kurz nennen. Nach einer Sitzung: zins aktualisieren, termin auf die nächste Sitzung setzen und das Ergebnis in notiz nennen.
Schnelllauf: Wahrscheinlichkeiten nur prüfen, wenn Daten oder Notenbank-Reden seit dem letzten Lauf die Erwartung bewegt haben.

### maerkte.unternehmenskalender („Unternehmenskalender“) — [jeder Lauf]

Gleiches Format wie maerkte.kalender: {"stand": "TT.MM., HH:MM Uhr", "termine": [...]}. Termine von gestern bis 14 Tage voraus, 10 bis 16 Einträge: Quartalszahlen von DAX-Werten, US-Megacaps und den größten Werten Europas und Asiens, außerdem wichtige Hauptversammlungen, Ex-Dividenden-Tage, Investorentage und Börsenfeiertage (z. B. Thanksgiving). Je {"zeit": ISO-Zeitpunkt mit Berliner Offset, z. B. "2026-12-02T22:05:00+01:00" (bei Zahlen die angekündigte Veröffentlichungszeit; ist keine Uhrzeit bekannt, "zeit" auf 12:00 Uhr des Tages setzen und "ohne_zeit": true), "zeit_text": optional "vb." (vorbörslich), "nb." (nachbörslich) oder "ganztägig", "land": "US"/"DE"/"EZ"/"FR"/"NL"/"UK"/"CH"/"JP"/"CN" usw., "wichtig": 1 bis 3 (3 = marktbewegend, z. B. Nvidia, Apple, SAP), "was": "Unternehmen: Ereignis", z. B. "Salesforce: Zahlen Q3 GJ 2027", "prognose": bei Zahlen der Analystenkonsens für den Gewinn je Aktie, z. B. "EPS 3,05 $" (bei HV/Dividende z. B. die vorgeschlagene Dividende; unbekannt → null), "vorher": EPS des Vorjahresquartals bzw. Vorjahresdividende, "ist": tatsächliches EPS, solange nicht veröffentlicht null (Ereignisse ohne Zahl nach Stattfinden: "erledigt"), "abweichung": nur wenn ist gesetzt, "hoeher"/"tiefer"/"gleich" gegenüber Konsens, "lesart": ein kurzer Satz zu Umsatz, Ausblick und Kursreaktion (nach Veröffentlichung immer, vorher optional, was der Markt erwartet)}. Konsens nur aus seriösen Quellen (LSEG/Reuters, FactSet, Zacks, Bloomberg, Nasdaq.com, Unternehmensangaben); weichen sie ab, LSEG/Reuters bevorzugen. Termine älter als gestern entfernen.
Schnelllauf: Ist-Werte (ist/abweichung/lesart) aller seit dem letzten Lauf veröffentlichten Zahlen eintragen (z. B. US-Zahlen nachbörslich am Vorabend, Europa vorbörslich) und Termine älter als gestern entfernen. Fehlt maerkte.unternehmenskalender oder hat es weniger als 10 Termine, sofort vollständig anlegen bzw. auffüllen. Morgenlauf: neue Termine für die nächsten 14 Tage ergänzen.

### maerkte.watchlist („To Watch Today“) — [Morgenlauf]

Im Morgenlauf neu zusammenstellen. Schnelllauf: nur um 15 Uhr (US-Eröffnung) prüfen und einzelne Titel tauschen, wenn es neue, belegte Anlässe gibt; sonst unverändert.

Aktien, die heute besonders zu beobachten sind (Quartalszahlen heute/gestern nachbörslich, Kurssprünge, Übernahmen, Analysten-Hochstufungen, Produkt- oder Gerichtsnews) plus die stärksten Index-Schwergewichte, wenn bei ihnen etwas los ist. Gewichtung nach FTSE All-World: Gruppen in dieser Reihenfolge mit Anzahl Titeln: "USA" (6), "Europa" (4), "Japan" (2), "Asien & Schwellenländer" (2). Format: {"stand": "Stand TT.MM., HH:MM Uhr", "maerkte": [{"markt": "USA", "gewicht": "ca. 60 %" (aktuellen Länderanteil im FTSE All-World nennen, wenn auffindbar, sonst bisherigen Wert lassen), "titel": [{"name": "Nvidia", "symbol": "NASDAQ:NVDA", "grund": "ein Satz, warum heute wichtig"}]}]}. symbol ist ein TradingView-Symbol (Börse:Kürzel); die Seite zeigt daraus Live-Kurse. Für UK-Werte die US-Notierung nehmen (z. B. NASDAQ:AZN, NYSE:SHEL, NYSE:HSBC); für Japan und Asien ebenfalls US-Notierungen/ADRs (z. B. NYSE:TM, NYSE:SONY, NYSE:TSM, NYSE:BABA, NYSE:MUFG); XETR:, EURONEXT:, SIX:, NASDAQ:, NYSE: funktionieren. Jeder grund muss durch eine aktuelle Meldung belegt sein; gibt es nichts Besonderes, als grund kurz die Rolle im Index angeben.

### maerkte.renditen — [Morgenlauf]

Aktuelle Renditen 10-jähriger Staatsanleihen für Deutschland, USA, UK, Frankreich, Italien, Japan, China. Felder land, rendite (z. B. "2,61 %"). renditen_stand: z. B. "Stand 24.11., 14:00 Uhr, Quelle: …". (Die Seite lädt die Renditen live; diese Werte sind nur Rückfallebene.)

### maerkte.verschuldung — [Morgenlauf]

Staatsschulden für Deutschland, USA, Japan, Italien, Frankreich, UK, China. Felder land, quote (z. B. "63 %"), absolut (z. B. "2,7 Bio. €"). verschuldung_quelle: Quelle und Stand. Nur ändern, wenn neue Zahlen vorliegen.

### maerkte.termine — [Morgenlauf]

Nächste 8 wichtige Unternehmenstermine (Hauptversammlungen großer Konzerne, Dividenden-Ex-Tage, wichtige Quartalszahlen, DAX und US-Megacaps). Felder datum ("TT.MM."), was. (Rückfallebene für den Unternehmenskalender, weiter pflegen.)

---

## Politik

### politik.welt / politik.usa / politik.deutschland — [jeder Lauf]

Je 4 bis 5 wichtigste Meldungen (Felder wie Schlagzeilen: tag optional, titel, warum, quelle, url, zeit, medien). Schnelllauf: nur neue, wichtige Meldungen einfügen.

### politik.termine — [Morgenlauf]

Nächste 8 große politische Termine (Wahlen, Landtagswahlen, Gipfel, wichtige Abstimmungen). Felder datum, was, art.

### politik.recht / politik.recht_eu / politik.recht_usa — [jeder Lauf, bei neuen Entscheidungen]

Kachel „Gerichte & Gesetzgebung“ mit Umschalter Deutschland / EU / USA. Je Liste 2 bis 4 wirklich wichtige aktuelle Entscheidungen, Verfahren oder Gesetzgebungsschritte, nur das Wichtigste (Felder wie Schlagzeilen: tag, titel, warum, quelle, url, zeit, medien; Pflichtfelder inkl. zeit und medien). tag nennt das Organ.
- recht (Deutschland): BVerfG, BGH, BFH, BVerwG, BAG, große Bundesgesetzgebung (Kabinett, Bundestag, Bundesrat).
- recht_eu (EU): EuGH und EuG (Urteile, Schlussanträge), EU-Gesetzgebung (Kommissionsvorschläge, Trilog-Einigungen, Abstimmungen in Parlament und Rat, Inkrafttreten von Verordnungen und Richtlinien), große Kartell- und DMA-Entscheidungen der Kommission. tag z. B. „EuGH“, „EU-Parlament“, „Rat“, „Kommission“.
- recht_usa (USA): Supreme Court (Urteile, angenommene Fälle, Eilentscheidungen), wichtige Bundesgerichtsurteile, Gesetze im Kongress (Verabschiedung, Abstimmungen), Executive Orders des Präsidenten. tag z. B. „Supreme Court“, „Kongress“, „Executive Order“, „Bundesgericht“. Medien möglichst aus beiden Lagern.
Schnelllauf: kurz prüfen, ob es seit dem letzten Lauf neue Entscheidungen oder Gesetzgebungsschritte in Deutschland, der EU oder den USA gibt (z. B. Urteilsverkündungen BVerfG/EuGH am Vormittag, Supreme-Court-Orders am Nachmittag/Abend Berliner Zeit, Abstimmungen in Bundestag, EU-Parlament, Kongress), und diese vorne einfügen (älteste entfernen, max. 4). Ist recht, recht_eu oder recht_usa leer oder fehlt, sofort füllen (siehe Vorrang oben).

### politik.parlamente — [Morgenlauf]

Sitzverteilung und Regierungen; Struktur exakt beibehalten. Sonst unverändert lassen, außer eine Meldung des Laufs betrifft es direkt (Regierungsbildung, Wahl, Fraktionswechsel).
- deutschland.bundestag.sitze (Reihenfolge Linke, SPD, Grüne, CDU/CSU, AfD, fraktionslos).
- deutschland.laender (16 Länder: code, land, regierungschef, partei, koalition, optional hinweis; koalition als Parteinamen getrennt mit „–“, z. B. „SPD–Grüne–Linke“, die Seite färbt daraus Streifen; hinweis nur solange eine Regierungsbildung offen bzw. die Regierung geschäftsführend ist, danach Feld entfernen). Offene Punkte Stand 24.11.2026: Berlin (Wegner geschäftsführend, Linke/SPD/Grüne verhandeln), Sachsen-Anhalt (Schulze geschäftsführend, MP-Wahl im Dezember), Mecklenburg-Vorpommern (Schwesig mit SPD–Linke–Grüne; Wiederwahl bestätigen).
- usa.repraesentantenhaus/senat.sitze (Reihenfolge Demokraten, offen, Republikaner; "offen" nur solange Sitze unentschieden), usa.gouverneure (alle 50 Staaten: "D"/"R" des amtierenden Gouverneurs), usa.wechsel (Staaten, deren Gouverneursamt die Partei wechselt, solange der Amtsantritt noch aussteht; nach Amtsantritt den Staat in gouverneure umstellen und aus wechsel entfernen: Alaska am 7.12.2026, die übrigen im Januar 2027), kongress_hinweis und gouverneure_hinweis entsprechend anpassen (ab 3.1.2027 ist das der amtierende Kongress). stand und quelle aktualisieren.

---

## Konflikte (Tab „Konflikte“)

Objekt {stand, karte, liste, front, diplomatie, ruestung, markt, humanitaer, humanitaer_quelle, radar}. Leere Felder beim nächsten Lauf vollständig füllen.

### konflikte.stand und konflikte.liste — [jeder Lauf]

- **stand**: "Stand TT.MM., HH:MM Uhr".
- **liste**: 5 bis 7 wichtigste Konflikte, wichtigster zuerst (mindestens Ukraine, Iran/Golf mit Israel, Houthis und Hormus, Sudan; je nach Lage z. B. Gaza/Libanon, Taiwanstraße, DR Kongo, Myanmar, Sahel). Je {"id": kurzer fester Schlüssel in Kleinbuchstaben, bestehende ids beibehalten (ukraine, iran, sudan), "kurz": Name für den Umschalter, "name", "stufe" (1 bis 3 wie bei karte), "seit": Beginn, z. B. "24.02.2022", "lage": 2 bis 3 Sätze zur aktuellen Lage, "meldungen": 3 bis 5 aktuelle Meldungen mit Pflichtfeldern}. Schnelllauf: nur Konflikte mit neuen Ereignissen anfassen.

### konflikte.diplomatie, ruestung — [jeder Lauf, nur bei Neuem]

- **diplomatie**: 4 bis 5 Meldungen zu Verhandlungen, Waffenruhen, Gipfeln und Sanktionen (Pflichtfelder, tag z. B. "Ukraine", "Iran").
- **ruestung**: 4 bis 5 Meldungen zu Militärhilfe-Zusagen und Lieferungen, Rüstungsaufträgen und Verteidigungsbudgets (Pflichtfelder).
Schnelllauf: nur eine wichtige neue Meldung vorne einfügen, keine eigene Recherche dafür.

### konflikte.karte, front, markt, humanitaer, radar — [Morgenlauf]

- **karte**: alle aktiven Konflikte und Spannungen weltweit für die Weltkarte, je {"code": ISO-3166-Alpha-3 (z. B. "UKR", "SDN", "TWN"; "PSE" für Gaza/Westjordanland), "stufe": 3 = Krieg/Großkonflikt, 2 = bewaffneter Konflikt, 1 = angespannt ohne laufende Kämpfe, "konflikt": optional die id aus liste (dann springt ein Klick auf das Land zur Lage), "hinweis": kurz, z. B. "Bürgerkrieg Armee gegen RSF"}. Orientierung: CFR Global Conflict Tracker, Crisis Group CrisisWatch, ACLED. Im Morgenlauf vollständig prüfen, im Schnelllauf nur bei neuen Ereignissen.
- **front**: Frontverlauf Ukraine {"stand", "lage": 2 bis 3 Sätze, wer wo vorrückt und wie die Gebietsveränderungen der letzten Woche zu bewerten sind (nach ISW, Kyiv Independent, DeepState), "punkte": 3 bis 5 Meldungen mit Pflichtfeldern, tag z. B. "RU-Vorstoß", "UA-Gegenangriff", "Luftkrieg", titel nennt Ort und Richtung, "karten": [{"name": "ISW-Karte", "url": "…"}, {"name": "DeepStateMap", "url": "https://deepstatemap.live/en"}]}. Die ISW-Bewertung erscheint meist abends US-Zeit, im Morgenlauf einarbeiten.
- **markt**: {"lage": 2 Sätze mit Zahlen, wie die Konflikte gerade auf Öl, Gas, Gold, Rüstungsaktien und Fracht wirken, "routen": [{"route": "Straße von Hormus", "status": "kurz, z. B. Tankerverkehr −40 %, US-Blockade"}, ebenso Rotes Meer/Bab al-Mandab, Suezkanal, Schwarzes Meer, Taiwanstraße]}. Kurse zeigt die Seite live, nicht eintragen. Schnelllauf: nur bei großen Bewegungen.
- **humanitaer**: je Konflikt aus liste {"konflikt", "tote": z. B. "> 150.000 (Schätzung)", "vertriebene": z. B. "11,5 Mio., davon 4 Mio. im Ausland", "zugang": kurz, z. B. "stark eingeschränkt, Hungersnot in Darfur"}; nur belegte Zahlen von UN (OCHA, UNHCR, WFP), ACLED oder seriösen Medien. humanitaer_quelle: Quellen und Stand.
- **radar**: 4 bis 6 Spannungsherde, die eskalieren könnten (auch außerhalb der liste, z. B. Baltikum/Russland, Taiwan, Korea, Venezuela, Indien–Pakistan, Serbien–Kosovo), je {"ort", "stufe": "hoch"/"erhöht"/"beobachten", "warum": ein Satz mit aktuellem Anlass, "quelle", "url", "zeit"}.

---

## Energie (Tab „Energie“)

Struktur und Feldnamen beibehalten. Zahlen wie Strommix, Strompreise, Brent/WTI-Verlauf, US-Lager, CO₂-Auktionspreise und Gasspeicher lädt die Seite selbst aus energie.json bzw. live – NICHT eintragen, energie.json nie ändern. Objekt {stand, oel, gas, strom, routen, klima, eua, termine, news}.

### energie.stand, oel.lage, gas.lage, gas.ttf, eua, news — [jeder Lauf]

- **stand**: "TT.MM. HH:MM".
- **oel.lage**: 2 Sätze zum Ölmarkt mit Zahlen (Brent, Treiber wie Hormus, OPEC+, Nachfrage, IEA-/OPEC-Monatsberichte).
- **gas.lage**: 2 Sätze (Speicher, TTF, LNG, Wetter, EU-Verbot russischen Gases). **gas.ttf**: {"wert": TTF-Frontmonat in €/MWh als Zahl, "datum": "TT.MM.", "veraenderung": Tagesänderung in % als Zahl oder null}.
- **eua**: {"wert": EUA-Dezember-Future in €/t als Zahl, "datum": "TT.MM."} (Terminmarkt; die Auktionspreise lädt die Seite selbst).
- **news**: 5 bis 7 wichtigste Meldungen zu Öl, Gas, Strom, Erneuerbaren, Klima und Energiepolitik (Pflichtfelder inkl. tag, zeit, medien). Schnelllauf: nur neue Meldungen einfügen.

### energie.oel (übrige Felder), gas (übrige Felder), strom, routen, klima, termine — [Morgenlauf]

- **oel**: {"lage" (s. oben), "foerderung": größte Rohölförderer [{"land", "mbd": Mio. b/d als Zahl, "anteil": % der Weltförderung als Zahl}], "verbrauch": größte Verbraucher [{"land", "mbd", "anteil": Zahl oder null}], "quelle": Quelle und Jahr, "opec": {"stand": z. B. "Beschluss 1.11.", "lage": 2 bis 3 Sätze zum letzten Beschluss und zum nächsten Treffen, "quoten": [{"land", "quote": kb/d als Zahl}] der Länder mit monatlichen Quoten, "summe": Zahl}}. foerderung/verbrauch nur bei neuen Jahresdaten (Energy Institute, EIA) ändern; opec nach jedem OPEC+-Treffen aktualisieren (nächstes: 29.11.2026, Quoten 2027; am Tag des Treffens auch im Schnelllauf).
- **gas**: {"lage", "ttf" (s. oben), "speicher": {"eu", "de": Füllstand in % als Zahl, "datum"} (nur Rückfallwert, die Seite lädt AGSI live), "lng": [{"herkunft", "anteil": %}] Herkunft der EU-LNG-Importe laut aktueller Daten (IEEFA, Kpler, Eurostat), "quelle"}.
- **strom**: {"welt": [{"name", "jahr", "ee": Erneuerbaren-Anteil an der Stromerzeugung in %, "nuklear": % (optional), "hinweis"}] für Welt, EU, Deutschland, gern auch China und USA (Ember, BDEW/ZSW, EIA), "quelle"}. Nur bei neuen Daten ändern.
- **routen**: {"stand", "quelle", "liste": [{"route", "normal": Normalmenge, z. B. "20,9 Mio. b/d", "lage": kurz mit aktueller Zahl, "status": "rot"/"gelb"/"gruen"}]} für Straße von Hormus, Bab el-Mandeb/Rotes Meer, Suezkanal, Kap der Guten Hoffnung, Straße von Malakka, saudische Ost-West-Pipeline (Kpler, EIA, IMF PortWatch, Reuters, Lloyd's List). Stimmig mit konflikte.markt.routen halten.
- **klima**: {"stand", "lage": 1 bis 2 Sätze, "ziele": [{"land", "ziel": Ziel 2030 mit Basisjahr, "stand": letzter belegter Stand mit Jahr, "netto_null": Jahr, "kurs": "ok"/"knapp"/"nein", "hinweis"}] für Deutschland, EU, USA, China, Indien, Japan, Großbritannien, "quelle"}. Nur bei neuen Daten (UBA, EEA, Climate Action Tracker, UNFCCC) ändern.
- **termine**: nächste 5 bis 8 Energie- und Klimatermine [{"datum": "TT.MM.", "was"}] (OPEC+-Treffen, IEA-/OPEC-Monatsberichte, EIA-Wochenbericht, EU-Energieministerrat, COP/Bonn, Fristen wie das EU-Verbot russischen Gases); vergangene entfernen.

---

## Sport

### sport.ligen[].spiele — [jeder Lauf]

{"naechste": [...], "letzte": [...], "hinweis": optional}. naechste: die nächsten bis zu 8 Spiele chronologisch, je {"datum": "Mi 26.11.", "zeit": "18:45" (Anstoß in Berliner Zeit, auch bei US-Ligen; unbekannt → Feld weglassen), "heim", "gast", "info": optional kurz, z. B. "5. Spieltag", "Week 13", "Thanksgiving"}. letzte: die letzten bis zu 8 Ergebnisse, neuestes zuerst, je {"datum", "heim", "gast", "ergebnis": "Heim:Gast", z. B. "5:1" oder "112:104", "info": optional, z. B. "n.V.", "i.E.", "OT", "SO"}. Immer heim = Heimteam, gast = Gastteam (die Seite zeigt US-Spiele selbst als „Gast @ Heim“). Teamnamen wie in der Tabelle. Nur belegte Ansetzungen und Ergebnisse (offizielle Ligaseiten, kicker, ESPN, BBC Sport), nichts schätzen. Gespielte Partien aus naechste nach letzte verschieben; laufende Spiele erst nach Abpfiff eintragen. Saisonpause (z. B. MLB): naechste leer lassen, in hinweis den nächsten Saisonstart nennen; letzte = letzte Spiele der Saison (z. B. World Series).
Schnelllauf: nur Ligen, in denen seit dem letzten Lauf Spiele beendet wurden oder Ansetzungen fehlen.

### sport.ligen[] Schlagzeilen und Tabellen — [Morgenlauf]

Für CL, Bundesliga, Premier League, LaLiga, Serie A, NFL, NBA, NHL, MLB jeweils 3 Schlagzeilen (mit quelle, url, zeit) und die aktuelle Tabelle. Fußball: eine Tabelle mit spalten ["#","Verein","Sp","Diff","Pkt"] und allen Teams (CL: Ligaphase). US-Ligen: "us": true, je Conference eine Tabelle mit titel (z. B. "AFC", "Eastern Conference"), spalten ["#","Team","W","L","Pct"] (NHL: ["#","Team","GP","Pkt"]), Top 8 je Conference. In der Saisonpause: letzte Abschlusstabelle und das im Feld "stand" vermerken. Feld "stand": Datum der Tabelle. Tabellen nur neu recherchieren, wenn seit dem letzten Lauf Spiele stattfanden.
Schnelllauf: Tabelle einer Liga nur nachziehen, wenn dort seit dem letzten Lauf ein Spieltag komplett zu Ende ging; sonst erledigt das der nächste Morgenlauf.

---

## Sonstiges — [Morgenlauf]

`sonstiges`: englisch (wort, aussprache, wortart, bedeutung, beispiel; wirklich eloquentes C2-Wort), chinesisch (zeichen, pinyin, wortart, bedeutung, beispiel), funfact, wissen (3 Einträge bereich/fakt: Geschichte, Wirtschaft, Allgemeinwissen), steuerrecht (frage, antwort, norm). Bei späteren Läufen desselben Tages unverändert lassen. Ist sonstiges noch der Startinhalt (Wort „perspicacious“), im Morgenlauf trotzdem einmal neu füllen.

---

## Mehr zum Thema (`mehr`) — [Morgenlauf]

Öffnet sich auf der Seite beim Klick auf eine Kachelüberschrift. Objekt auf oberster Ebene von data.json mit diesen Schlüsseln: schlagzeilen, watch, devisen, rohstoffe, anleihen, indizes, verschuldung, unternehmen (Märkte), welt, usa, deutschland, termine, recht (Politik; deckt Deutschland, EU und USA ab) sowie konflikte, radar, front, diplomatie, ruestung, konfliktmarkt, humanitaer (Konflikte) sowie energie_oel, energie_opec, energie_gas, energie_strom, energie_preise, energie_routen, energie_klima, energie_co2, energie_news (Energie).

Jeder Eintrag: {"lage": "2 bis 3 Sätze, wie die Lage in diesem Thema gerade ist und worauf es ankommt", "meldungen": [5 bis 8 Meldungen mit tag (optional), titel, warum, quelle, url, zeit, medien]}. Es sollen WEITERE Meldungen sein, die nicht schon in der Kachel selbst stehen, gern mit Hintergrund und Analyse (auch Handelsblatt, Zeit, FT, Bloomberg, Economist, wenn frei lesbar).

Themen: devisen: EUR/USD, USD/JPY, CNY usw. und Notenbanken; rohstoffe: Öl, Gas, Gold, Silber, Kupfer; anleihen: Renditen, Notenbanken, Haushalte, Staatsverschuldung (Klick auf die Kachel „Anleihen & Verschuldung“); indizes: DAX, S&P 500, Nasdaq, Nikkei, Bitcoin; verschuldung: Haushalts- und Schuldendebatten; unternehmen: anstehende Zahlen, HVs, Deals (Klick auf den Unternehmenskalender); watch: Hintergrund zu den Watchlist-Titeln; termine: Vorschau auf die anstehenden politischen Termine; konflikte: Gesamtlage und Analysen über alle Konflikte; radar: Hintergrund zu den Spannungsherden; front: Analysen zum Frontverlauf Ukraine (ISW, Kyiv Independent, Militärexperten); diplomatie: Hintergründe zu Verhandlungen und Sanktionen; ruestung: Rüstungsindustrie, Beschaffung, NATO-Ausgaben; konfliktmarkt: Öl, Gas, Gold, Rüstungsaktien, Fracht und Versicherungsprämien; humanitaer: UN-Berichte, Hunger, Hilfszugang; energie_oel: Ölmarkt-Analysen und Prognosen (IEA, OPEC, EIA); energie_opec: OPEC+ und Lagerdaten; energie_gas: Gasspeicher, LNG, TTF; energie_strom: Strommix, Netzausbau, Energiewende; energie_preise: Strompreise, Industriestrompreis, Netzentgelte; energie_routen: Seewege, Tanker, Pipelines; energie_klima: Klimapolitik, COP, Emissionen; energie_co2: Emissionshandel EU-ETS/ETS2, CO₂-Preis; energie_news: weitere Energiewende-Meldungen.

Fehlt mehr oder ein Schlüssel, vollständig anlegen (auch im Schnelllauf). Im Morgenlauf alle Schlüssel aktualisieren, Unverändertes darf bleiben. Schnelllauf: siehe oben (verdrängte Kachel-Meldungen dürfen hierher wandern).
