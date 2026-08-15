import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';

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
];

export function getMeme(name) {
  return MEME_GIFS.find((m) => m.name === name);
}
