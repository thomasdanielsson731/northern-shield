const NAMES = {
  berserk:  ['Ulfr',      'Björn',     'Ragnar',    'Halfdan',   'Gunnar',    'Ivar',      'Sigurd',    'Orm'       ],
  valkyrie: ['Sigrid',    'Brynhildr', 'Göndul',    'Rota',      'Skögul',    'Hildr',     'Svava',     'Þrúðr'     ],
  military: ['Leif',      'Egil',      'Thorvald',  'Brandr',    'Ketill',    'Eiríkr',    'Hákon',     'Steinþórr' ],
  catapult: ['Grimr',     'Hávarðr',   'Steinolfr', 'Bergr',     'Kolr',      'Einarr',    'Þormóðr',   'Úlfhéðinn' ],
  blondie:  ['Þóra',      'Heiðrún',   'Arnfríðr',  'Álfdís',    'Oddný',     'Þórdís',    'Gunnhildr', 'Ragnheiðr' ],
  piltorn:  ['Sæmundr',   'Ásbjörn',   'Þorkell',   'Vermundr',  'Þórðr',     'Kolbeinn',  'Magnús',    'Ragnulfr'  ],
  hydda:    ['Auðr',      'Þyri',      'Yrsa',      'Ljót',      'Oddný',     'Frigg',     'Völva',     'Hlín'      ],
  isjatten: ['Hrímr',     'Ísulfr',    'Snjólfr',   'Jökulr',    'Kaldr',     'Ísbjörn',   'Bergfinnr', 'Frostmundr'],
  drakship: ['Knútr',     'Haraldr',   'Óláfr',     'Sveinn',    'Þorsteinn', 'Ragnvald',  'Hrólf',     'Bjǫrn'     ],
};

export function getDefenderName(type) {
  const pool = NAMES[type] ?? NAMES.berserk;
  return pool[Math.floor(Math.random() * pool.length)];
}
