# Northern Shield

## Genre

Strategiskt grid-baserat Tower Defense med fokus på:

- maze building
- vägkontroll
- taktiska försvarslinjer
- emergent gameplay

Inspirerat av klassiska maze TD-spel men med modern, minimalistisk militär estetik.

## Kärnidé

Spelaren försvarar ett territorium mot vågor av autonoma robotstyrkor, drönare och tunga mekaniserade bossar genom att:

- bygga murar
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
- 50x50 rutnät
- Varje ruta kan innehålla:
  - tom mark
  - mur
  - tower
  - spawn
  - målpunkt

Murarna används för att:

- skapa långa omvägar
- kontrollera fiendens rörelse
- bygga flaskhalsar

## Fiendetyper

### Robot Infantry

- snabb
- låg HP
- stora grupper

Hot:

- överväldigande antal

### Attack Drones

- flygande
- ignorerar murar
- medelstark

Hot:

- bypassar försvarslinjer

### Heavy Tanks

- långsamma
- enorm HP
- boss-enemies

Hot:

- bryter igenom försvar

### EMP Units

- stör towers temporärt
- låg skada
- hög taktisk påverkan

Hot:

- destabiliserar försvar

## Towers

### Wall

- billig
- ingen attack
- blockerar väg

Kärnan i spelets strategi.

### Machine Gun Tower

- snabb attack
- kort range

Bra mot:

- swarm-fiender

### Sniper Tower

- lång range
- hög precision
- långsam attack

Bra mot:

- tanks
- elites

### Missile Tower

- splash damage
- långsammare

Bra mot:

- grupper

### EMP Tower

- slow
- stun
- support tower

Bra för:

- kontroll

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

- enkel visuell design
- tydliga towers
- tydliga fiender
- läsbar gameplay

### Hard to master

- effektiv maze-design
- tower synergy
- resursprioritering
- adaptiv strategi

## Visuell stil

Minimalistisk militär sci-fi:

- mörka bakgrunder
- neon/radar-estetik
- tydliga färgkontraster

Exempel:

- röda fiender
- blå towers
- gula projektiler
- grå murar

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

### MVP

Första spelbara versionen ska innehålla:

- grid-system
- wall placement
- pathfinding
- towers
- waves
- economy
- upgrades
- game over state

### Långsiktig potential

Möjliga framtida features:

- fler enemy-faktioner
- specialbossar
- campaign mode
- endless mode
- co-op
- procedural maps
- weather systems
- advanced upgrades

Men:

- endast efter att core gameplay är roligt.

## Projektfilosofi

Projektet optimeras för:

- solo development
- hög iterationstakt
- spelbarhet tidigt
- enkel underhållbar kod
- låg teknisk komplexitet

Målet är ett strategiskt, beroendeframkallande och lättläst tower defense-spel med starkt fokus på maze-building och taktiska beslut.