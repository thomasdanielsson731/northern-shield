# Northern Shield — Art Direction Bible

Use this document before generating ANY asset. Every image must be consistent with this guide.

---

## 1. CAMERA ANGLE

**Top-down 3/4 view** (like Clash of Clans / Clash Royale).

- Slightly elevated, looking down at roughly 45–60°
- Characters face right by default (sprites flip horizontally in-engine)
- Consistent across ALL towers, enemies, and props

---

## 2. ART STYLE

Stylized Viking dark fantasy. NOT realistic. NOT pixel art.

- Semi-cartoon proportions (slightly exaggerated heads/weapons)
- High contrast — readable at 14px cell size on screen
- Hand-painted textures with visible brushwork
- Thick clean outlines (2–3px dark edge)
- Clash of Clans readability: silhouette first, detail second
- Strong character posing — each unit has a clear "personality" shape

---

## 3. COLOR PALETTE

### Defenders (Norse towers)
| Role       | Color             | Hex       |
|------------|-------------------|-----------|
| Gold/trim  | Warm amber gold   | `#e8c040` |
| Stone/base | Dark stone        | `#3a2a1e` |
| Bronze     | Weathered bronze  | `#a06820` |
| Fur/leather| Warm dark brown   | `#5c3820` |
| Accent     | Deep amber glow   | `#c07820` |

### Enemies
| Enemy     | Body color         | Glow/accent     | Hex body  |
|-----------|--------------------|-----------------|-----------|
| Graveborn | Deep purple        | Purple spectral | `#6628a8` |
| Wisp      | Ethereal blue      | Electric blue   | `#88bbff` |
| Golem     | Dark stone brown   | Molten amber    | `#5c4030` |
| Banshee   | Cyan ghost         | Electric cyan   | `#00eeff` |

### Environment
| Element    | Color                  | Hex / note |
|------------|------------------------|-----------|
| Background | Very dark Nordic earth | `#06030f` + 48% black overlay |
| Grid empty | Dark stone/earth       | Sprite tile darkened, vignette to 72% at edges |
| Path       | Dark stone road        | Layered: `#1e160c` outer → `#362a1a` mid → `#4a3c26` worn center |
| Wall cell  | Dark stone brown       | `#2a1408` base, `#6e5038` stone body |
| UI panels  | Dark fill + gold rim   | `rgba(42,22,6,0.97)` / `rgba(180,110,30,0.7)` |
| Hoard aura | Warm amber gold glow   | `rgba(255,185,40,0.28)` radial at Trelleborg |

---

## 4. SCALE RULES

| Asset type       | Per-frame size | Sprite sheet format    | Total sheet size |
|------------------|----------------|------------------------|-----------------|
| Tower (standard) | 128 × 128 px   | 4 frames horizontal    | 512 × 128 px    |
| Enemy (standard) | 96 × 96 px     | 4 frames horizontal    | 384 × 96 px     |
| Boss (Golem)     | 192 × 192 px   | 4 frames horizontal    | 768 × 192 px    |
| UI icon          | 64 × 64 px     | single image           | 64 × 64 px      |
| Tower card       | 256 × 384 px   | single image           | 256 × 384 px    |
| Portal/Goal      | 128 × 128 px   | single or 4-frame anim | 512 × 128 px    |
| Grid tile        | 14 × 14 px     | repeating tile         | 14 × 14 px      |
| Background       | 1920 × 1080 px | single image           | 1920 × 1080 px  |

**Frame order (all sprite sheets):** `IDLE | WALK | ATTACK | DEATH`

---

## 5. LIGHTING RULES

- **Direction:** Soft directional light from **top-left**
- **Highlights:** Warm amber/gold on upper-left surfaces
- **Shadows:** Deep purple-black on lower-right, cast downward
- **Glow effects:** Each enemy type has a characteristic ambient glow (see palette)
- **No hard drop shadows** on transparent PNG — shadows implied by form shading only

---

## 6. SILHOUETTE RULES

Every unit must be **instantly readable as a silhouette** at small sizes.

| Unit       | Silhouette key trait                          |
|------------|-----------------------------------------------|
| Berserker  | Wide, heavy, giant axe raised high to right   |
| Valkyrie   | Tall/vertical, long spear pointing up, wings  |
| Archer     | Medium height, bow drawn back, quiver visible |
| Catapult   | Large wooden arm/frame, dwarf figure beside   |
| Blondie    | Feminine, round shield on left, mace raised   |
| Shield Wall| Thick stone block, battlements on top         |
| Graveborn  | Hunched skeleton, jagged weapon, ragged form  |
| Wisp       | Diamond/rhombus floating shape, glowing rings |
| Golem      | Massive round form, chunky, cracks of light   |
| Banshee    | Wispy ghost trail, screaming face, oval body  |

---

## 7. WORLD LORE (for prompt context)

**Northern Shield** — A Norse fortress under siege by dark fantasy creatures.

- **Defenders:** Norse warriors guarding the last stronghold and its **Treasure Hoard** (large gold pile + rune artifacts + treasure chest at center-right of map)
- **Enemies:** Draugr (undead infantry), Myling (flying ghosts), Jötunn (giants), Mara (nightmare spirits that disable towers)
- **Setting:** Norse dark fantasy — stone fortresses, rune magic, firelight, ancient glows
- **Mood:** Dramatic, tense, atmospheric — CoC warmth meets dark Norse mythology
- **Path:** Ancient dark stone road with worn wheel tracks and frost-dusted edges, will-o'-wisps floating above it

---

## MASTER STYLE PREFIX

Copy this into the beginning of **every image generation prompt**:

```
Stylized Norse dark fantasy tower defense game art,
top-down 3/4 camera angle,
clean readable silhouettes with thick dark outlines,
high contrast warm colors with amber highlights,
hand-painted semi-cartoon textures,
dramatic Viking atmosphere,
game-ready sprite art on transparent PNG background,
soft directional lighting from top-left,
warm amber highlights and deep purple shadows,
Clash of Clans-inspired readability,
professional mobile game asset quality,
```

Then add the specific asset description.

---

## ASSET LIST & GENERATION PHASES

### PHASE 1 — Core Gameplay (generate these first)

| # | Asset                  | File                         | Size              |
|---|------------------------|------------------------------|-------------------|
| 1 | Spawn / Time Portal    | `ui/portal_spawn.png`        | 512 × 128 px (4f) |
| 2 | Goal / Gold Vault      | `ui/goal_altar.png`          | 128 × 128 px      |
| 3 | Grid tile (empty cell) | `backgrounds/grid_tile.png`  | 14 × 14 px        |
| 4 | Berserker              | `towers/berserker_sprites.png` | 512 × 128 px (4f) |
| 5 | Valkyrie               | `towers/valkyrie_sprites.png`  | 512 × 128 px (4f) |
| 6 | Catapult               | `towers/catapult_sprites.png`  | 512 × 128 px (4f) |
| 7 | Graveborn              | `enemies/graveborn_sprites.png` | 384 × 96 px (4f) |
| 8 | Wisp                   | `enemies/wisp_sprites.png`   | 384 × 96 px (4f)  |
| 9 | Golem (boss)           | `enemies/golem_sprites.png`  | 768 × 192 px (4f) |
| 10 | Gold coin icon        | `ui/gold_icon.png`           | 64 × 64 px        |

### PHASE 2 — Polish

| # | Asset               | File                             | Size              |
|---|---------------------|----------------------------------|-------------------|
| 11 | Archer             | `towers/archer_sprites.png`      | 512 × 128 px (4f) |
| 12 | Blondie            | `towers/blondie_sprites.png`     | 512 × 128 px (4f) |
| 13 | Banshee            | `enemies/banshee_sprites.png`    | 384 × 96 px (4f)  |
| 14 | Shield Wall (5 variants) | `towers/wall_variants.png` | 640 × 128 px (5f) |
| 15 | Explosion FX       | `fx/explosion.png`               | 384 × 96 px (4f)  |
| 16 | EMP pulse FX       | `fx/emp_pulse.png`               | 384 × 96 px (4f)  |
| 17 | Lives/heart icon   | `ui/heart_icon.png`              | 64 × 64 px        |
| 18 | Gold pile (hoard)  | `ui/gold_pile.png`               | 128 × 128 px      |
| 19 | Game background    | `backgrounds/backdrop.png`       | 1920 × 1080 px    |

### PHASE 3 — UI Cards

| # | Asset              | File                              | Size          |
|---|--------------------|-----------------------------------|---------------|
| 20 | Card: Shield Wall | `ui/cards/card_shield_wall.png`   | 256 × 384 px  |
| 21 | Card: Berserker   | `ui/cards/card_berserker.png`     | 256 × 384 px  |
| 22 | Card: Valkyrie    | `ui/cards/card_valkyrie.png`      | 256 × 384 px  |
| 23 | Card: Archer      | `ui/cards/card_archer.png`        | 256 × 384 px  |
| 24 | Card: Catapult    | `ui/cards/card_catapult.png`      | 256 × 384 px  |
| 25 | Card: Blondie     | `ui/cards/card_blondie.png`       | 256 × 384 px  |

---

## READY-TO-USE PROMPTS

### Berserker
```
[MASTER STYLE PREFIX]
Norse berserker warrior sprite sheet, 4 frames horizontal (IDLE WALK ATTACK DEATH),
wide muscular build, double-bladed battleaxe raised high, fur-trimmed iron armor,
braided red beard, horned iron helmet, amber glowing eyes,
dark brown leather, gold rivets, 512x128px total, transparent background
```

### Valkyrie
```
[MASTER STYLE PREFIX]
Norse valkyrie warrior woman sprite sheet, 4 frames horizontal (IDLE WALK ATTACK DEATH),
tall elegant silhouette, winged helmet, ornate silver-gold plate armor,
long spear with rune-carved golden tip, white-gold flowing cape,
fierce expression, 512x128px total, transparent background
```

### Catapult (Dwarf engineer)
```
[MASTER STYLE PREFIX]
Norse dwarf engineer sprite sheet, 4 frames horizontal (IDLE WALK ATTACK DEATH),
stocky build, massive braided beard, iron helmet, operating a wooden catapult,
hurling glowing rune-carved boulders, sturdy leather overalls, 512x128px, transparent background
```

### Archer
```
[MASTER STYLE PREFIX]
Norse archer sprite sheet, 4 frames horizontal (IDLE WALK ATTACK DEATH),
medium build, leather hooded cloak, longbow drawn back, quiver of rune-fletched arrows,
green-brown earthy tones, focused battle expression, 512x128px, transparent background
```

### Blondie
```
[MASTER STYLE PREFIX]
Norse shieldmaiden sprite sheet, 4 frames horizontal (IDLE WALK ATTACK DEATH),
long golden blonde hair, ornate round silver shield, jeweled mace,
silver-gold armor, throwing gold star-shaped projectiles that sparkle,
512x128px, transparent background
```

### Graveborn
```
[MASTER STYLE PREFIX]
Undead skeleton warrior enemy sprite sheet, 4 frames horizontal (IDLE WALK ATTACK DEATH),
hunched shambling posture, bone-white skeleton, deep purple spectral glow,
tattered dark armor fragments, jagged sword, glowing purple eye sockets,
384x96px total, transparent background
```

### Wisp
```
[MASTER STYLE PREFIX]
Ethereal flying energy orb enemy sprite sheet, 4 frames horizontal (IDLE HOVER CHARGE DISSIPATE),
diamond/rhombus shape, bright blue-white ethereal glow, rotating energy rings,
ghostly light trails, clearly floating above ground, 384x96px total, transparent background
```

### Golem (boss)
```
[MASTER STYLE PREFIX]
Massive lava golem boss enemy sprite sheet, 4 frames horizontal (IDLE WALK ROAR COLLAPSE),
enormous chunky round form, dark cracked stone exterior,
glowing molten amber-orange core visible through cracks, glowing amber eyes,
boss-tier scale (twice height of normal enemies), 768x192px total, transparent background
```

### Banshee
```
[MASTER STYLE PREFIX]
Ghost wraith enemy sprite sheet, 4 frames horizontal (IDLE GLIDE EMP-DISCHARGE VANISH),
wispy ghost trail lower body, oval torso, screaming face with hollow eyes,
cyan electrical aura crackling around body, lightning bolt symbol glowing on chest,
semi-transparent, 384x96px total, transparent background
```

### Time Portal (Spawn gate)
```
[MASTER STYLE PREFIX]
Norse time portal spawn gate, animated sprite sheet 4 frames (IDLE PULSE FLASH RIPPLE),
circular void portal with swirling purple-violet energy, runic carved stone frame,
orbiting rune rings in amber and purple, cosmic dark center, 
standing upright facing viewer, 512x128px total, transparent background
```

### Gold Vault (Goal altar)
```
[MASTER STYLE PREFIX]
Norse gold vault fortress altar, single image,
fortified dark stone base with carved runes, massive gold-banded iron door,
glowing amber runestone above doorway, embedded precious gems,
dramatic warm amber glow emanating outward, 128x128px, transparent background
```

---

## FILE NAMING CONVENTION

```
towers/berserker_sprites.png     ✓
towers/berserker.png             ✗ (unclear if sprite sheet)
enemies/golem_sprites.png        ✓
fx/emp_pulse_4f.png              ✓ (4f = 4 frames)
ui/gold_icon.png                 ✓
```

Rules:
- Lowercase, underscores
- `_sprites` suffix for all sprite sheets
- `_4f`, `_8f` suffix for FX sprite sheets to indicate frame count
- Group by function: `towers/`, `enemies/`, `ui/`, `fx/`, `backgrounds/`
