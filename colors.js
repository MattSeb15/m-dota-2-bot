class Color {
  constructor(colorInt) {
    this.colorInt = colorInt;
  }

  decimalNumToRgbList() {
    this.colorInt >>>= 0;
    var b = this.colorInt & 0xff,
      g = (this.colorInt & 0xff00) >>> 8,
      r = (this.colorInt & 0xff0000) >>> 16;
    return [r, g, b];
  }

  decimalNumToRgbString() {
    this.colorInt >>>= 0;
    var b = this.colorInt & 0xff,
      g = (this.colorInt & 0xff00) >>> 8,
      r = (this.colorInt & 0xff0000) >>> 16;
    return `rgb(${r},${g},${b})`;
  }

  rgbToHex(rgb, isWeb = false) {
    // Divide los componentes de color RGB
    const r = rgb[0];
    const g = rgb[1];
    const b = rgb[2];

    // Asegúrate de que los valores estén en el rango correcto (0-255)
    const validR = Math.min(255, Math.max(0, r));
    const validG = Math.min(255, Math.max(0, g));
    const validB = Math.min(255, Math.max(0, b));

    // Convierte los valores a su representación hexadecimal
    const rHex = validR.toString(16).padStart(2, "0");
    const gHex = validG.toString(16).padStart(2, "0");
    const bHex = validB.toString(16).padStart(2, "0");

    // Combina los dígitos hexadecimales para formar el código de color hex
    const hexColor = `0x${rHex}${gHex}${bHex}`;
    const hexColorWeb = `#${rHex}${gHex}${bHex}`;

    return isWeb ? hexColorWeb : hexColor;
  }

  decimalNumToHexString() {
    const rgbList = this.decimalNumToRgbList();
    return this.rgbToHex(rgbList);
  }

  decimalNumToHexStringWeb() {
    const rgbList = this.decimalNumToRgbList();    
    return this.rgbToHex(rgbList,true);
  }
  
}



module.exports = Color;
