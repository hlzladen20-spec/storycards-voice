import {BASIC_EXPANSIONS} from './vocabulary-basic-extra.js';
// Original StoryCards teaching selection. Counts describe this fixed collection,
// not a CEFR certificate or an exhaustive list of the English language.
const topic=(id,title,rows)=>({id,title,entries:rows.trim().split('\n').map(row=>{
 const [back,front]=row.split('|');let sense=2166136261;
 for(const character of front)sense=Math.imul(sense^character.charCodeAt(0),16777619)>>>0;
 return {id:id+'-'+back.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+sense.toString(36),front,back};
})});
const basic=[
topic('contact','Begrüßung & erste Gespräche',`
hello|hallo
goodbye|auf Wiedersehen
please|bitte
thank you|danke
yes|ja
no|nein
sorry|Entschuldigung
welcome|willkommen
good morning|guten Morgen
good afternoon|guten Tag
good evening|guten Abend
good night|gute Nacht
see you|bis bald
excuse me|entschuldigen Sie
of course|natürlich
maybe|vielleicht
okay|in Ordnung
help|Hilfe
name|der Name
first name|der Vorname
surname|der Nachname
address|die Adresse
phone number|die Telefonnummer
email|die E-Mail
language|die Sprache
English|Englisch
German|Deutsch
Spanish|Spanisch
French|Französisch
country|das Land
nationality|die Staatsangehörigkeit
question|die Frage
answer|die Antwort
word|das Wort
sentence|der Satz
meaning|die Bedeutung
example|das Beispiel
mistake|der Fehler
conversation|das Gespräch
message|die Nachricht
information|die Information
again|noch einmal
slowly|langsam
together|zusammen
alone|allein
really|wirklich
sure|sicher
understand|verstehen
repeat|wiederholen
introduce|vorstellen
`),
topic('people','Menschen & Familie',`
person|die Person
people|die Leute
man|der Mann
woman|die Frau
child|das Kind
baby|das Baby
boy|der Junge
girl|das Mädchen
family|die Familie
mother|die Mutter
father|der Vater
parent|das Elternteil
son|der Sohn
daughter|die Tochter
brother|der Bruder
sister|die Schwester
grandmother|die Großmutter
grandfather|der Großvater
grandchild|das Enkelkind
aunt|die Tante
uncle|der Onkel
cousin|der Cousin
niece|die Nichte
nephew|der Neffe
husband|der Ehemann
wife|die Ehefrau
partner|der Partner
friend|der Freund
neighbour|der Nachbar
guest|der Gast
adult|der Erwachsene
teenager|der Jugendliche
relative|der Verwandte
couple|das Paar
group|die Gruppe
team|das Team
member|das Mitglied
visitor|der Besucher
stranger|der Fremde
twins|die Zwillinge
wedding|die Hochzeit
marriage|die Ehe
birthday|der Geburtstag
age|das Alter
young|jung
old|alt
married|verheiratet
single|ledig
divorced|geschieden
relationship|die Beziehung
`),
topic('health','Körper & Gesundheit',`
body|der Körper
head|der Kopf
face|das Gesicht
hair|das Haar
eye|das Auge
ear|das Ohr
nose|die Nase
mouth|der Mund
tooth|der Zahn
tongue|die Zunge
neck|der Hals
shoulder|die Schulter
arm|der Arm
elbow|der Ellenbogen
hand|die Hand
finger|der Finger
thumb|der Daumen
chest|der Brustkorb
back|der Rücken
stomach|der Bauch
leg|das Bein
knee|das Knie
foot|der Fuß
toe|die Zehe
skin|die Haut
heart|das Herz
blood|das Blut
bone|der Knochen
health|die Gesundheit
doctor|der Arzt
nurse|die Pflegekraft
patient|der Patient
hospital|das Krankenhaus
pharmacy|die Apotheke
medicine|das Medikament
pain|der Schmerz
headache|die Kopfschmerzen
cold|die Erkältung
cough|der Husten
fever|das Fieber
ill|krank
healthy|gesund
tired|müde
hungry|hungrig
thirsty|durstig
injury|die Verletzung
appointment|der Termin
emergency|der Notfall
allergy|die Allergie
dentist|der Zahnarzt
`),
topic('food','Essen & Trinken',`
food|das Essen
drink|das Getränk
water|das Wasser
milk|die Milch
tea|der Tee
coffee|der Kaffee
juice|der Saft
bread|das Brot
butter|die Butter
cheese|der Käse
egg|das Ei
meat|das Fleisch
chicken|das Hähnchenfleisch
beef|das Rindfleisch
pork|das Schweinefleisch
fish|der Fisch
rice|der Reis
pasta|die Nudeln
potato|die Kartoffel
soup|die Suppe
salad|der Salat
vegetable|das Gemüse
fruit|das Obst
apple|der Apfel
banana|die Banane
orange|die Orange
lemon|die Zitrone
grape|die Weintraube
strawberry|die Erdbeere
tomato|die Tomate
carrot|die Karotte
onion|die Zwiebel
pepper|die Paprika
salt|das Salz
sugar|der Zucker
oil|das Öl
flour|das Mehl
cake|der Kuchen
biscuit|der Keks
chocolate|die Schokolade
ice cream|das Eis
breakfast|das Frühstück
lunch|das Mittagessen
dinner|das Abendessen
meal|die Mahlzeit
snack|die Zwischenmahlzeit
menu|die Speisekarte
bill|die Rechnung
restaurant|das Restaurant
café|das Café
`),
topic('home','Wohnen & Haushalt',`
home|das Zuhause
house|das Haus
flat|die Wohnung
room|das Zimmer
kitchen|die Küche
bathroom|das Badezimmer
bedroom|das Schlafzimmer
living room|das Wohnzimmer
hall|der Flur
floor|der Fußboden
wall|die Wand
ceiling|die Zimmerdecke
roof|das Dach
door|die Tür
window|das Fenster
stairs|die Treppe
balcony|der Balkon
garden|der Garten
garage|die Garage
key|der Schlüssel
table|der Tisch
chair|der Stuhl
sofa|das Sofa
bed|das Bett
pillow|das Kopfkissen
blanket|die Bettdecke
wardrobe|der Kleiderschrank
cupboard|der Schrank
shelf|das Regalbrett
desk|der Schreibtisch
lamp|die Lampe
mirror|der Spiegel
carpet|der Teppich
curtain|der Vorhang
fridge|der Kühlschrank
oven|der Backofen
washing machine|die Waschmaschine
shower|die Dusche
bath|die Badewanne
toilet|die Toilette
towel|das Handtuch
soap|die Seife
toothbrush|die Zahnbürste
plate|der Teller
cup|die Tasse
glass|das Trinkglas
knife|das Messer
fork|die Gabel
spoon|der Löffel
bin|der Mülleimer
`),
];
basic.push(
topic('clothing','Kleidung & Farben',`
clothes|die Kleidung
shirt|das Hemd
T-shirt|das T-Shirt
trousers|die Hose
jeans|die Jeans
shorts|die kurze Hose
skirt|der Rock
dress|das Kleid
jumper|der Pullover
jacket|die Jacke
coat|der Mantel
hat|der Hut
cap|die Mütze
scarf|der Schal
glove|der Handschuh
sock|die Socke
shoe|der Schuh
boot|der Stiefel
trainer|der Turnschuh
sandal|die Sandale
suit|der Anzug
tie|die Krawatte
belt|der Gürtel
pocket|die Tasche am Kleidungsstück
button|der Knopf
zip|der Reißverschluss
underwear|die Unterwäsche
pyjamas|der Schlafanzug
swimsuit|der Badeanzug
glasses|die Brille
watch|die Armbanduhr
ring|der Fingerring
necklace|die Halskette
size|die Größe
colour|die Farbe
black|schwarz
white|weiß
red|rot
blue|blau
green|grün
yellow|gelb
brown|braun
grey|grau
pink|rosa
purple|lila
golden|goldfarben
silver|silberfarben
dark|dunkel
light blue|hellblau
colourful|bunt
`),
topic('school','Schule & Lernen',`
school|die Schule
teacher|die Lehrkraft
student|der Student
pupil|der Schüler
class|die Schulklasse
classroom|das Klassenzimmer
lesson|die Unterrichtsstunde
course|der Kurs
subject|das Schulfach
homework|die Hausaufgaben
exam|die Prüfung
test|der Test
mark|die Schulnote
book|das Buch
notebook|das Schulheft
page|die Seite
paper|das Papier
pen|der Kugelschreiber
pencil|der Bleistift
rubber|der Radiergummi
ruler|das Lineal
schoolbag|der Schulranzen
board|die Tafel
dictionary|das Wörterbuch
library|die Bibliothek
university|die Universität
college|die weiterführende Schule
education|die Bildung
learn|lernen
study|studieren
read|lesen
write|schreiben
spell|buchstabieren
count|zählen
practise|üben
explain|erklären
remember|sich erinnern
forget|vergessen
know|wissen
think|denken
idea|die Idee
letter|der Buchstabe
alphabet|das Alphabet
grammar|die Grammatik
history|die Geschichte als Schulfach
geography|die Erdkunde
science|die Naturwissenschaft
maths|die Mathematik
art|die Kunst
music|die Musik
`),
topic('work','Arbeit & Berufe',`
work|die Arbeit
job|die Arbeitsstelle
office|das Büro
company|das Unternehmen
business|das Geschäft als Tätigkeit
boss|der Chef
colleague|der Kollege
customer|der Kunde
meeting|die Besprechung
project|das Projekt
task|die Aufgabe
break|die Pause
salary|das Gehalt
money|das Geld
price|der Preis
cost|die Kosten
shop|der Laden
factory|die Fabrik
farm|der Bauernhof
worker|der Arbeiter
manager|der Leiter
assistant|der Assistent
secretary|die Sekretärin
engineer|der Ingenieur
driver|der Fahrer
cook|der Koch
waiter|der Kellner
waitress|die Kellnerin
police officer|der Polizist
firefighter|die Feuerwehrkraft
farmer|der Landwirt
builder|der Bauarbeiter
mechanic|der Mechaniker
electrician|der Elektriker
hairdresser|der Friseur
cleaner|die Reinigungskraft
actor|der Schauspieler
artist|der Künstler
musician|der Musiker
writer|der Schriftsteller
photographer|der Fotograf
receptionist|die Empfangskraft
interview|das Vorstellungsgespräch
application|die Bewerbung
contract|der Vertrag
experience|die Erfahrung
skill|die Fähigkeit
training|die Ausbildung
full-time|in Vollzeit
part-time|in Teilzeit
`),
topic('time','Zeit & Kalender',`
time|die Zeit
second|die Sekunde
minute|die Minute
hour|die Stunde
day|der Tag
week|die Woche
month|der Monat
year|das Jahr
today|heute
yesterday|gestern
tomorrow|morgen
morning|der Morgen
afternoon|der Nachmittag
evening|der Abend
night|die Nacht
noon|der Mittag
midnight|die Mitternacht
Monday|der Montag
Tuesday|der Dienstag
Wednesday|der Mittwoch
Thursday|der Donnerstag
Friday|der Freitag
Saturday|der Samstag
Sunday|der Sonntag
January|der Januar
February|der Februar
March|der März
April|der April
May|der Mai
June|der Juni
July|der Juli
August|der August
September|der September
October|der Oktober
November|der November
December|der Dezember
weekend|das Wochenende
date|das Datum
calendar|der Kalender
clock|die Uhr
early|früh
late|spät
now|jetzt
soon|bald
later|später
always|immer
often|oft
sometimes|manchmal
never|nie
usually|gewöhnlich
`),
topic('numbers','Zahlen & Mengen',`
zero|null
one|eins
two|zwei
three|drei
four|vier
five|fünf
six|sechs
seven|sieben
eight|acht
nine|neun
ten|zehn
eleven|elf
twelve|zwölf
thirteen|dreizehn
fourteen|vierzehn
fifteen|fünfzehn
sixteen|sechzehn
seventeen|siebzehn
eighteen|achtzehn
nineteen|neunzehn
twenty|zwanzig
thirty|dreißig
forty|vierzig
fifty|fünfzig
sixty|sechzig
seventy|siebzig
eighty|achtzig
ninety|neunzig
hundred|hundert
thousand|tausend
million|die Million
first|erste
third|dritte
last|letzte
next|nächste
half|die Hälfte
quarter|das Viertel
number|die Zahl
amount|die Menge
total|die Gesamtsumme
all|alle
some|einige
any|irgendwelche
many|viele bei Zählbarem
much|viel bei Nichtzählbarem
few|wenige
enough|genug
more|mehr
less|weniger
several|mehrere
`)
);
basic.push(
topic('travel','Reisen & Verkehr',`
car|das Auto
bus|der Bus
train|der Zug
plane|das Flugzeug
boat|das Boot
ship|das Schiff
bicycle|das Fahrrad
motorbike|das Motorrad
taxi|das Taxi
tram|die Straßenbahn
underground|die U-Bahn
vehicle|das Fahrzeug
passenger|der Fahrgast
journey|die Reise als Weg
trip|der Ausflug
holiday|der Urlaub
travel|reisen
luggage|das Gepäck
suitcase|der Koffer
passport|der Reisepass
ticket|die Fahrkarte
return ticket|die Hin- und Rückfahrkarte
single ticket|die einfache Fahrkarte
seat|der Sitzplatz
platform|der Bahnsteig
airport|der Flughafen
station|der Bahnhof
bus stop|die Bushaltestelle
port|der Hafen
flight|der Flug
departure|die Abfahrt
arrival|die Ankunft
delay|die Verspätung
hotel|das Hotel
hostel|die Jugendherberge
reservation|die Reservierung
reception|die Rezeption
lift|der Aufzug
entrance|der Eingang
exit|der Ausgang
road|die Straße als Verkehrsweg
street|die Straße im Ort
traffic|der Verkehr
bridge|die Brücke
tunnel|der Tunnel
crossing|die Kreuzung
traffic lights|die Ampel
petrol|das Benzin
driving licence|der Führerschein
map|die Landkarte
`),
topic('town','Stadt & Orientierung',`
town|die Stadt
city|die Großstadt
village|das Dorf
capital|die Hauptstadt
centre|das Zentrum
square|der Platz
park|der Park
building|das Gebäude
church|die Kirche
museum|das Museum
theatre|das Theater
bank|die Bank für Geldgeschäfte
post office|das Postamt
supermarket|der Supermarkt
market|der Markt
bakery|die Bäckerei
butcher|der Metzger
shopping centre|das Einkaufszentrum
police station|die Polizeiwache
town hall|das Rathaus
playground|der Spielplatz
car park|der Parkplatz
pavement|der Gehweg
corner|die Ecke
path|der Pfad
sign|das Schild
left|links
right|rechts
straight ahead|geradeaus
near|nah
far|weit entfernt
north|der Norden
south|der Süden
east|der Osten
west|der Westen
opposite|gegenüber
between|zwischen
behind|hinter
in front of|vor als Ortsangabe
next to|neben
across|hinüber
along|entlang
around|um herum
through|durch
direction|die Richtung
distance|die Entfernung
kilometre|der Kilometer
metre|der Meter
area|das Gebiet
place|der Ort
`),
topic('nature','Natur & Wetter',`
weather|das Wetter
sun|die Sonne
moon|der Mond
star|der Stern
sky|der Himmel
cloud|die Wolke
rain|der Regen
snow|der Schnee
wind|der Wind
storm|der Sturm
fog|der Nebel
ice|das gefrorene Eis
temperature|die Temperatur
degree|das Grad als Temperatureinheit
season|die Jahreszeit
spring|der Frühling
summer|der Sommer
autumn|der Herbst
winter|der Winter
sunny|sonnig
cloudy|bewölkt
rainy|regnerisch
windy|windig
snowy|verschneit
foggy|neblig
hot|heiß
warm|warm
cool|kühl
freezing|eiskalt
wet|nass
dry|trocken
nature|die Natur
earth|die Erde
world|die Welt
sea|das Meer
ocean|der Ozean
river|der Fluss
lake|der See
mountain|der Berg
hill|der Hügel
forest|der Wald
beach|der Strand
island|die Insel
field|das Feld
desert|die Wüste
stone|der Stein
sand|der Sand
fire|das Feuer
air|die Luft
light|das Licht
`),
topic('animals','Tiere & Pflanzen',`
animal|das Tier
pet|das Haustier
dog|der Hund
cat|die Katze
rabbit|das Kaninchen
cow|die Kuh
pig|das Schwein
sheep|das Schaf
horse|das Pferd
goat|die Ziege
duck|die Ente
goose|die Gans
bird|der Vogel
hen|die Henne
turkey|der Truthahn
mouse|die Maus
rat|die Ratte
lion|der Löwe
tiger|der Tiger
elephant|der Elefant
monkey|der Affe
bear|der Bär
fox|der Fuchs
wolf|der Wolf
deer|das Reh
snake|die Schlange
frog|der Frosch
turtle|die Schildkröte
butterfly|der Schmetterling
bee|die Biene
fly|die Fliege
spider|die Spinne
ant|die Ameise
insect|das Insekt
plant|die Pflanze
tree|der Baum
flower|die Blume
grass|das Gras
leaf|das Blatt am Baum
root|die Wurzel
branch|der Ast
seed|der Samen
rose|die Rose
bush|der Busch
wood|das Holz
soil|die Erde zum Pflanzen
wing|der Flügel
tail|der Schwanz
feather|die Feder
fur|das Fell
`),
topic('leisure','Freizeit & Medien',`
hobby|das Hobby
free time|die Freizeit
game|das Spiel
toy|das Spielzeug
party|die Feier
picnic|das Picknick
festival|das Fest
concert|das Konzert
cinema|das Kino
film|der Film
television|das Fernsehen
radio|das Radio
newspaper|die Zeitung
magazine|die Zeitschrift
story|die Erzählung
novel|der Roman
poem|das Gedicht
song|das Lied
guitar|die Gitarre
piano|das Klavier
drum|die Trommel
camera|der Fotoapparat
photo|das Foto
picture|das Bild
painting|das Gemälde
draw|zeichnen
paint|malen
sing|singen
dance|tanzen
play|spielen
listen|zuhören
collect|sammeln
enjoy|genießen
relax|sich entspannen
computer|der Computer
laptop|der Laptop
tablet|der Tabletcomputer
phone|das Telefon
smartphone|das Smartphone
screen|der Bildschirm
keyboard|die Tastatur
internet|das Internet
website|die Internetseite
password|das Passwort
video|das Video
headphones|die Kopfhörer
speaker|der Lautsprecher
app|die App
online|im Internet
download|herunterladen
`)
);
basic.push(
topic('sport','Sport & Bewegung',`
sport|der Sport
football|der Fußball
basketball|der Basketball
tennis|das Tennis
volleyball|der Volleyball
golf|das Golf
swimming|das Schwimmen
cycling|das Radfahren
running|das Laufen
hiking|das Wandern
skiing|das Skifahren
skating|das Schlittschuhlaufen
yoga|das Yoga
gym|das Fitnessstudio
stadium|das Stadion
swimming pool|das Schwimmbad
ball|der Ball
bat|der Schläger beim Baseball
racket|der Tennisschläger
net|das Netz
goal|das Tor im Sport
match|das Sportspiel
race|das Rennen
competition|der Wettbewerb
winner|der Gewinner
prize|der Preis als Gewinn
player|der Spieler
coach|der Sporttrainer
club|der Verein
exercise|die Übung
run|laufen
walk|zu Fuß gehen
swim|schwimmen
ride|reiten oder mitfahren
jump|springen
throw|werfen
catch|fangen
kick|treten
climb|klettern
win|gewinnen
lose|verlieren
score|Punkte erzielen
stretch|sich dehnen
fit|körperlich fit
strong|stark
weak|schwach
fast|schnell
slow|langsam in der Bewegung
active|aktiv
healthy lifestyle|die gesunde Lebensweise
`),
topic('actions','Tätigkeiten im Alltag',`
be|sein
have|haben
do|tun
make|machen
go|gehen
come|kommen
get|bekommen
take|nehmen
give|geben
put|stellen oder legen
bring|bringen
eat|essen
have a drink|etwas trinken
prepare|vorbereiten
sleep|schlafen
wake up|aufwachen
get up|aufstehen
sit|sitzen
stand|stehen
open|öffnen
close|schließen
start|anfangen
stop|anhalten
finish|beenden
wait|warten
look|schauen
see|sehen
hear|hören
find|finden
buy|kaufen
sell|verkaufen
pay|bezahlen
use|benutzen
need|brauchen
want|wollen
like|mögen
love|lieben
hate|hassen
live|leben
stay|bleiben
leave|verlassen
move|sich bewegen
carry|tragen
wash|waschen
clean|reinigen
brush|bürsten
wear|Kleidung tragen
change|ändern
push|schieben
pull|ziehen
`),
topic('feelings','Gefühle & Eigenschaften',`
good|gut
bad|schlecht
big|groß
small|klein
long|lang
short|kurz
high|hoch
low|niedrig
new|neu
happy|glücklich
sad|traurig
angry|wütend
afraid|ängstlich
worried|besorgt
excited|aufgeregt
bored|gelangweilt
busy|beschäftigt
free|frei
easy|einfach
difficult|schwierig
interesting|interessant
boring|langweilig
beautiful|schön
ugly|hässlich
nice|nett
kind|freundlich und hilfsbereit
friendly|freundlich
polite|höflich
rude|unhöflich
funny|lustig
serious|ernst
clever|klug
careful|vorsichtig
dangerous|gefährlich
safe|sicher und ungefährlich
cheap|preisgünstig
expensive|teuer
full|voll
empty|leer
tidy|ordentlich
dirty|schmutzig
quiet|ruhig
loud|laut
heavy|schwer vom Gewicht
soft|weich
hard|hart
comfortable|bequem
important|wichtig
different|anders
same|gleich
`),
topic('communication','Miteinander sprechen',`
speak|sprechen
talk|sich unterhalten
say|sagen
tell|erzählen
ask|fragen
reply|antworten
call|anrufen
meet|treffen
visit|besuchen
invite|einladen
thank|sich bedanken
apologise|sich entschuldigen
smile|lächeln
laugh|lachen
cry|weinen
shout|rufen
agree|zustimmen
disagree|widersprechen
choose|auswählen
decide|entscheiden
hope|hoffen
believe|glauben
feel|fühlen
try|versuchen
promise|versprechen
offer|anbieten
accept|annehmen
refuse|ablehnen
send|senden
receive|empfangen
show|zeigen
share|teilen
join|sich anschließen
follow|folgen
allow|erlauben
can|können
could|könnte
must|müssen
should|sollte
would|würde
will|werden für die Zukunft
may I|darf ich
let|lassen
seem|scheinen
happen|geschehen
reason|der Grund
opinion|die Meinung
problem|das Problem
plan|der Plan
choice|die Wahl
`),
topic('building-blocks','Wichtige Satzbausteine',`
I|ich
you|du oder ihr
he|er
she|sie als Subjekt
it|es
we|wir
they|sie in der Mehrzahl
me|mich oder mir
him|ihn oder ihm
her|sie oder ihr als Objekt
us|uns
them|sie oder ihnen in der Mehrzahl
my|mein
your|dein oder euer
his|sein im Besitz
its|sein bei Sachen
our|unser
their|ihr in der Mehrzahl
this|dieser oder dieses
that|jener oder jenes
these|diese hier in der Mehrzahl
those|jene dort in der Mehrzahl
a|ein oder eine
the|der, die oder das
and|und
or|oder
but|aber
because|weil
if|wenn als Bedingung
when|wann
where|wo
who|wer
what|was
why|warum
how|wie
which|welcher oder welche
with|mit
without|ohne
for|für
from|von oder aus
to|zu oder nach
in|in oder im
on|auf
under|unter
over|über
up|nach oben
down|nach unten
here|hier
there|dort
not|nicht
`)
);
for(const [id,rows] of BASIC_EXPANSIONS)basic.find(item=>item.id===id).entries.push(...topic(id,'',rows).entries);
const building=[
topic('organising','Alltag organisieren',`
arrange|vereinbaren
cancel|absagen
postpone|verschieben
confirm|bestätigen
remind|erinnern an
appointment book|der Terminkalender
schedule|der Zeitplan
routine|die Routine
habit|die Gewohnheit
responsibility|die Verantwortung
permission|die Erlaubnis
request|die Bitte als Anliegen
requirement|die Anforderung
available|verfügbar
unavailable|nicht verfügbar
convenient|praktisch gelegen
urgent|dringend
necessary|notwendig
optional|freiwillig wählbar
regular|regelmäßig
frequent|häufig
rare|selten
recent|kürzlich geschehen
currently|derzeit
eventually|schließlich
actually|tatsächlich
already|schon
still|immer noch
yet|noch bei Verneinungen
almost|fast erreicht
nearly|beinahe
perhaps|vielleicht auch
probably|wahrscheinlich
certainly|gewiss
especially|besonders
instead|stattdessen
otherwise|andernfalls
although|obwohl
however|jedoch
therefore|deshalb
unless|es sei denn
until|bis
since|seit
before|bevor
after|nachher oder nachdem
during|während eines Zeitraums
while|während etwas geschieht
as soon as|sobald
at least|mindestens
in advance|im Voraus
`),
topic('cooperation','Beruf & Zusammenarbeit',`
employer|der Arbeitgeber
employee|der Arbeitnehmer
department|die Abteilung
workplace|der Arbeitsplatz
profession|der Beruf
career|die berufliche Laufbahn
qualification|die Qualifikation
certificate|das Zertifikat
degree course|der Studiengang
apprenticeship|die Lehre
internship|das Praktikum
promotion|die Beförderung
retirement|der Ruhestand
unemployment|die Arbeitslosigkeit
wage|der Arbeitslohn
income|das Einkommen
shift|die Arbeitsschicht
overtime|die Überstunden
deadline|die Abgabefrist
progress|der Fortschritt
achievement|die Leistung
success|der Erfolg
failure|der Misserfolg
feedback|die Rückmeldung
suggestion|der Vorschlag
advice|der Rat
support|die Unterstützung
improve|verbessern
develop|entwickeln
achieve|erreichen
manage|bewältigen
organise|organisieren
discuss|diskutieren
attend|teilnehmen an
contribute|beitragen
cooperate|zusammenarbeiten
prepare for|sich vorbereiten auf
focus on|sich konzentrieren auf
deal with|umgehen mit
depend on|abhängen von
reliable|zuverlässig
responsible|verantwortlich
patient with|geduldig mit
confident|selbstsicher
experienced|erfahren
skilful|geschickt
efficient|effizient
flexible|anpassungsfähig
independent|selbstständig
successful|erfolgreich
`),
topic('services','Einkaufen & Dienstleistungen',`
purchase|der Kauf
receipt|der Kassenbon
refund|die Rückerstattung
discount|der Rabatt
bargain|das Schnäppchen
special offer|das Sonderangebot
cash|das Bargeld
credit card|die Kreditkarte
debit card|die Debitkarte
bank account|das Bankkonto
cash machine|der Geldautomat
transfer|die Überweisung
payment|die Zahlung
deposit|die Anzahlung
fee|die Gebühr
rent|die Miete
insurance|die Versicherung
delivery|die Lieferung
parcel|das Paket
package|die Verpackungseinheit
envelope|der Briefumschlag
stamp|die Briefmarke
queue|die Warteschlange
checkout|die Ladenkasse
basket|der Einkaufskorb
trolley|der Einkaufswagen
product|das Produkt
brand|die Marke
quality|die Qualität
quantity|die Stückzahl
label|das Etikett
instruction|die Anweisung
guarantee|die Garantie
repair|die Reparatur
replacement|der Ersatz
complaint|die Beschwerde
damaged|beschädigt
broken|kaputt
faulty|fehlerhaft
suitable|geeignet
affordable|bezahlbar
valuable|wertvoll
second-hand|gebraucht
in stock|auf Lager
out of stock|nicht vorrätig
try on|anprobieren
take back|zurückbringen
exchange|umtauschen
order|bestellen
borrow|ausleihen
`)
];
const everyday=[
topic('society','Gesellschaft & Meinungen',`
society|die Gesellschaft
community|die Gemeinschaft
population|die Bevölkerung
citizen|der Bürger
government|die Regierung
parliament|das Parlament
election|die Wahl zum Parlament
vote|abstimmen
politician|der Politiker
policy|die politische Maßnahme
democracy|die Demokratie
freedom|die Freiheit
equality|die Gleichberechtigung
justice|die Gerechtigkeit
law|das Gesetz
rule|die Regel
rights|die Rechte
duty|die Pflicht
tax|die Steuer
budget|der Haushalt als Finanzplan
economy|die Wirtschaft
employment|die Beschäftigung
poverty|die Armut
wealth|der Wohlstand
inequality|die Ungleichheit
opportunity|die Gelegenheit
challenge|die Herausforderung
debate|die Debatte
argument|das Argument
evidence|der Beleg
fact|die Tatsache
claim|die Behauptung
attitude|die Einstellung
perspective|der Blickwinkel
advantage|der Vorteil
disadvantage|der Nachteil
benefit|der Nutzen
drawback|der Nachteil einer Lösung
consequence|die Folge
impact|die Auswirkung
influence|der Einfluss
approach|die Herangehensweise
solution|die Lösung
compromise|der Kompromiss
convince|überzeugen
consider|in Betracht ziehen
assume|annehmen als Vermutung
argue|argumentieren
in my view|meiner Ansicht nach
on the other hand|andererseits
`),
topic('environment','Umwelt & moderne Welt',`
environment|die Umwelt
climate|das Klima
climate change|der Klimawandel
global warming|die Erderwärmung
pollution|die Umweltverschmutzung
emission|der Ausstoß von Schadstoffen
carbon dioxide|das Kohlendioxid
energy|die Energie
electricity|der elektrische Strom
fuel|der Kraftstoff
renewable|erneuerbar
sustainable|nachhaltig
recycle|wiederverwerten
reuse|erneut verwenden
reduce|verringern
waste|der Abfall
plastic|der Kunststoff
packaging|das Verpackungsmaterial
resource|die Ressource
consumption|der Verbrauch
conservation|der Naturschutz
wildlife|die wildlebenden Tiere
species|die Art von Lebewesen
habitat|der Lebensraum
extinction|das Aussterben
protect|schützen
preserve|erhalten und bewahren
prevent|verhindern
avoid|vermeiden
replace|ersetzen
technology|die Technologie
device|das technische Gerät
software|die Software
hardware|die Hardware
network|das Netzwerk
connection|die Verbindung
data|die Daten
privacy|die Privatsphäre
security|die Sicherheit
account|das Benutzerkonto
subscription|das Abonnement
update|die Aktualisierung
upload|hochladen
delete|löschen
save|speichern
search|suchen
access|der Zugang
digital|digital
artificial intelligence|die künstliche Intelligenz
social media|die sozialen Medien
`),
topic('relationships','Gefühle & Entscheidungen',`
emotion|die Emotion
mood|die Stimmung
confidence|das Selbstvertrauen
curiosity|die Neugier
enthusiasm|die Begeisterung
disappointment|die Enttäuschung
frustration|der Frust
relief|die Erleichterung
gratitude|die Dankbarkeit
pride|der Stolz
guilt|das Schuldgefühl
shame|die Scham
jealousy|die Eifersucht
sympathy|das Mitgefühl
trust|das Vertrauen
respect|der Respekt
honesty|die Ehrlichkeit
loyalty|die Treue
friendship|die Freundschaft
conflict|der Konflikt
misunderstanding|das Missverständnis
expectation|die Erwartung
intention|die Absicht
decision|die Entscheidung
priority|die Priorität
ambition|der Ehrgeiz
motivation|die Motivation
effort|die Anstrengung
patience|die Geduld
courage|der Mut
determination|die Entschlossenheit
disappointed|enttäuscht
embarrassed|verlegen
grateful|dankbar
proud|stolz
ashamed|beschämt
jealous|eifersüchtig
curious|neugierig
generous|großzügig
honest|ehrlich
thoughtful|rücksichtsvoll
stubborn|stur
sensitive|sensibel
reasonable|vernünftig
aware of|sich bewusst über
cope with|zurechtkommen mit
rely on|sich verlassen auf
look forward to|sich freuen auf
put up with|ertragen
make up one's mind|sich entscheiden
`)
];
export const VOCABULARY_COURSES=[
 {id:'basic',title:'Grundwortschatz',description:'Wörter und Wendungen für den Alltag',topics:basic},
 {id:'building',title:'Aufbauwortschatz',description:'Im Alltag mehr ausdrücken',topics:building},
 {id:'everyday',title:'Erweiterter Alltagswortschatz',description:'Meinungen, Zusammenhänge und neue Themen',topics:everyday}
];
