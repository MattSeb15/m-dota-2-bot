const { ContextMenuCommandBuilder, ApplicationCommandType, MessageContextMenuCommandInteraction } = require('discord.js');

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Md2-Profile')
        .setType(ApplicationCommandType.User),
        /**
         * 
         * @param {MessageContextMenuCommandInteraction} interaction 
         */
	async execute(interaction) {        


		await interaction.reply({
            content: `${interaction.targetUser}`
        });
	},
};