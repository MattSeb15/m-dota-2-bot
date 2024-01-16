const cvs = require("@napi-rs/canvas");
const { AttachmentBuilder } = require("discord.js");
const DiscordUser = require("../models/discord_user");
const SDotaApi = require("../call-api");

class Canvas {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  createCanvas(width = 0, height = 0) {
    const canv = cvs.createCanvas(width, height);
    this.canvas = canv;
    return canv;
  }

  async loadImage(imgPath) {
    try {
      const imgLoaded = await cvs.loadImage(imgPath);

      console.log("image loaded succes", imgPath);
      return imgLoaded;
    } catch (e) {
      console.log("error on laod img on: " + imgPath);
    }

    return imgLoaded;
  }

  async drawRoundedImage(ctx, imagePath, x, y, width, height, borderRadius) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, borderRadius);
    ctx.closePath();
    ctx.clip();
    try {
      const imgLoaded = await cvs.loadImage(imagePath);
      ctx.drawImage(imgLoaded, x, y, width, height);
    } catch (e) {}
    ctx.restore();
  }

  drawText(
    ctx,
    text,
    x,
    y,
    maxWidth = 500,
    fontSize = 12,
    fontColor = "#FFFFFF",
    textAlign = "center",
    textBaseline = "middle",
    fontFamily = "Arial"
  ) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fontColor;
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;
    ctx.fillText(text, x, y, maxWidth);
  }

  drawVDAText(
    ctx,
    v,
    d,
    a,
    fontColorHex,
    fontSize = 12,
    x,
    y,
    fontFamily = "Arial"
  ) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = `${fontColorHex}` ?? "#FFFFFF";
    ctx.textAlign = "end";
    ctx.textBaseline = "middle";
    const separation = 30;
    ctx.fillText(v, x, y);
    ctx.fillText(d, x + separation, y);
    ctx.fillText(a, x + separation * 2, y);
  }

  async drawImage(ctx, imgLoaded, x, y, width, heigth) {
    try {
      ctx.drawImage(imgLoaded, x, y, width, heigth);
    } catch (e) {}
  }

  async loadAndDrawImage(ctx, imgPath, x, y, width, heigth) {
    //ctx.save()
    const imgLoaded = await cvs.loadImage(imgPath);
    ctx.drawImage(imgLoaded, x, y, width, heigth);
    //ctx.restore();
  }

  async loadAndDrawBackground(ctx, imgPath) {
    //ctx.save()
    const imgLoaded = await cvs.loadImage(imgPath);
    ctx.drawImage(imgLoaded, 0, 0);
    //ctx.restore();
  }

  async createMedaltoRoleAttachment(
    hexColorRole = "#03a9f4",
    medalImageUrl = "./assets/imgs/placeholder_medal.png",
    playerName = "name"
  ) {
    const canvas = this.createCanvas(500, 500);
    const ctx = canvas.getContext("2d");

    const backgroundPath = "./assets/imgs/medals_background.png";
    await this.loadAndDrawImage(ctx, backgroundPath, 0, 0);
    ctx.lineWidth = 42;
    ctx.strokeStyle = hexColorRole;
    ctx.fillStyle = hexColorRole;
    ctx.beginPath();
    ctx.moveTo(171, -26);
    ctx.lineTo(-26, 171);
    ctx.closePath();
    ctx.stroke();
    await this.loadAndDrawImage(ctx, medalImageUrl, 122, 122);
    this.drawText(
      ctx,
      playerName,
      250,
      430,
      450,
      52,
      "#ffffff",
      "center",
      "middle",
      "d2font"
    );
    const attachment = new AttachmentBuilder(await canvas.encode("png"), {
      name: `${playerName ?? "user"}-medal-to-role-img.png`,
    });

    return attachment;
  }

  async createAttacthmentParty(interaction) {
    const { member, guild } = interaction;
    const voiceChannel = member.voice.channel;

    const backgroundImagePath =
      "./assets/imgs/party_background_template_image.png";
    const placeholderMedalPath = "./assets/imgs/placeholder_medal.png";

    const members = voiceChannel?.members
      .filter((m) => !m.user.bot)
      .map((m) => m.id);

    const canvas = this.createCanvas(1000, 500);
    const ctx = canvas.getContext("2d");
    await this.loadAndDrawBackground(ctx, backgroundImagePath);

    const partyText = `${voiceChannel.name ?? "Party"}`.toUpperCase();
    const xpPartyText = canvas.width / 2;
    const ypPartyText = 57;
    const mwPartyText = 650;
    const fsPartyText = 30;
    const fcPartyText = "#ffffff";
    const taPartyText = "center";
    const tbPartyText = "alphabetic";
    const ffPartyText = "d2font";

    this.drawText(
      ctx,
      this.truncarString(partyText, 25),
      xpPartyText,
      ypPartyText,
      mwPartyText,
      fsPartyText,
      fcPartyText,
      taPartyText,
      tbPartyText,
      ffPartyText
    );

    //avatar
    const dxImgAvatarInit = 49;
    const dyImgAvatar = 136;
    const widthAvatar = 150;
    const heightAvatar = 145;
    let dxImgAvatar = 0;
    //medal
    const dxImgMedalInit = 78;
    const dyImgMedal = 364;
    let dxImgMedal = 0;
    const widthMedal = 90;
    const heightMedal = 90;

    //text usersnames
    const dyTextUsername = 317.04;
    const mwProfileNameText = 150;
    const fsProfileNameText = 20;
    const fcProfileNameText = "#ffffff";
    const taProfileNameText = "center";
    const tbProfileNameText = "alphabetic";
    const ffProfileNameText = "d2font";
    let dxTextUsername = 0;

    //vars
    const separation = 188;

    for (let i = 0; i < members.length; i++) {
      dxImgAvatar = i === 0 ? dxImgAvatarInit : dxImgAvatar + separation;
      dxImgMedal = i === 0 ? dxImgMedalInit : dxImgMedal + separation;

      dxTextUsername = getdxTextUserName(i);

      const memberId = members[i];
      const currentMember = guild.members.cache.get(memberId);
      const currentUser = currentMember.user;
      const avatarUrl = currentMember.displayAvatarURL({
        size: 1024,
        extension: "jpg",
      });
      const userData = await DiscordUser.findOne({
        discordId: `${currentUser.id}`,
      });

      if (userData) {
        const profile = await SDotaApi.getProfile(userData.accountId);
        if (profile) {
          const rank = profile.steamAccount?.seasonRank ?? "00";

          const medalImageUrl = SDotaApi.getMedalImageAttachment(
            `${rank}`
          ).image_url;

          await this.loadAndDrawImage(
            ctx,
            medalImageUrl,
            dxImgMedal,
            dyImgMedal,
            widthMedal,
            heightMedal
          );

          const profileAvatarUrl = profile.steamAccount?.avatar;
          const profileName = profile.steamAccount?.name;
          await this.loadAndDrawImage(
            ctx,
            profileAvatarUrl,
            dxImgAvatar,
            dyImgAvatar,
            widthAvatar,
            heightAvatar
          );

          const profileNameText = `${profileName ?? currentUser?.username ?? "Name"}`.toUpperCase();         

          this.drawText(
            ctx,
            this.truncarString(profileNameText,9),
            dxTextUsername,
            dyTextUsername,
            mwProfileNameText,
            fsProfileNameText,
            fcProfileNameText,
            taProfileNameText,
            tbProfileNameText,
            ffProfileNameText
          );

          continue;
        }
      } else {
        await this.loadAndDrawImage(
          ctx,
          avatarUrl,
          dxImgAvatar,
          dyImgAvatar,
          widthAvatar,
          heightAvatar
          );

        await this.loadAndDrawImage(
          ctx,
          placeholderMedalPath,
          dxImgMedal,
          dyImgMedal,
          widthMedal,
          heightMedal
        );  
        const profileNameText = `${currentUser?.username ?? "Name"}`.toUpperCase();     

        this.drawText(
          ctx,
          this.truncarString(profileNameText,9),
          dxTextUsername,
          dyTextUsername,
          mwProfileNameText,
          fsProfileNameText,
          fcProfileNameText,
          taProfileNameText,
          tbProfileNameText,
          ffProfileNameText
        );
        
      }
    }

    function getdxTextUserName(i) {
      let finalxposition = 0;
      switch (i) {
        case 0:
          finalxposition = 110;
          break;
        case 1:
          finalxposition = 296;
          break;
        case 2:
          finalxposition = 486;
          break;
        case 3:
          finalxposition = 673;
          break;
        case 4:
          finalxposition = 862;
          break;
      }
      return finalxposition + 12;
    }

    const attachment = new AttachmentBuilder(await canvas.encode("png"), {
      name: `${member.user.username}-party.png`,
    });

    return attachment;
  }

  async createProfileAttachment(dcId) {
    try {
      if (!dcId) return;

      const canvas = this.createCanvas(1000, 550);
      const ctx = canvas.getContext("2d");

      const userData = await DiscordUser.findOne({ discordId: dcId });
      if (!userData) return;

      const profileData = await SDotaApi.getProfile(userData.accountId);
      if (!profileData) return;
      const backgroundPath = "./assets/profile_info/profile_background_fn.png";
      const profilePictureUrl = profileData.steamAccount?.avatar;
      const profileRank = profileData.steamAccount?.seasonRank ?? "00";
      const profileName = profileData.steamAccount?.name ?? "NO PROFILE NAME";
      const profileAccId = userData.accountId ?? "##########";

      const sNumberPh = "----";

      const mmrEstimate = SDotaApi.parseRank(
        `${profileData.steamAccount?.seasonRank}`
      );

      const mmrEstimateString =
        !mmrEstimate || !mmrEstimate.stars || !mmrEstimate.rank
          ? "---"
          : `${mmrEstimate.rank - 2}.${mmrEstimate.stars + 1}k+`;

      const profileTotalsString = `${profileData.matchCount ?? sNumberPh}`;
      const profileWinsString = `${profileData.winCount ?? sNumberPh}`;
      const profileLoseString = `${
        profileData.matchCount - profileData.winCount ?? sNumberPh
      }`;
      const profileWinRateString = `${
        ((profileData.winCount * 100) / profileData.matchCount).toFixed(2) ??
        sNumberPh
      }%`;

      const behaviorScore = profileData.behaviorScore ?? -1;
      const behaviorParsedString = this.formatNumber(behaviorScore);
      const behaviorImgPath =
        behaviorScore >= 8500 || behaviorScore === -1
          ? "./assets/profile_info/good_behavior_bg.png"
          : behaviorScore < 8500 && behaviorScore > 5000
          ? "./assets/profile_info/middle_behavior_bg.png"
          : "./assets/profile_info/bad_behavior_bg.png";

      await this.loadAndDrawBackground(ctx, backgroundPath);

      const xpProfilePicture = 51;
      const ypProfilePicture = 51;
      const sizeProfilePicture = 248;
      const brProfilePicture = 10;

      const xpMedalImg = 55;
      const ypMedalImg = 315;
      const sizeMedalImg = 230;

      let xPositionHeroPerformance = 0;
      const ixpHeroPerformance = 359;
      const ypHeroPerformance = 254;
      const wHeroPerformance = 186;
      const hHeroPerformance = 120;
      const separator = 198;
      const brHeroPerformance = 10;

      const xpAccIdText = 395;
      const ypAccIdText = 67;
      const mwAccIdText = 135;

      const xpProfileNameText = 362;
      const ypProfileNameText = 132;
      const mwProfileNameText = 515;

      const xpBehaviorScore = 347;
      const ypBehaviorScore = 411;

      const xpBehaviorScoreText = 532; //520
      const ypBehaviorScoreText = 473;
      const mwBehaviorScoreText = 125;
      const fsBehaviorScoreText = "bold 50";

      const xpEstimateMMR = 732;
      const ypEstimateMMR = 473;
      const mwEstimateMMR = 125;
      const fsEstimateMMR = "bold 50";

      const xpWins = 906;
      const ypWins = 446;

      const xpLoses = 896;
      const ypLoses = 436;
      const mwWL = 70;
      const fsWL = "bold 11";

      const xpTotalM = 902;
      const ypTotalM = 457;
      const mwTotalM = 75;
      const fsTotalM = "bold 11";

      const xpWRate = 880;
      const ypWRate = 469;
      const mwWRate = 70;
      const fsWRate = "bold 11";

      //profilePicture
      await this.drawRoundedImage(
        ctx,
        profilePictureUrl,
        xpProfilePicture,
        ypProfilePicture,
        sizeProfilePicture,
        sizeProfilePicture,
        brProfilePicture
      );

      //medalPicture
      const medalImageUrl = SDotaApi.getMedalImageAttachment(
        `${profileRank}`
      ).image_url;
      await this.loadAndDrawImage(
        ctx,
        medalImageUrl,
        xpMedalImg,
        ypMedalImg,
        sizeMedalImg,
        sizeMedalImg
      );

      //heroperformance
      const top3HeroPerformance = await SDotaApi.getTopXPlayerHeroPerformance(
        userData.accountId
      );
      console.log("HERO PERFORMANCE", top3HeroPerformance);
      for (let i = 0; i < 3; i++) {
        const heroimgUrl = await SDotaApi.getImgHeroUrlById(
          top3HeroPerformance[i].heroId
        );
        xPositionHeroPerformance =
          i === 0 ? ixpHeroPerformance : xPositionHeroPerformance + separator;

        await this.drawRoundedImage(
          ctx,
          heroimgUrl,
          xPositionHeroPerformance,
          ypHeroPerformance,
          wHeroPerformance,
          hHeroPerformance,
          brHeroPerformance
        );
      }

      //first container
      this.drawText(
        ctx,
        profileAccId,
        xpAccIdText,
        ypAccIdText,
        mwAccIdText,
        17,
        "#ffffff",
        "start",
        "top"
      );
      this.drawText(
        ctx,
        profileName,
        xpProfileNameText,
        ypProfileNameText,
        mwProfileNameText,
        "bold 50",
        "#ffffff",
        "start",
        "middle"
      );
      await this.loadAndDrawImage(
        ctx,
        behaviorImgPath,
        xpBehaviorScore,
        ypBehaviorScore
      );
      this.drawText(
        ctx,
        behaviorParsedString,
        xpBehaviorScoreText,
        ypBehaviorScoreText,
        mwBehaviorScoreText,
        fsBehaviorScoreText,
        "#ffffff",
        "end",
        "alphabetic"
      );
      //middle container
      this.drawText(
        ctx,
        mmrEstimateString,
        xpEstimateMMR,
        ypEstimateMMR,
        mwEstimateMMR,
        fsEstimateMMR,
        "#ffffff",
        "end",
        "alphabetic"
      );

      //final container
      this.drawText(
        ctx,
        profileTotalsString,
        xpTotalM,
        ypTotalM,
        mwTotalM,
        fsTotalM,
        "#ffffff",
        "end",
        "alphabetic"
      );
      this.drawText(
        ctx,
        profileLoseString,
        xpLoses,
        ypLoses,
        mwWL,
        fsWL,
        "#ffffff",
        "end",
        "alphabetic"
      );
      this.drawText(
        ctx,
        profileWinsString,
        xpWins,
        ypWins,
        mwWL,
        fsWL,
        "#ffffff",
        "end",
        "alphabetic"
      );
      this.drawText(
        ctx,
        profileWinRateString,
        xpWRate,
        ypWRate,
        mwWRate,
        fsWRate,
        "#ffffff",
        "end",
        "alphabetic"
      );

      const attachment = new AttachmentBuilder(await canvas.encode("png"), {
        name: `${
          profileData.steamAccount?.name ?? "Username"
        }-d2profile-img.png`,
      });

      return attachment;
    } catch (e) {
      console.log("SOMETHING WRONG CREATING PROFILE ATTCH", e);
      return;
    }
  }

  formatNumber(number = 0) {
    if (number === -1) return "--";
    if (number >= 10000) {
      return "10k";
    } else if (number >= 1000) {
      const thousands = Math.floor(number / 1000);
      const remainder = number % 1000;
      const hundreds = Math.floor(remainder / 100);

      if (hundreds > 0) {
        return `${thousands}.${hundreds}k`;
      } else {
        return `${thousands}k`;
      }
    } else {
      return "<1k";
    }
  }

  truncarString(str, length, overflow = "...") {
    if (str.length <= length) {
      return str;
    } else {
      return str.slice(0, length) + overflow;
    }
  }
}

module.exports = new Canvas();
