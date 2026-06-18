import { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ComponentType, 
    LabelBuilder, 
    RoleSelectMenuBuilder 
} from 'discord.js';

import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { getColor } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';

import { 
    handleInteractionError, 
    withErrorHandling, 
    createError, 
    ErrorTypes 
} from '../../utils/errorHandler.js';

import ApplicationService from '../../services/applicationService.js';

import { 
    getApplicationSettings, 
    saveApplicationSettings, 
    getApplication, 
    getApplications, 
    updateApplication,
    getApplicationRoles,
    saveApplicationRoles,
    getApplicationRoleSettings,
    saveApplicationRoleSettings,
    deleteApplication
} from '../../utils/database.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

import appDashboard from './modules/app_dashboard.js';


function getApplicationStatusPresentation(statusValue) {

    const normalized = typeof statusValue === 'string'
        ? statusValue.trim().toLowerCase()
        : 'unknown';


    const statusLabel =
        normalized === 'pending' ? 'Pendiente' :
        normalized === 'approved' ? 'Aceptada' :
        normalized === 'denied' ? 'Rechazada' :
        'Desconocido';


    const statusEmoji =
        normalized === 'pending' ? '🟡' :
        normalized === 'approved' ? '🟢' :
        normalized === 'denied' ? '🔴' :
        '⚪';


    return {
        normalized,
        statusLabel,
        statusEmoji
    };
}



export default {

    data: new SlashCommandBuilder()

    .setName("solicitudes-admin")

    .setDescription("Administrar solicitudes del staff de Comunidad KLV")

    .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageGuild
    )


    .addSubcommand((subcommand) =>
        subcommand
            .setName("configurar")
            .setDescription("Crear una nueva solicitud para el staff")
    )


    .addSubcommand((subcommand) =>
        subcommand
            .setName("revisar")
            .setDescription("Aceptar o rechazar una solicitud")

            .addStringOption((option) =>
                option
                    .setName("id")
                    .setDescription("ID de la solicitud")
                    .setRequired(true)
            )
    )


    .addSubcommand((subcommand) =>
        subcommand
            .setName("lista")
            .setDescription("Ver todas las solicitudes")

            .addStringOption((option) =>
                option
                    .setName("estado")
                    .setDescription("Filtrar por estado")

                    .addChoices(
                        {
                            name: "Pendiente",
                            value: "pending"
                        },
                        {
                            name: "Aceptada",
                            value: "approved"
                        },
                        {
                            name: "Rechazada",
                            value: "denied"
                        }
                    )
            )

            .addUserOption((option) =>
                option
                    .setName("usuario")
                    .setDescription("Filtrar por usuario")
            )

            .addNumberOption((option) =>
                option
                    .setName("limite")
                    .setDescription("Cantidad máxima de solicitudes")
                    .setMinValue(1)
                    .setMaxValue(25)
            )
    )


    .addSubcommand((subcommand) =>
        subcommand

            .setName("panel")

            .setDescription(
                "Abrir panel de configuración de solicitudes KLV"
            )

            .addStringOption((option) =>
                option
                    .setName("solicitud")
                    .setDescription("Selecciona una solicitud")
                    .setRequired(false)
                    .setAutocomplete(true)
            )
    ),


    category: "Comunidad",



    execute: withErrorHandling(async(interaction)=>{


        if(!interaction.inGuild()){

            return await replyUserError(
                interaction,
                {
                    type: ErrorTypes.UNKNOWN,
                    message:
                    "Este comando solo funciona dentro del servidor."
                }
            );
        }



        const {
            options,
            guild,
            member
        } = interaction;



        const subcommand =
        options.getSubcommand();



        if(
            subcommand !== "panel" &&
            subcommand !== "configurar"
        ){

            await InteractionHelper.safeDefer(
                interaction,
                {
                    flags:["Ephemeral"]
                }
            );

        }



        logger.info(
            `Comando solicitudes KLV ejecutado: ${subcommand}`,
            {
                userId: interaction.user.id,
                guildId:guild.id,
                subcommand
            }
        );



        await ApplicationService.checkManagerPermission(
            interaction.client,
            guild.id,
            member
        );



        if(subcommand === "configurar"){

            await handleSetup(interaction);

        } else if(subcommand === "revisar"){

            await handleReview(interaction);

        } else if(subcommand === "lista"){

            await handleList(interaction);

        } else if(subcommand === "panel"){

            const selected =
            interaction.options.getString("solicitud");


            await appDashboard.execute(
                interaction,
                null,
                interaction.client,
                selected
            );
        }



    },
    {
        type:'command',
        commandName:'solicitudes-admin'
    })

};

async function handleSetup(interaction) {

    if (interaction.deferred || interaction.replied) {

        return await replyUserError(
            interaction,
            {
                type: ErrorTypes.UNKNOWN,
                message:
                "Esta interacción ya fue procesada, intenta nuevamente."
            }
        );
    }



    const modal = new ModalBuilder()

        .setCustomId('klv_setup_modal')

        .setTitle('Crear Solicitud KLV');



    const roleSelect = new RoleSelectMenuBuilder()

        .setCustomId('role_id')

        .setPlaceholder('Selecciona el rango del staff')

        .setRequired(true);



    const roleLabel = new LabelBuilder()

        .setLabel('Rango del Staff')

        .setDescription(
            'Rango que recibirá el usuario si es aceptado'
        )

        .setRoleSelectMenuComponent(roleSelect);




    const appNameInput = new TextInputBuilder()

        .setCustomId('app_name')

        .setStyle(TextInputStyle.Short)

        .setPlaceholder(
            'Ejemplo: Moderador, Soporte, Helper'
        )

        .setMaxLength(50)

        .setRequired(true);



    const appNameLabel = new LabelBuilder()

        .setLabel('Nombre de solicitud')

        .setTextInputComponent(appNameInput);




    const q1Input = new TextInputBuilder()

        .setCustomId('app_question_1')

        .setStyle(TextInputStyle.Short)

        .setPlaceholder(
            '¿Por qué quieres entrar al staff?'
        )

        .setMaxLength(100)

        .setRequired(true);



    const q1Label = new LabelBuilder()

        .setLabel('Pregunta 1')

        .setTextInputComponent(q1Input);




    const q2Input = new TextInputBuilder()

        .setCustomId('app_question_2')

        .setStyle(TextInputStyle.Short)

        .setPlaceholder(
            '¿Qué experiencia tienes?'
        )

        .setRequired(false);



    const q2Label = new LabelBuilder()

        .setLabel('Pregunta 2 (opcional)')

        .setTextInputComponent(q2Input);




    const q3Input = new TextInputBuilder()

        .setCustomId('app_question_3')

        .setStyle(TextInputStyle.Short)

        .setRequired(false);



    const q3Label = new LabelBuilder()

        .setLabel('Pregunta 3 (opcional)')

        .setTextInputComponent(q3Input);



    modal.addLabelComponents(
        roleLabel,
        appNameLabel,
        q1Label,
        q2Label,
        q3Label
    );



    await interaction.showModal(modal);



    const submitted =
    await interaction.awaitModalSubmit({

        time: 15 * 60 * 1000,

        filter:(i)=>
            i.customId === 'klv_setup_modal' &&
            i.user.id === interaction.user.id

    }).catch(()=>null);



    if(!submitted) return;



    const appName =
    submitted.fields
    .getTextInputValue('app_name')
    .trim();



    const selectedRoles =
    submitted.fields
    .getSelectedRoles('role_id');


    const roleId =
    selectedRoles.first()?.id;



    if(!roleId){

        return replyUserError(
            submitted,
            {
                type:ErrorTypes.USER_INPUT,
                message:
                "Debes seleccionar un rango."
            }
        );
    }



    const questions = [

        submitted.fields
        .getTextInputValue('app_question_1'),

        submitted.fields
        .getTextInputValue('app_question_2'),

        submitted.fields
        .getTextInputValue('app_question_3')

    ].filter(Boolean);



    const role =
    await interaction.guild.roles
    .fetch(roleId)
    .catch(()=>null);



    if(!role){

        return replyUserError(
            submitted,
            {
                type:ErrorTypes.VALIDATION,
                message:
                "El rango no existe."
            }
        );
    }




    const roles =
    await getApplicationRoles(
        interaction.client,
        interaction.guild.id
    );



    roles.push({

        roleId,

        name:appName,

        enabled:true

    });



    await saveApplicationRoles(

        interaction.client,

        interaction.guild.id,

        roles

    );



    await saveApplicationRoleSettings(

        interaction.client,

        interaction.guild.id,

        roleId,

        {
            questions
        }

    );



    await submitted.reply({

        embeds:[

            successEmbed(

                "✅ Solicitud creada",

                `La solicitud **${appName}** fue creada para ${role}.`

            )

        ],

        flags:["Ephemeral"]

    });

}
