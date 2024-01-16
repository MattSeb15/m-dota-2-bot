require("dotenv").config();
const axios = require("axios");
const config = require("./config.json");

const token = process.env.API_TOKEN;

const API_URL = "https://api.stratz.com/api/v1"; //376446403

const DOTA_IMG_URL =
  "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";

const OPENDOTA_API_URL = "https://api.opendota.com/api";

//API_URL+'/Player/376446403'

class SDotaApi {
  constructor(apiUrl = API_URL) {
    this.apiUrl = apiUrl;
  }
  async getProfile(acc_id) {
    if (!acc_id) return;
    try {
      const res = await callApi(`Player/${acc_id}`);
      if (!res) return;
      return res?.data;
    } catch (e) {
      console.log(e);
      return;
    }
  }

  async getMatchesData(acc_id, takeValue = 1) {
    const query = [
      {
        key: "take",
        value: takeValue,
      },
      {
        key: "playerList",
        value: "0",
      },
    ];
    const res = await callApi(`Player/${acc_id}/matches`, query);
    if (!res) {
      return;
    }
    return res.data;
  }

  async getHeroDataById(hero_id) {
    if (!hero_id) return;
    const res = await callApi(`Hero`);
    const data = res.data;
    const findHero = data[`${hero_id}`];
    console.log("FIND HEROOOOOOOOOOOOOOOOO", findHero?.name);
    return findHero;
  }

  async getImgHeroUrlById(hero_id) {
    const hero = await this.getHeroDataById(hero_id);
    if (!hero) return "";
    const heroName = hero?.shortName;
    const finalUrl = `${DOTA_IMG_URL}/${heroName}.png`;
    console.log("FINAL URL", finalUrl);
    return finalUrl;
  }

  parseDate(dateInt) {
    if (!dateInt) return;
    const fecha = new Date(dateInt * 1000).toDateString();
    return fecha;
  }

  parseRank(unparsedRankString = "00") {
    try {
      if (!unparsedRankString) {
        return;
      }
      const rankData = unparsedRankString;
      const rank = parseInt(rankData.substring(0, 1));
      const stars = parseInt(rankData.substring(1));
      return { rank: rank, stars: stars, unparsedRankString };
    } catch (e) {
      return;
    }
  }

  getparseLaneObject(lane = 0, role = 0) {
    if (lane === 1 && role === 0) return config.DOTA_LANES[1]; //1
    if (lane === 2 && role === 0) return config.DOTA_LANES[2]; //2
    if (lane === 3 && role === 0) return config.DOTA_LANES[3]; //3
    if (lane === 3 && role === 1) return config.DOTA_LANES[4]; //4
    if (lane === 1 && role === 2) return config.DOTA_LANES[5]; //5
    return;
  }

  parseDateAgo(dateInt) {
    const currentTimestamp = Date.now();
    const timeDifferenceMilliseconds = currentTimestamp - dateInt * 1000;

    const seconds = Math.floor(timeDifferenceMilliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30); // Assuming 30 days per month
    const years = Math.floor(months / 12);

    if (years > 0) {
      return `${years} year${years > 1 ? "s" : ""} ago`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? "s" : ""} ago`;
    } else if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
      return "a few seconds ago";
    }
  }

  getMedalImageAttachment(rank = "00") {
    const parseMedalRankInt = parseInt(rank.substring(0, 1));
    const parseStarsInt = parseInt(rank.substring(1)) - 1;
    if (parseStarsInt <= 0) {
      const getMedalData = config.MEDALS_EMBEDS[parseMedalRankInt];
      return getMedalData;
    }
    const getMedalData =
      config.MEDALS_EMBEDS[parseMedalRankInt].stars[
        parseStarsInt > 8 ? 0 : parseStarsInt
      ];
    return getMedalData;
  }

  async getPlayerHeroPerformance(acc_id) {
    if (!acc_id) return;
    try {
      const res = await callApi(`Player/${acc_id}/heroPerformance`);
      if (!res) return;
      console.log("HERO PERFORMANCE: ", res.data);
      return res.data;
    } catch (e) {
      return;
    }
  }

  async getTopXPlayerHeroPerformance(acc_id, x = 3) {
    const heroPerformance = await this.getPlayerHeroPerformance(acc_id);
    heroPerformance.forEach((hero) => {
      hero.rating = wilsonScore(hero.winCount, hero.matchCount);
    });

    // Ordenar la lista heroPerformance por el rating de mayor a menor
    heroPerformance.sort((a, b) => b.rating - a.rating);
    const topHeroes = heroPerformance.slice(0, x ?? 3);

    return topHeroes;
  }

  async getMMREstimate(acc_id) {
    if (!acc_id) return;

    try {
      const res = await callOpenDotaApi(`players/${acc_id}`);
      if (!res) return;
      const data = res.data;
      if (!data) return;
      const mmrStimate = data.mmr_estimate?.estimate;
      return mmrStimate;
    } catch (e) {
      console.log(e);
      return;
    }
  }
}

async function callOpenDotaApi(reqString, queryList = []) {
  if (!reqString || reqString === "") return;
  const getUrlString =
    OPENDOTA_API_URL + `/${reqString}` + getQueryString(queryList);
  try {
    const res = await axios.get(getUrlString);
    if (!res) return;
    return res;
  } catch (e) {
    console.log(e);
    return;
  }
}

async function callApi(reqString = "", queryList = []) {
  if (reqString === "") return;
  const getUrlString = API_URL + `/${reqString}` + getQueryString(queryList);
  try {
    const res = await axios.get(getUrlString, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res) {
      return res;
    }
    return;
  } catch (e) {
    console.log(e);
    return;
  }
}

function wilsonScore(winCount, matchCount) {
  if (matchCount === 0) {
    return 0;
  }

  const z = 1.96; // Valor crítico para un nivel de confianza del 95%
  const p = winCount / matchCount;
  const correction =
    z * Math.sqrt((p * (1 - p) + (z * z) / (4 * matchCount)) / matchCount);
  const numerator = p + (z * z) / (2 * matchCount) - correction;
  const denominator = 1 + (z * z) / matchCount;

  return numerator / denominator;
}

function getQueryString(queriesList = []) {
  let finalQuery = "?";

  if (queriesList.length === 0) return "";
  if (queriesList.length === 1)
    return `?${queriesList[0].key}=${queriesList[0].value}`;

  for (let i = 0; i < queriesList.length; i++) {
    let query = queriesList[i];
    if (i === 0) {
      finalQuery = finalQuery.concat(`${query.key}=${query.value}`);
    } else {
      finalQuery = finalQuery.concat(`&${query.key}=${query.value}`);
    }
  }

  return finalQuery;
}

module.exports = new SDotaApi();
