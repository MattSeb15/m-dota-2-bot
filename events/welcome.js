const { Events} = require("discord.js");
const config = require("../config.json");
const Discord = require('discord.js');
const {Welcome} = require('niby-welcomes');


module.exports = {
  name: Events.GuildMemberAdd,
  async execute(client) {




    console.log(`Welcome user: ${client.user.tag}`);

    try {
      let welcomeChannel = client.guild.channels.cache.get(
        config.CHANNELS.WELCOME.CHANNEL_ID
      );

      if (welcomeChannel) {

               
          //CREACIÓN DE BUFFER DE IMAGEN (BIENVENIDA)
        let welcomeImage = await new Welcome()
        .setWelcomeMessage("BIENVENID@")
        .setUsername(client.user.tag, /*OPCIONAL*/ { color: "#ffffff" })
        .setMemberCount(
          `Eres el número #${client.guild.memberCount - 2}`,
          /*OPCIONAL*/ { color: "#ffffff" }
        )
        .setAvatar(
          client.user.displayAvatarURL({ size: 256, extension: "png" })
        )
        .setBackgroundUrl(getRandomImg(), {opacity: 1.0})
        .setBorder(false)
        .setStyle("koya") //koya, mee6
        .build();
      //attachment
      let attachment = new Discord.AttachmentBuilder(welcomeImage, {
        name: `bienvenida-${client.user.tag}.png`,
      });

      //enviamos el mensaje con la bienvenida
      welcomeChannel.send({
        content: `Bienvenido ${client.user} a ${client.guild.name}!`,
        files: [attachment],
      });


        
      }
    } catch (e) {
      console.log(e);
    }
  },
};


function getRandomImg(){
    const imagesList = config.CHANNELS.WELCOME.BACKGROUND_IMAGES_LIST;
    const index = Math.floor(Math.random()* imagesList.length)+1;
    if(!imagesList[index]){
        return imagesList[0];
    }
    return imagesList[index];
}


