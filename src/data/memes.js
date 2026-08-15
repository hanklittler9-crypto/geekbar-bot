export const MEME_GIFS = [
  { name: 'kingvamp', file: 'kingvamp.gif', caption: '**KING VAMP**', description: 'Dadaman Carti GIF' },
  { name: 'perkpop', file: 'perkpop.gif', caption: null, description: 'Trippy California GIF' },
  { name: 'kencarson', file: 'kencarson.gif', caption: '**KEN CARSON**', description: 'Ken Carson GIF' },
  { name: 'kendance', file: 'kendance.gif', caption: '**KEN**', description: 'Ken Carson dance GIF' },
  { name: 'opium', file: 'opium.gif', caption: '**OPIUM**', description: 'Opium GIF' },
  { name: 'lone', file: 'lone.gif', caption: '**LONE**', description: 'Destroy Lonely GIF' },
  { name: 'homixide', file: 'homixide.gif', caption: '**HOMIXIDE**', description: 'Homixide Gang GIF' },
  { name: 'slatt', file: 'slatt.gif', caption: '**SLATT**', description: 'Carti slatt GIF' },
  { name: 'wlr', file: 'wlr.gif', caption: '**WHOLE LOTTA RED**', description: 'Whole Lotta Red GIF' },
  { name: 'teenx', file: 'teenx.gif', caption: '**TEEN X**', description: 'Teen X Carti GIF' },
  { name: 'yvl', file: 'yvl.gif', caption: '**YVL**', description: 'Destroy Lonely YVL GIF' },
  { name: 'carti', file: 'carti.gif', caption: '**CARTI**', description: 'Playboi Carti GIF' },
  { name: 'yeat', url: 'https://media.tenor.com/2-mWgRHr3ycAAAAM/yeat.gif', caption: '**TWIZZY**', description: 'Yeat GIF' },
  { name: 'twizzy', url: 'https://media.tenor.com/UHajEwapI1cAAAAM/yeat-twizzy-rich.gif', caption: '**TWIZZY RICH**', description: 'Yeat twizzy GIF' },
  { name: 'summrs', url: 'https://media.tenor.com/PQKEHZGvQSsAAAAM/summrs-dancing-lil-rino.gif', caption: '**SUMMRS**', description: 'Summrs GIF' },
  { name: 'kankan', url: 'https://media.tenor.com/zShf9RDNFsEAAAAM/kankan.gif', caption: '**KANKAN**', description: 'Kankan GIF' },
  { name: 'izaya', url: 'https://media.tenor.com/ot4JRyp3UrUAAAAM/izaya-tiji-izaya-tiji-lightskin-side.gif', caption: '**IZAYA TIJI**', description: 'Izaya Tiji GIF' },
  { name: 'vamp', url: 'https://media.tenor.com/A0UGRivk_EQAAAAM/whole-lotta-red-vamp.gif', caption: '**VAMP**', description: 'Vamp Carti GIF' },
  { name: 'music', url: 'https://media.tenor.com/XUvPUeTmdvEAAAAM/playboi-carti.gif', caption: '**I AM MUSIC**', description: 'I Am Music Carti GIF' },
  { name: 'slowdown', url: 'https://media.tenor.com/JEbHI83Uyx4AAAAM/slow-down-for-me-carti.gif', caption: '**SLOW DOWN**', description: 'Slow Down For Me Carti GIF' },
  { name: 'blonde', url: 'https://media.tenor.com/0ZbF4LjFG4gAAAAM/blonde-carti-cati.gif', caption: '**BLONDE CARTI**', description: 'Blonde Carti GIF' },
  { name: 'walk', url: 'https://media.tenor.com/U1C2u1E_QacAAAAM/destroy-lonely-walking.gif', caption: '**WALK**', description: 'Destroy Lonely walking GIF' },
  { name: 'catken', url: 'https://media.tenor.com/KUhukey2i2cAAAAM/ken-carson-cat.gif', caption: '**MEOW**', description: 'Ken Carson cat GIF' },
  { name: 'meechie', url: 'https://media.tenor.com/BEDQTDgUwXwAAAAM/meechie-homixide-gang.gif', caption: '**MEECHIE**', description: 'Homixide Meechie GIF' },
];

export function getMeme(name) {
  return MEME_GIFS.find((m) => m.name === name);
}
