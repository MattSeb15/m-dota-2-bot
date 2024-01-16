const SteamID = require('steamid');

class MSteamId{

    constructor(sidString){
        this.sidString = sidString;
    }

    getSteam3RenderedID(){
        let sid = new SteamID(this.sidString);
        const s3rId =  sid.getSteam3RenderedID();
        return s3rId;
    }

    steam3rIdToString(){
        const s3rId = this.getSteam3RenderedID();

        const regex = /1:(\d+)/;
        const resultado = regex.exec(s3rId);
        if (resultado && resultado.length >= 2) {
          return resultado[1];
        } else {
          return null; 
        }    
    }




}


module.exports = MSteamId;
