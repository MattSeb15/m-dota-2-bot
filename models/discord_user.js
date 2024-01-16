const mongoose = require("mongoose");

const userDiscordSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
  },  
  sid:{
    type: String,
    required: true,
  },
  accountId: {
    type: String,
    required: true,
  },
  meta: {
    privateChannelId: {type: String, required: false},
    progress: {
      level: {type: Number, default: 0},
      xp: {type: Number, default: 0}
    },    
  },
  currency: {
    currentMoney: {type: Number, default: 0},
    record: [{
      date: {type: Date, required: false},
      money: {type: Number, required: false},
      ammount: {type: Number, required: false},
      type: {type: String, required: false}
    }]    
  },
  rank:{
    type: Number,
    required: false,
  },
  messCache: [{
    name: {type: String, required: false},
    messageId: {type: String, required: false},
    channelId: {type: String, required: false}     
  }]
});


const DiscordUser = mongoose.model("DiscordUser", userDiscordSchema);

module.exports = DiscordUser;
