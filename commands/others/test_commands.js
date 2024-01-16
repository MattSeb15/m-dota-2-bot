const { SlashCommandBuilder, CommandInteraction, EmbedBuilder, ChannelType,PermissionFlagsBits  } = require('discord.js');
const MostCanvas = require('../../app/mostcanvas');
const config = require('../../config.json');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('test-commands')
		.setDescription('CANVAS TEST'),

        /**
         * 
         * @param {CommandInteraction} interaction 
         */
	async execute(interaction) {

        const personal_cat_id = config.CHANNELS.CATEGORIES.PERSONAL_CAT_ID;
        const user = interaction.user;
        

        const embed = new EmbedBuilder().setColor("Green");

        await interaction.deferReply({ ephemeral: true})

        await interaction.guild.channels.create({
            name: `your-private-${user.username}`,
            type: ChannelType.GuildText,
            parent: personal_cat_id,
            permissionOverwrites: [
              { id: user.id, allow: [PermissionFlagsBits.ViewChannel]},
              { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
              { id: config.GUILDS.LINKED_ACC_ROLE_ID, deny: [PermissionFlagsBits.ViewChannel] },
            ],              
          });    
        


        return interaction.editReply({
            embeds: [embed.setDescription('Success cmmd')], 
            ephemeral: true,             
        });

		
	},
};