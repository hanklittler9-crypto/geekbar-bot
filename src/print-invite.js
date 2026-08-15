import { config, validateConfig } from './config.js';

validateConfig();

const guild = `https://discord.com/oauth2/authorize?client_id=${config.clientId}&permissions=0&integration_type=0&scope=bot%20applications.commands`;
const user = `https://discord.com/oauth2/authorize?client_id=${config.clientId}&scope=applications.commands&integration_type=1`;

console.log('Guild install (add the bot to your server):');
console.log(guild);
console.log('');
console.log('User install (use /geekbar in any server or DM):');
console.log(user);
