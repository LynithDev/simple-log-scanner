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

export type Embed = {
    color?: string,
    title?: string,
    description?: string,
    footer?: {
        icon?: string,
        text?: string,
    }
}

export type ConfigType = {
    token:string,
    extensions: string[],
    embed: Embed,
    checks: {
        [name: string]: Check
    }
}
const config: ConfigType = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

client.login(config.token);
client.on('messageCreate', async (msg) => {
    const parser = new Parser(msg);
    const checks = await parser.parse();
});

client.on('ready', () => console.log(`Logged in as ${client.user.tag}`));