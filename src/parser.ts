import axios from 'axios';
import { Message, MessageAttachment, MessageEmbed } from 'discord.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Check, ConfigType, Embed } from '.';

export class Parser {
    constructor(public message: Message) {}

    public async parse(): Promise<[string, Check][]> {
        const validChecks: [string, Check][] = [];
        const config: ConfigType = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

        const attachments: MessageAttachment[] = [];
        const matchValues: RegExpMatchArray[] = [];

        config.extensions.forEach((ext) => this.message.attachments.filter((attachment) => attachment.name.endsWith(ext)).forEach((attachment) => attachments.push(attachment)));

        for (let i = 0; i < attachments.length; i++) {
            const value = this.message.attachments.at(i);

            if (value.size / 1000 > 4096) return;
            const content: string = (await axios.get(value.url)).data;

            Object.entries(config.checks).map((value) => {
                const check = value[1];

                switch (check.method) {
                    case 'includes':
                        if (content.includes(check.value)) validChecks.push([value[0], check]);
                        break;
                    case 'equals':
                        if (content == check.value) validChecks.push([value[0], check]);
                        break;
                    case 'matches':
                        if (
                            content.match(RegExp(check.value.split('/')[1], check.value.split('/')[check.value.split('/').length - 1])) != null
                            && content.match(RegExp(check.value.split('/')[1], check.value.split('/')[check.value.split('/').length - 1])).length != 0
                        ) {
                            validChecks.push([value[0], check]);
                            matchValues.push(content.match(RegExp(check.value.split('/')[1], check.value.split('/')[check.value.split('/').length - 1])));
                        }
                        break;
                    default: break;
                }
            });
        }

        if (validChecks.length == 0 || validChecks == null) return;

        const embedPropertiesTemp: Embed = {
            title: 'Log scanner',
            description: '**Note:** This is an automated support bot and could not always be accurate!',
            color: '#f05050',
            footer: {
                icon: 'https://cdn.discordapp.com/avatars/507646181816401961/f19611b032be5eb402e1c1010e8f19b5.webp',
                text: 'Log scanner by Lynith',
            },
        };

        const embedProperties = { ...embedPropertiesTemp, ...config.embed };

        const embed = new MessageEmbed({
            title: embedProperties.title,
            description: embedProperties.description,
            color: `#${embedProperties.color.replaceAll('#', '')}`,
            footer: {
                text: embedProperties.footer.text,
                icon_url: embedProperties.footer.icon,
            },
        });

        for (let index = 0; index < validChecks.length; index++) {
            const value = validChecks[index];
            embed.addField(value[0], this.format(value[1].fix.join('\n').replaceAll('{match}', matchValues[index].toString())));
        }

        this.message.reply({
            embeds: [embed],
        });
    }

    private format(str: string): string {
        return str.replaceAll('{user.tag}', this.message.author.tag)
            .replaceAll('{user.avatar}', this.message.author.displayAvatarURL())
            .replaceAll('{user.id}', this.message.author.id)
            .replaceAll('{user.name}', this.message.author.username)
            .replaceAll('{user.discriminator}', this.message.author.discriminator);
    }
}
