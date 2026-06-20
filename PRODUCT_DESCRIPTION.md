# Northern Shield

## Genre

Strategiskt grid-baserat Tower Defense med fokus på:

- maze building
- vägkontroll
- taktiska försvarslinjer
- emergent gameplay

Inspirerat av klassiska maze TD-spel med Clash of Clans-estetik och nordisk/fantasy-tema.

## Kärnidé

Spelaren försvarar ett territorium mot vågor av fantasy-fiender — skelettkrigar, andar, lavagolem och banshees — genom att:

- bygga murar (Sköldborg)
- forma fiendens väg
- skapa kill-zones
- placera försvarstorn strategiskt
- uppgradera försvar över tid

Det unika är att spelaren aktivt styr fiendernas väg genom att bygga murar på ett stort grid.

## Core Gameplay Loop

Build defenses
↓
Shape enemy path
↓
Survive wave
↓
Earn resources
↓
Upgrade and expand
↓
Adapt to stronger enemies
↓
Repeat

## Spelplan

- Grid-baserad karta
- 50×30 rutnät
- Varje ruta kan innehålla:
  - tom mark
  - mur (Sköldborg)
  - tower
  - spawn (tidsportal)
  - målpunkt (guldvalv)

Murarna används för att:

- skapa långa omvägar
- kontrollera fiendens rörelse
- bygga flaskhalsar

## Fiendetyper

### Graveborn (infanteri)

- medelhög hastighet
- låg HP
- stora grupper

Hot:

- överväldigande antal

### Wisp (flygande)

- snabb
- ignorerar murar
- medelstark

Hot:

- bypassar försvarslinjer

### Golem (boss)

- extremt långsam
- enorm HP
- stor radie

Hot:

- bryter igenom försvar

### Banshee (EMP)

- stör towers temporärt
- låg skada
- hög taktisk påverkan

Hot:

- destabiliserar försvar

## Towers

### Sköldborg (mur)

- billig
- ingen attack
- blockerar väg
- saktar ner angränsande fiender 20%

Kärnan i spelets strategi.

### Bärsärkare

- extremt kort räckvidd
- hög skada
- melee axe swing

Bra mot:

- täta grupper i kill-zones

### Valkyria

- mycket lång räckvidd
- hög precision
- skjuter spjut

Bra mot:

- tanks / Golem
- prioriterade mål

### Bågskytt

- snabb attack
- medellång räckvidd
- skjuter pilar

Bra mot:

- svärm-fiender / Graveborn

### Katapult

- splash damage
- lång räckvidd
- skjuter stenar

Bra mot:

- grupper
- klustrade fiender

### Blondie

- stun-effekt (fullständigt stopp)
- medellång räckvidd
- skjuter guldstjärnor

Bra för:

- kontroll och synergy med övriga torn

## Viktig Gameplay-princip

Fiender måste alltid kunna nå målet.

När spelaren bygger:

- pathfinding räknas om
- om ingen väg finns: placering nekas

Detta skapar:

- strategiskt maze-building
- utan exploiter

## Gameplay-fokus

Spelet fokuserar på:

- strategi före reflexer

Spelaren ska vinna genom:

- planering
- vägkontroll
- ekonomi
- smart placering

Inte genom snabb klickhastighet.

## Designmål

### Easy to learn

- tydlig CoC-inspirerad visuell design
- tydliga towers med karaktär
- tydliga fiender med unika silhuetter
- läsbar gameplay

### Hard to master

- effektiv maze-design
- tower synergy
- resursprioritering
- adaptiv strategi

## Visuell stil

Clash of Clans-inspirerad fantasy-estetik med nordiskt/vikinga-tema:

- Mörk nordisk mark (sprite-textur + 48% darken, kraftig vignette vid kanterna)
- Ornamenterad vikingaram i sprite-form runt hela spelet (18px tjock, synlig på alla 4 sidor)
- Detaljerade sprite-karaktärer — berserkar, valkyrior, bågskytt, katapult, Blondie
- Stenstig (mörka lager: skugga → stengrund → sliten hjulspår → snödamm i kanten) med will-o'-wisps
- Skattkammare vid Trelleborg: varm guldaura, stor mynthög, runsten, kista, orbiterade gnistor
- Guldmynt flyger i parabolbåge från stupade fiender till skattkammaren
- Nordiska fiendetyper: Draugr, Myling, Jötunn, Mara — med sprite-assets
- Rund tidsportal i lila/void som spawn-punkt
- Auto Next: nytt snabbvägsflöde för spelare som vill förenkla mellanvågsskiften.
- Tornekonomi har finjusterats för tydligare tidiga val och bättre pacing.
- Trelleborg-fästning som mål med skadat rödglöd vid låg hälsa

Tornsprites skalade 35–50% större med färgbaserad glödeffekt per klass:
- Bärsärkare (rött), Valkyrie (blått), Bågskytt (stålblått), Katapult (orange), Blondie (rosa)

## Teknisk vision

Fokus på:

- hög läsbarhet
- stabil performance
- enkel arkitektur
- snabb iteration

Byggt med:

- JavaScript
- HTML5 Canvas
- ES Modules
- ingen extern spelmotor

## Produktmål

### MVP (klart, 2026-05-15)

- grid-system (36×22, CELL_SIZE=14)
- wall placement + BFS pathfinding (re-routing aktiva fiender)
- 5 tower-typer med sprite-grafik + glow (Berserker, Valkyrie, Archer, Catapult, Blondie)
- 4 fiende-typer med Norse sprite-grafik (Draugr, Myling, Jötunn, Mara)
- Stenstigsväg med embedded glow + will-o'-wisps
- Skattkammare vid Trelleborg (aura, mynthög, runsten, kista, gnistor)
- Guldmyntsystem (flyger till skattkammaren när fiender dör)
- Vikingaornamentram (sprite-baserad, synlig alla 4 sidor)
- Mörk nordisk terräng (sprite-textur, frost, vignette)
- Spelhastighet: 30 tick/sek normalt, ×2-knapp för snabbt läge
- vågsystem med 100 vågor
- ekonomi (guld, uppgraderingar, sälj), game over + topplista (localStorage)

### Långsiktig potential

Möjliga framtida features:

- fler torn: Helande Hydda, Isjätte, Drakship, Piltorn
- Sköldmur-segment som kopplar ihop till hela väggar
- fler fiendefaktioner: Kinesiska Robotar, Ryska Drönare, Ryska Bossar
- vänster kategorisidebar (TORN / TRUPPER / FÖRSVAR / DEKORATIONER / KARTA)
- kampanjläge / endless mode
- gånganimeringar för fiender (spritesheets)

Men:

- endast efter att core gameplay är roligt.

## Projektfilosofi

Projektet optimeras för:

- solo development
- hög iterationstakt
- spelbarhet tidigt
- enkel underhållbar kod
- låg teknisk komplexitet

Målet är ett strategiskt, beroendeframkallande och lättläst tower defense-spel med starkt fokus på maze-building, taktiska beslut och en varm fantasy-estetik inspirerad av Clash of Clans.
