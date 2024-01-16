require("dotenv").config();
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { Client, Collection, GatewayIntentBits, EmbedBuilder} = require("discord.js");
const {GlobalFonts} = require('@napi-rs/canvas')

const MostCanvas = require('./app/mostcanvas');

const d2fontPath = "./assets/fonts/d2font.otf";
GlobalFonts.registerFromPath(d2fontPath,'d2font');  

const configData = require('./config.json');

initMongoose();


async function initMongoose(){
    try{
        await mongoose.connect(process.env.MONGO_URL); // 'mongodb://127.0.0.1:27017/mbotdc' local
        console.log('MONGO CONNECTION OPEN.');
        }catch(e){
            console.log(e, '\nMONGO ERROR.');
        }
}



const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildVoiceStates,
  ],
});
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(process.env.TOKEN);

function anticrash(e,channel){
	try{
		const embed = new EmbedBuilder()
		.setColor("Red")
		.setTitle(`${e.message}`)
		.setDescription(`${e.stack}`);

		client.channels.cache.get(channel).send({embeds: [embed]});
		
	}catch{
		console.log(e.message+`\n`+e.stack);
	}

	
}

process.on("uncaughtException", (err)=> anticrash(err,configData.CHANNELS.TEXT.ERROR_CONSOLE_LOG_CHANNEL_ID));
process.on("unhandleRejection", (err)=> anticrash(err,configData.CHANNELS.TEXT.ERROR_CONSOLE_LOG_CHANNEL_ID));
process.on("exit", (code)=> {
	const embed  = new EmbedBuilder()
	.setColor("Red")
	.setTitle(`Bot status`)
	.setDescription(`Bye :(! Exit with code: ${code}`)
	client.channels.cache.get(channel).send({embeds: [embed]});

});





