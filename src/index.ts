import { Client, Intents, MessageEmbed } from 'discord.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Parser } from './parser';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

export type Check = {
    method: 'includes'|'matches'|'equals',
    value:string,
    fix: string[]
}

export type Note = {
    value:string,
}

export type Embed = {
    color?: string,
    author?: {
        icon?: string,
        text?: string
    },
    title?: string,
    description?: string,
    footer?: {
        icon?: string,
        text?: string,
    }
}

export type ConfigType = {
    token:string,
    image_scanning: boolean,
    extensions: string[],
    embed: Embed,
    notes: {
        [name: string]: Note
    }
    whitelist: string[],
    checks: {
        [name: string]: Check
    }
}
const config: ConfigType = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

client.login(config.token);
const parser = new Parser();

client.on('messageCreate', async (msg) => {
    const checks = await parser.parse(msg);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const i = await parser.handleButtons(interaction);
});

client.on('ready', () => console.log(`Logged in as ${client.user.tag}`));
