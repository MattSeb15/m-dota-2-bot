const { Events, Client, EmbedBuilder} = require('discord.js');
const config = require('../config.json'); 

module.exports = {
	name: Events.ClientReady,
	once: true,

	/**
	 * 
	 * @param {Client} client 
	 */
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		const embed = new EmbedBuilder()
		.setColor("Green")
		.setTitle("Bot status")
		.setDescription(`Im ready`);
		const readyChannel = client.channels.cache.get(config.CHANNELS.TEXT.CLIENT_STATUS_LOG_CHANNEL_ID);
		if(!readyChannel)return;
		readyChannel.send({embeds: [embed]});

		
	},
};