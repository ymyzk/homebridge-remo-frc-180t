const axios = require("axios");

let Characteristic, Service;

module.exports = (homebridge) => {
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  homebridge.registerAccessory("homebridge-remo-frc-180t", "remo-frc-180t", LightAccessory);
}

class LightAccessory {
  constructor(log, config) {
    this._log = log;
    this.name = config.name || "Light";
    this.accessToken = config.accessToken;
    this.signals = config.signals;
    this.lastSignalName = "off";

    this._service = new Service.Lightbulb("FRC-180T");
    this._service.getCharacteristic(Characteristic.On)
      .on('get', this._getOn.bind(this))
      .on('set', this._setOn.bind(this));
    this._service.getCharacteristic(Characteristic.Brightness)
      .on('get', this._getBrightness.bind(this))
      .on('set', this._setBrightness.bind(this));
  }

  getServices() {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "TOSHIBA")
      .setCharacteristic(Characteristic.Model, "FRC-180T");

    return [this._service, informationService];
  }

  async _getOn(callback) {
    this._log(`Getting on: ${this.lastSignalName}`);
    callback(null, this.lastSignalName != "off");
  }

  async _setOn(on, callback) {
    const desiredState = Boolean(on);
    const signalName = desiredState ? "full" : "off";
    if (desiredState === (this.lastSignalName !== "off")) {
      this._log("Skipping set on");
      callback();
      return;
    }
    await this._sendSignal(signalName);
    callback();
  }

  async _getBrightness(callback) {
    this._log(`Getting brightness: ${this.lastSignalName}`);
    callback(null, 80);
  }

  async _setBrightness(brightness, callback) {
    let signalName = "";
    if (brightness > 66) {
      signalName = "full";
    } else if (brightness > 33) {
      signalName = "on";
    } else if (brightness > 0) {
      signalName = "night";
    } else {
      signalName = "off";
    }
    if (signalName === this.lastSignalName) {
      this._log(`Skip sending signal: ${signalName}`);
      callback();
      return;
    }
    await this._sendSignal(signalName);
    callback();
  }

  async _sendSignal(name) {
    this._log(`Sending signal: ${name}`);
    const id = this.signals[name];
    const url = `https://api.nature.global/1/signals/${id}/send`;
    // It may be better to set the last signal name after successful API call
    this.lastSignalName = name;
    return axios.post(url, {}, {
      headers: {
        authorization: `Bearer ${this.accessToken}`,
      },
    });
  }
}
