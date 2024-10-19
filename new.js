require('dotenv').config();
const { Client, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    {
        name: 'ticketsetup',
        description: 'Setup a ticket for clan application',
        options: [
            {
                name: 'title',
                type: 3, // STRING type
                description: 'Title for the embed',
                required: true,
            },
            {
                name: 'embed_message',
                type: 3, // STRING type
                description: 'Message for the embed',
                required: true,
            },
            {
                name: 'embed_image_url',
                type: 3, // STRING type
                description: 'Embed image URL',
                required: false,
            },
            {
                name: 'staff_role',
                type: 8, // ROLE type
                description: 'Select the support staff role',
                required: true,
            },
        ],
    },
];

// Register the slash command
const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isCommand()) {
        if (interaction.commandName === 'ticketsetup') {
            const title = interaction.options.getString('title');
            const embedMessage = interaction.options.getString('embed_message');
            const embedImageUrl = interaction.options.getString('embed_image_url') || null;
            const staffRole = interaction.options.getRole('staff_role');

            const embed = {
                title: title,
                description: embedMessage,
                image: { url: embedImageUrl },
                color: 0x0099ff,
            };

            const applyButton = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 1,
                        label: 'Apply',
                        custom_id: 'apply_ticket',
                    },
                ],
            };

            await interaction.reply({
                embeds: [embed],
                components: [applyButton],
            });
        }
    } else if (interaction.customId === 'apply_ticket') {
        const filter = (response) => response.author.id === interaction.user.id;

        await interaction.followUp('Please provide your player tag:');
        const playerTagResponse = await interaction.channel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
            errors: ['time'],
        });
        const playerTag = playerTagResponse.first().content;

        await interaction.followUp('Please answer the first important question:');
        const question1Response = await interaction.channel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
            errors: ['time'],
        });
        const question1 = question1Response.first().content;

        await interaction.followUp('Please answer the second important question:');
        const question2Response = await interaction.channel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
            errors: ['time'],
        });
        const question2 = question2Response.first().content;

        await interaction.followUp('Please answer the third important question:');
        const question3Response = await interaction.channel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
            errors: ['time'],
        });
        const question3 = question3Response.first().content;

        const ticketChannel = await interaction.guild.channels.create(interaction.user.username, {
            type: 0, // GUILD_TEXT
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel'],
                },
                {
                    id: staffRole.id,
                    allow: ['ViewChannel'],
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel'],
                },
            ],
        });

        await ticketChannel.send(`Staff, please review this application from <@${interaction.user.id}>!`);
        await ticketChannel.send({
            embeds: [{
                title: 'Application Details',
                description: `Player Tag: ${playerTag}\nQuestion 1: ${question1}\nQuestion 2: ${question2}\nQuestion 3: ${question3}`,
                color: 0x0099ff,
            }],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            label: 'Applicant Account',
                            custom_id: 'view_account',
                        },
                        {
                            type: 2,
                            style: 4,
                            label: 'Close Ticket',
                            custom_id: 'close_ticket',
                        },
                    ],
                },
            ],
        });
    } else if (interaction.customId === 'view_account') {
        const playerTag = ''; // You'll need to persist this value or find a way to retrieve it
        const playerData = await fetchPlayerData(playerTag); // Fetch data from CoC API
        
        if (playerData) {
            await interaction.reply({ embeds: [createPlayerEmbed(playerData)] });
        } else {
            await interaction.reply({ content: 'Could not fetch player data.', ephemeral: true });
        }
    } else if (interaction.customId === 'close_ticket') {
        const staffRole = interaction.guild.roles.cache.find(role => role.name === 'Staff'); // Assuming "Staff" is the role name
        if (!interaction.member.roles.cache.has(staffRole.id)) {
            return interaction.reply({ content: 'You do not have permission to close this ticket.', ephemeral: true });
        }

        await interaction.channel.delete();
        await interaction.reply({ content: 'The ticket has been closed.' });
    }
});

async function fetchPlayerData(playerTag) {
    try {
        const response = await axios.get(`https://cocproxy.royaleapi.dev/v1/players/%23${playerTag}`, {
            headers: {
                Authorization: `Bearer ${process.env.COC_API_KEY}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function createPlayerEmbed(playerData) {
    return {
        title: 'Player Data',
        description: `Player Name: ${playerData.name}\nTown Hall Level: ${playerData.townHallLevel}\nTrophies: ${playerData.trophies}`,
        color: 0x00ff00,
    };
}

// Start the bot
client.login(process.env.BOT_TOKEN);