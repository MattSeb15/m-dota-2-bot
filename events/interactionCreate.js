const { Events, ButtonBuilder, ButtonStyle, ActionRowBuilder, ButtonInteraction, BaseInteraction } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	/**
	 * 
	 * @param {BaseInteraction} interaction 
	 */
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		} else if (interaction.isButton()) {
						
			/* console.log(interaction);
			const userInteraction = interaction.user;
			console.log(userInteraction) */

			// respond to the button
		} else if (interaction.isStringSelectMenu()) {
			// respond to the select menu
		}else if(interaction.isContextMenuCommand()){

			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}					

		}
		
	},
};