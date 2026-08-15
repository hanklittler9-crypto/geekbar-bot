import { AttachmentBuilder } from 'discord.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gifs = join(__dirname, '../../assets/gifs');

function gifFile(name) {
  return new AttachmentBuilder(join(gifs, name), { name });
}

export async function handleKingvamp(interaction) {
  return interaction.reply({
    content: '**KING VAMP**',
    files: [gifFile('kingvamp.gif')],
  });
}

export async function handlePerkpop(interaction) {
  return interaction.reply({
    files: [gifFile('perkpop.gif')],
  });
}
