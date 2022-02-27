import {
    Client, Intents, MessageEmbed, Presence, User,
} from 'discord.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { exit } from 'process';
import { Parser } from './parser';

if (!existsSync(join(__dirname, '..', 'config.json'))) {
    console.log('Thank you for using this bot!');
    console.log('To get started, rename config.json.template to config.json and configure it. After that, start the bot up again, upload a log or image and have fun!');
    exit(0);
}

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
    stats: boolean,
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

const slowedUsers: User[] = [];

const slowDownUser = (user: User) => {
    slowedUsers.push(user);
    setInterval(() => {
        const index = slowedUsers.indexOf(user);
        if (index > -1) slowedUsers.splice(index, 1);
    }, 5 * 1000);
};

client.on('messageCreate', async (msg) => {
    if (slowedUsers.includes(msg.author)) return;
    slowDownUser(msg.author);
    const checks = await parser.parse(msg);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const i = await parser.handleButtons(interaction);
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
        status: 'online',
        activities: [{
            name: 'messages | .stats',
            type: 'WATCHING',
        }],
    });
});
