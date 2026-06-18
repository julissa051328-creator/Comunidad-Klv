import { SlashCommandBuilder, MessageFlags, ChannelType } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';

import birthdaySet from './modules/birthday_set.js';
import birthdayInfo from './modules/birthday_info.js';
import birthdayList from './modules/birthday_list.js';
import birthdayRemove from './modules/birthday_remove.js';
import nextBirthdays from './modules/next_birthdays.js';
import birthdaySetchannel from './modules/birthday_setchannel.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cumpleaños')
        .setDescription('Sistema de cumpleaños de la comunidad KLV')
        
        .addSubcommand(subcommand =>
            subcommand
                .setName('poner')
                .setDescription('Configura tu fecha de cumpleaños')
                .addIntegerOption(option =>
                    option
                        .setName('mes')
                        .setDescription('Mes de nacimiento (1-12)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(12)
                )
                .addIntegerOption(option =>
                    option
                        .setName('dia')
                        .setDescription('Día de nacimiento (1-31)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(31)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Mira la información de cumpleaños')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario para revisar su cumpleaños')
                        .setRequired(false)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('lista')
                .setDescription('Muestra todos los cumpleaños del servidor')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('quitar')
                .setDescription('Elimina tu cumpleaños guardado')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('proximos')
                .setDescription('Muestra los próximos cumpleaños')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('canal')
                .setDescription('Configura o desactiva el canal de avisos de cumpleaños (requiere administrar servidor)')
                .addChannelOption(option =>
                    option
                        .setName('canal')
                        .setDescription('Canal donde se enviarán los avisos. Déjalo vacío para desactivar.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        ),

    async execute(interaction, config, client) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'poner':
                    return await birthdaySet.execute(interaction, config, client);

                case 'info':
                    return await birthdayInfo.execute(interaction, config, client);

                case 'lista':
                    return await birthdayList.execute(interaction, config, client);

                case 'quitar':
                    return await birthdayRemove.execute(interaction, config, client);

                case 'proximos':
                    return await nextBirthdays.execute(interaction, config, client);

                case 'canal':
                    return await birthdaySetchannel.execute(interaction, config, client);

                default:
                    return await replyUserError(interaction, {
                        type: ErrorTypes.UNKNOWN,
                        message: 'Subcomando desconocido'
                    });
            }

        } catch (error) {
            logger.error('Error ejecutando comando de cumpleaños', {
                error: error.message,
                stack: error.stack,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'cumpleaños',
                subcommand: interaction.options.getSubcommand()
            });

            await handleInteractionError(interaction, error, {
                commandName: 'cumpleaños',
                source: 'birthday_command'
            });
        }
    }
};
