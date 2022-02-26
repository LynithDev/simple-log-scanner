import axios from 'axios';
import {
    ButtonInteraction,
    Message, MessageActionRow, MessageAttachment, MessageButton, MessageEmbed,
} from 'discord.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import Tesseract from 'tesseract.js';
import { Check, ConfigType, Embed } from '.';

export class Parser {
    public async handleButtons(interaction: ButtonInteraction) {
        let message: Message;
        switch (interaction.customId) {
            case 'fixedButton':
                if (interaction.message.type != 'REPLY') break;
                message = await interaction.message.fetchReference();
                if (message == undefined) break;

                if (interaction.user.id != message.author.id || !interaction.memberPermissions.has('MANAGE_MESSAGES')) {
                    interaction.reply({
                        ephemeral: true,
                        content: 'Only the author can use this!',
                    });
                }

                if (message.deletable.valueOf()) await message.delete();
                if (interaction.message.deletable.valueOf()) await interaction.message.delete();
                break;
            default: break;
        }
    }

    public async parse(message: Message): Promise<[string, Check][]> {
        const validChecks: [string, Check][] = [];
        const config: ConfigType = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

        if (!config.whitelist.includes('*') && !config.whitelist.includes(message.channel.id)) return;
        const attachments: MessageAttachment[] = [];
        const matchValues: RegExpMatchArray[] = [];

        config.extensions.forEach((ext) => message.attachments.filter((attachment) => attachment.name.endsWith(ext) || (config.image_scanning ? attachment.contentType.startsWith('image') : true)).forEach((attachment) => attachments.push(attachment)));

        for (let i = 0; i < attachments.length; i++) {
            const value = message.attachments.at(i);

            // eslint-disable-next-line no-continue
            if (value == undefined) continue;

            if (value.size / 1000 > 4096) return;

            const tempContent: string[] = [];

            message.react('🔍');

            if (value.contentType.startsWith('image')) {
                tempContent.push((await Tesseract.recognize(value.url, 'eng')).data.text);
            } else {
                tempContent.push((await axios.get(value.url)).data);
            }

            const content = tempContent.join('\n');

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

        if (validChecks.length == 0 || validChecks == null) {
            const reactions = message.reactions.cache.filter((reaction) => reaction.users.cache.has(message.client.user.id)).values();
            // eslint-disable-next-line no-restricted-syntax
            for (const reaction of reactions) {
                await reaction.users.remove(reaction.client.user.id);
            }
            return;
        }

        const embedPropertiesTemp: Embed = {
            author: {
                text: 'Scanner',
                icon: message.client.user.displayAvatarURL(),
            },
            description: '**Note:** This is an automated support bot and is not always be accurate!',
            color: '#f05050',
            footer: {
                icon: 'https://cdn.discordapp.com/avatars/507646181816401961/f19611b032be5eb402e1c1010e8f19b5.webp',
                text: 'Scanner by Lynith#0231',
            },
        };

        const embedProperties = { ...embedPropertiesTemp, ...config.embed };

        const embed = new MessageEmbed({
            author: {
                icon_url: embedProperties.author.icon,
                name: embedProperties.author.text,
            },
            title: embedProperties.title,
            description: embedProperties.description,
            color: `#${embedProperties.color.replaceAll('#', '')}`,
            footer: {
                text: embedProperties.footer.text,
                icon_url: embedProperties.footer.icon,
            },
        });

        for (let index = 0; index < validChecks.length; index++) {
            if (index >= 9 || embed.length >= 5500) break; // 5500 to "protect" from reaching 6000 char limit
            const value = validChecks[index];
            embed.addField(value[0], this.format(value[1].fix.join('\n').replaceAll('{match}', matchValues[index].toString()), message));
        }

        message.reply({
            embeds: [embed],
            components: [
                new MessageActionRow({
                    components: [
                        new MessageButton({
                            style: 'PRIMARY',
                            type: 'BUTTON',
                            customId: 'fixedButton',
                            label: 'Fixed',
                            emoji: '🛠',
                        }),
                        new MessageButton({
                            style: 'LINK',
                            type: 'BUTTON',
                            label: 'GitHub Repo',
                            url: 'https://github.com/LynithDev/simple-log-scanner',
                        }),
                    ],
                }),
            ],
        });
    }

    private format(str: string, message: Message): string {
        return str.replaceAll('{user.tag}', message.author.tag)
            .replaceAll('{user.avatar}', message.author.displayAvatarURL())
            .replaceAll('{user.id}', message.author.id)
            .replaceAll('{user.name}', message.author.username)
            .replaceAll('{user.discriminator}', message.author.discriminator);
    }
}
