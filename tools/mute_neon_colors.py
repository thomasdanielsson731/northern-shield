"""One-off: replace neon combat/UI colors with muted parchment palette."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src"
FILES = [
    "grid/grid.js",
    "core/game.js",
    "entities/tower.js",
    "entities/enemy.js",
    "preparation/fortressPrepArt.js",
    "campaign/firstSagaUI.js",
    "settlement/settlementHub.js",
]

SUBS = [
    ("#a030ff", "rgba(52,44,38,0.72)"),
    ("#d090ff", "#6a5a48"),
    ("#8860cc", "#4a4038"),
    ("#b0a0e8", "#5a5048"),
    ("#60d8f8", "#8a7a58"),
    ("#f06080", "#9a6048"),
    ("#80f040", "#6a7848"),
    ("#fff8c0", "#c9b070"),
    ("#ffd860", "#c9a227"),
    ("#40e880", "#6a8a58"),
    ("#a0e8ff", "#8a9a90"),
    ("#80eeff", "#7a8a82"),
    ("#88aaee", "rgba(180,150,110,0.85)"),
    ("#60c8f0", "rgba(140,150,130,0.85)"),
    ("#ff9040", "#c87840"),
    ("rgba(190,110,255", "rgba(105,92,78"),
    ("rgba(230,160,255", "rgba(125,110,92"),
    ("rgba(100,190,255", "rgba(88,82,72"),
    ("rgba(245,215,255", "rgba(155,140,118"),
    ("rgba(160,80,255", "rgba(92,78,68"),
    ("rgba(70,25,150", "rgba(42,36,30"),
    ("rgba(245,225,255", "rgba(148,132,108"),
    ("rgba(80,20,180", "rgba(48,40,34"),
    ("rgba(120,50,200", "rgba(78,68,58"),
    ("rgba(180,100,255", "rgba(102,88,74"),
    ("rgba(210,150,255", "rgba(118,102,86"),
    ("rgba(200,120,255", "rgba(98,86,72"),
    ("rgba(100,160,255", "rgba(82,78,68"),
    ("rgba(200,140,255", "rgba(108,96,82"),
    ("rgba(255,205,50", "rgba(200,170,90"),
    ("rgba(255,50,30", "rgba(169,50,38"),
    ("rgba(255,80,30", "rgba(140,60,40"),
    ("rgba(50,220,170", "rgba(100,130,110"),
    ("rgba(70,240,190", "rgba(110,140,120"),
    ("rgba(255,230,100", "rgba(200,170,100"),
    ("rgba(255,230,80", "rgba(200,165,90"),
    ("rgba(255,220,60", "rgba(190,155,85"),
    ("rgba(255,210,40", "rgba(185,150,80"),
    ("rgba(255,140,80", "rgba(180,110,70"),
    ("rgba(100,165,255", "rgba(120,110,95"),
    ("rgba(255,70,0", "rgba(140,60,30"),
    ("#ff7010", "#a05028"),
    ("#ff4020", "#a93226"),
]

for rel in FILES:
    p = ROOT / rel
    if not p.exists():
        continue
    t = p.read_text(encoding="utf-8")
    orig = t
    for a, b in SUBS:
        t = t.replace(a, b)
    if t != orig:
        p.write_text(t, encoding="utf-8")
        print(f"updated {rel}")
