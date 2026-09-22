import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { GIF_EFFECTS } from '../data/gameData.js';
import { MEME_GIFS } from '../data/memes.js';

const contexts = [
  InteractionContextType.Guild,
  InteractionContextType.BotDM,
  InteractionContextType.PrivateChannel,
];

export const geekbarCommand = new SlashCommandBuilder()
  .setName('geekbar')
  .setDescription('Hit, customize, raid, and render your Geek Bar')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(...contexts)
  .addSubcommand((sub) => sub.setName('hit').setDescription('Take a hit from your Geek Bar'))
  .addSubcommand((sub) => sub.setName('charge').setDescription('Plug in and recharge your Geek Bar'))
  .addSubcommand((sub) =>
    sub.setName('customize').setDescription('Open a modal to rename your Geek Bar and set a tagline'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('flavor')
      .setDescription('Swap out your flavor pod')
      .addStringOption((opt) =>
        opt.setName('pod').setDescription('Flavor to swap to').setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('stats')
      .setDescription("View your Geek Bar or someone else's")
      .addUserOption((opt) => opt.setName('user').setDescription('User to view')),
  )
  .addSubcommand((sub) => sub.setName('daily').setDescription('Claim daily clouds, puffs, and a battery bump'))
  .addSubcommand((sub) =>
    sub
      .setName('shop')
      .setDescription('Browse and buy items, flavors, or wraps')
      .addStringOption((opt) => opt.setName('buy').setDescription('Item to purchase').setAutocomplete(true)),
  )
  .addSubcommand((sub) => sub.setName('inventory').setDescription('See flavors, wraps, and kits you own'))
  .addSubcommand((sub) =>
    sub
      .setName('stash')
      .setDescription('Hide clouds from raids, or pull them back out')
      .addIntegerOption((opt) =>
        opt.setName('amount').setDescription('Positive to stash, negative to withdraw').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('leaderboard')
      .setDescription('Top operators on this server')
      .addStringOption((opt) =>
        opt
          .setName('category')
          .setDescription('Board to show')
          .addChoices(
            { name: 'Total Hits', value: 'total_hits' },
            { name: 'XP / Level', value: 'xp' },
            { name: 'Clouds', value: 'clouds' },
            { name: 'Stash', value: 'stash' },
          ),
      ),
  )
  .addSubcommand((sub) => sub.setName('profile').setDescription('Generate a full Geek Bar profile card'))
  .addSubcommand((sub) => sub.setName('flex').setDescription('Show off your current setup as a GIF'))
  .addSubcommand((sub) => sub.setName('repair').setDescription('Fix a burnt coil'))
  .addSubcommand((sub) => sub.setName('prestige').setDescription('Reset progress for a prestige wrap and XP bonus'))
  .addSubcommand((sub) =>
    sub
      .setName('gift')
      .setDescription('Send clouds to another operator')
      .addUserOption((opt) => opt.setName('user').setDescription('Who gets the clouds').setRequired(true))
      .addIntegerOption((opt) =>
        opt.setName('amount').setDescription('Clouds to send').setRequired(true).setMinValue(1),
      ),
  )
  .addSubcommand((sub) => sub.setName('help').setDescription('All Geek Bar commands'))
  .addSubcommandGroup((group) =>
    group
      .setName('heist')
      .setDescription('Steal, chase, and fight for clouds')
      .addSubcommand((sub) =>
        sub
          .setName('raid')
          .setDescription("Heist another operator's unstashed clouds")
          .addUserOption((opt) => opt.setName('target').setDescription('Who to raid').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('jack')
          .setDescription('Riskier steal — jack their setup. Can burn your coil if you get caught')
          .addUserOption((opt) => opt.setName('target').setDescription('Who to jack').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub.setName('chase').setDescription('Timing minigame — catch the cloud for bonus clouds'),
      )
      .addSubcommand((sub) =>
        sub
          .setName('smokeout')
          .setDescription('Challenge someone to a cloud battle')
          .addUserOption((opt) => opt.setName('target').setDescription('Who to smoke out').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('bounty')
          .setDescription('Open a modal to put a bounty on someone')
          .addUserOption((opt) => opt.setName('target').setDescription('Mark this operator').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub.setName('roulette').setDescription('Gamble clouds for a random flavor unlock'),
      )
      .addSubcommand((sub) => sub.setName('board').setDescription('See active bounties'))
      .addSubcommand((sub) =>
        sub.setName('spot').setDescription('Raid a corner store, smoke shop, or warehouse'),
      )
      .addSubcommand((sub) =>
        sub.setName('wire').setDescription('Cut the right wires in order — high payout minigame'),
      )
      .addSubcommand((sub) =>
        sub.setName('vanish').setDescription('Smoke bomb: spend clouds for a 2 hour raid shield'),
      ),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('studio')
      .setDescription('Make GIFs, stills, wraps, and custom flavors')
      .addSubcommand((sub) =>
        sub.setName('vibe').setDescription('Open a modal — the bot builds a custom GIF from your prompt'),
      )
      .addSubcommand((sub) =>
        sub.setName('render').setDescription('Open a modal — generate a still poster of your Geek Bar'),
      )
      .addSubcommand((sub) =>
        sub.setName('lab').setDescription('Open a modal — mix a custom flavor pod'),
      )
      .addSubcommand((sub) =>
        sub
          .setName('gif')
          .setDescription('Turn an uploaded image into an animated GIF')
          .addAttachmentOption((opt) =>
            opt.setName('image').setDescription('PNG/JPG/WEBP to animate').setRequired(true),
          )
          .addStringOption((opt) =>
            opt.setName('effect').setDescription('Animation effect').setRequired(true).setAutocomplete(true),
          )
          .addStringOption((opt) =>
            opt.setName('text').setDescription('Caption on the GIF').setMaxLength(48),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('wrap')
          .setDescription('Upload an image as a custom Geek Bar wrap')
          .addAttachmentOption((opt) =>
            opt.setName('image').setDescription('Wrap image').setRequired(true),
          )
          .addStringOption((opt) => opt.setName('name').setDescription('Name for the wrap').setMaxLength(32)),
      )
      .addSubcommand((sub) =>
        sub.setName('card').setDescription('Render a fresh stats card PNG'),
      )
      .addSubcommand((sub) =>
        sub
          .setName('equip')
          .setDescription('Equip a built-in or custom wrap')
          .addStringOption((opt) =>
            opt.setName('skin').setDescription('Wrap to equip').setRequired(true).setAutocomplete(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('skins')
          .setDescription('List built-in and custom wraps'),
      )
      .addSubcommand((sub) =>
        sub.setName('neon').setDescription('Open a modal — flickering neon sign GIF of your text'),
      )
      .addSubcommand((sub) =>
        sub.setName('sticker').setDescription('Open a modal — render a sticker PNG of your Geek Bar'),
      ),
  );

export const cloudCommand = new SlashCommandBuilder()
  .setName('cloud')
  .setDescription('Slots, packs, chain hits, lucky rolls, and other cloud minigames')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(...contexts)
  .addSubcommand((sub) =>
    sub
      .setName('slots')
      .setDescription('Spin flavor slots for clouds')
      .addIntegerOption((opt) =>
        opt.setName('bet').setDescription('Clouds to bet (default 25)').setMinValue(10).setMaxValue(250),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('flip')
      .setDescription('Coin flip clouds')
      .addStringOption((opt) =>
        opt
          .setName('side')
          .setDescription('Heads or tails')
          .setRequired(true)
          .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' }),
      )
      .addIntegerOption((opt) =>
        opt.setName('bet').setDescription('Clouds to bet (default 20)').setMinValue(5).setMaxValue(200),
      ),
  )
  .addSubcommand((sub) => sub.setName('pack').setDescription('Rip a mystery pack — pods, wraps, or clouds'))
  .addSubcommand((sub) => sub.setName('chain').setDescription('Triple-hit combo GIF. Bigger payout, can burn the coil'))
  .addSubcommand((sub) => sub.setName('lucky').setDescription('One lucky puff — rare jackpot chance'))
  .addSubcommand((sub) => sub.setName('drop').setDescription('Street drop — pick the live crate'))
  .addSubcommand((sub) => sub.setName('drip').setDescription('Collect idle clouds your Geek Bar leaked'))
  .addSubcommand((sub) =>
    sub
      .setName('inspect')
      .setDescription('Inspect a setup and get a cloud rating card')
      .addUserOption((opt) => opt.setName('user').setDescription('Who to inspect')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('crash')
      .setDescription('All-in crash — multiply your bet or go to zero')
      .addIntegerOption((opt) =>
        opt.setName('bet').setDescription('Clouds to bet (default 40)').setMinValue(10).setMaxValue(400),
      ),
  )
  .addSubcommand((sub) => sub.setName('quote').setDescription('Random opium / cloud quote'))
  .addSubcommand((sub) =>
    sub
      .setName('roast')
      .setDescription("Roast someone's Geek Bar")
      .addUserOption((opt) => opt.setName('user').setDescription('Who to roast')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('highlow')
      .setDescription('Guess if the next roll is higher or lower')
      .addStringOption((opt) =>
        opt
          .setName('call')
          .setDescription('Higher or lower')
          .setRequired(true)
          .addChoices({ name: 'Higher', value: 'high' }, { name: 'Lower', value: 'low' }),
      )
      .addIntegerOption((opt) =>
        opt.setName('bet').setDescription('Clouds to bet (default 20)').setMinValue(5).setMaxValue(200),
      ),
  );

export const funCommand = new SlashCommandBuilder()
  .setName('fun')
  .setDescription('Aura, rizz, 8ball, rate, ship')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(...contexts)
  .addSubcommand((sub) =>
    sub
      .setName('8ball')
      .setDescription('Ask the 8-ball')
      .addStringOption((opt) => opt.setName('question').setDescription('Your question').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('aura')
      .setDescription('Check aura')
      .addUserOption((opt) => opt.setName('user').setDescription('Who to scan')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('rizz')
      .setDescription('Check rizz')
      .addUserOption((opt) => opt.setName('user').setDescription('Who to scan')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('rate')
      .setDescription('Rate anything 0-100')
      .addStringOption((opt) => opt.setName('thing').setDescription('What to rate').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('ship')
      .setDescription('Ship two people')
      .addUserOption((opt) => opt.setName('user1').setDescription('First').setRequired(true))
      .addUserOption((opt) => opt.setName('user2').setDescription('Second').setRequired(true)),
  );

export const ipLookupCommand = new SlashCommandBuilder()
  .setName('iplookup')
  .setDescription('Look up a public IP or domain (geo/ISP). Not Discord user IPs.')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(...contexts)
  .addStringOption((opt) =>
    opt.setName('target').setDescription('Public IP or domain, e.g. 8.8.8.8 or discord.com').setRequired(true),
  );

export const ipCommand = new SlashCommandBuilder()
  .setName('ip')
  .setDescription('Public IP tools — geo, DNS, map. Not Discord user IPs.')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(...contexts)
  .addSubcommand((sub) =>
    sub
      .setName('lookup')
      .setDescription('Look up a public IP or domain')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('Public IP or domain to look up').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('dns')
      .setDescription('Resolve a public domain to A / AAAA records')
      .addStringOption((opt) =>
        opt.setName('host').setDescription('Domain, e.g. discord.com').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('reverse')
      .setDescription('Reverse DNS (PTR) for a public IP')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('Public IP, e.g. 1.1.1.1').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('map')
      .setDescription('OpenStreetMap link for a public IP or domain')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('Public IP or domain').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('compare')
      .setDescription('Compare two public IPs or domains')
      .addStringOption((opt) => opt.setName('a').setDescription('First public IP or domain').setRequired(true))
      .addStringOption((opt) => opt.setName('b').setDescription('Second public IP or domain').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('check')
      .setDescription('Classify an address: public, private, reserved, docs')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('IP or domain to classify').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('time')
      .setDescription('Local time at a public IP or domain')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('Public IP or domain').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('weather')
      .setDescription('Weather near a public IP or domain (city geo)')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('Public IP or domain').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('joke')
      .setDescription('Fake TEST-NET trace (not real)')
      .addUserOption((opt) => opt.setName('user').setDescription('Who to fake-trace')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('whois')
      .setDescription('Public RDAP / WHOIS for a public IP or domain')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('Public IP or domain').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('convert')
      .setDescription('Convert an IPv4 to decimal, hex, and binary')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('IPv4 address').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('cidr')
      .setDescription('Network math for an IPv4 or CIDR — no host scan')
      .addStringOption((opt) =>
        opt.setName('range').setDescription('e.g. 8.8.8.0/24 or 1.1.1.1').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('isp')
      .setDescription('ISP, org, AS, proxy/hosting for a public IP')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('Public IP or domain').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('sun')
      .setDescription('Sunrise and sunset near a public IP')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('Public IP or domain').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('air')
      .setDescription('Air quality near a public IP')
      .addStringOption((opt) =>
        opt.setName('ip').setDescription('Public IP or domain').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName('mine').setDescription('Why this bot cannot see your Discord IP'),
  );

export const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Bot latency')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(...contexts);

export const fakeIpCommand = new SlashCommandBuilder()
  .setName('fakeip')
  .setDescription('Joke fake IP trace (not real)')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(...contexts)
  .addUserOption((opt) => opt.setName('user').setDescription('Who to fake-trace'));

export const memeCommands = MEME_GIFS.map((meme) =>
  new SlashCommandBuilder()
    .setName(meme.name)
    .setDescription(meme.description)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(...contexts),
);

export const commands = [geekbarCommand, cloudCommand, funCommand, ipCommand, ipLookupCommand, pingCommand, fakeIpCommand, ...memeCommands];

export const GIF_EFFECT_CHOICES = GIF_EFFECTS.map((e) => ({ name: `${e.emoji} ${e.name}`, value: e.id }));
