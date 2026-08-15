import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getMeme } from '../data/memes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gifs = join(__dirname, '../../assets/gifs');

export async function handleMeme(interaction) {
  const meme = getMeme(interaction.commandName);
  if (!meme) {
    return interaction.reply({ content: 'Unknown meme command.', ephemeral: true });
  }

  if (meme.url) {
    const embed = new EmbedBuilder().setColor('#000000').setImage(meme.url);
    const payload = { embeds: [embed] };
    if (meme.caption) payload.content = meme.caption;
    return interaction.reply(payload);
  }

  const payload = {
    files: [new AttachmentBuilder(join(gifs, meme.file), { name: meme.file })],
  };
  if (meme.caption) payload.content = meme.caption;
  return interaction.reply(payload);
}
