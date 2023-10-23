const miio = require("miio");

module.exports = function init(homebridge) {
  const Service = homebridge.hap.Service;
  const Characteristic = homebridge.hap.Characteristic;

  class MiLedDesklamp {
    constructor(log, config) {
      // Setup configuration
      this.log = log;
      this.name = config["name"] || "Mi desk lamp";
      if (!config["ip"]) {
        this.log("No IP address define for", this.name);
        return;
      }
      if (!config["token"]) {
        this.log("No token define for", this.name);
        return;
      }
      this.ip = config["ip"];
      this.token = config["token"];

      // Setup services
      this.lamp = new Service.Lightbulb(this.name);

      this.lamp
        .getCharacteristic(Characteristic.On)
        .on("get", this.getState)
        .on("set", this.setState);

      this.lamp
        .getCharacteristic(Characteristic.Brightness)
        .on("get", this.getBrightness)
        .on("set", this.setBrightness);

      this.lamp
        .getCharacteristic(Characteristic.ColorTemperature)
        .on("get", this.getColorTemperature)
        .on("set", this.setColorTemperature);

      this.listenLampState().catch((error) => this.log.error(error));
    }

    getLamp = (() => {
      let lastQuery;
      return async () => {
        if (this.lampDevice) return this.lampDevice;

        if (lastQuery) return await lastQuery;

        this.log("Connecting to device");
        try {
          lastQuery = miio.device({
            address: this.ip,
            token: this.token,
          });
          this.lampDevice = await lastQuery;
          return this.lampDevice;
        } catch (e) {
          this.log.error("Device not connected", e);
        }
        lastQuery = undefined;
      };
    })();

    listenLampState = async () => {
      const device = await this.getLamp();
      device.on("powerChanged", (isOn) =>
        this.lamp.getCharacteristic(Characteristic.On).updateValue(isOn)
      );
      device.on("colorChanged", (color) =>
        this.lamp
          .getCharacteristic(Characteristic.ColorTemperature)
          .updateValue(Math.round(1000000 / color.values[0]))
      );
      device.on("brightnessChanged", (brightness) =>
        this.lamp
          .getCharacteristic(Characteristic.Brightness)
          .updateValue(brightness)
      );
    };

    getState = async (callback) => {
      this.log("Get state...");
      try {
        const device = await this.getLamp();
        const power = await device.power();
        callback(null, power);
      } catch (e) {
        this.log.error("Error getting state", e);
        callback(e);
      }
    };

    setState = async (state, callback) => {
      this.log("Set state to", state);
      try {
        const device = await this.getLamp();
        await device.power(state);
        callback(null);
      } catch (e) {
        this.log.error("Error setting state", e);
        callback(e);
      }
    };

    getBrightness = async (callback) => {
      this.log("Get brightness...");
      try {
        const device = await this.getLamp();
        const brightness = await device.brightness();
        callback(null, brightness);
      } catch (e) {
        this.log.error("Error getting brightness", e);
        callback(e);
      }
    };

    setBrightness = async (state, callback) => {
      this.log("Set brightness to", state);
      try {
        const device = await this.getLamp();
        await device.brightness("" + state);
        callback(null);
      } catch (e) {
        this.log.error("Error setting brightness", e);
        callback(e);
      }
    };

    getColorTemperature = async (callback) => {
      this.log("Get color...");
      try {
        const device = await this.getLamp();
        const color = await device.color();
        const miredColor = Math.round(1000000 / color.values[0]);
        callback(null, miredColor);
      } catch (e) {
        this.log.error("Error getting brightness", e);
        callback(e);
      }
    };

    setColorTemperature = async (miredValue, callback) => {
      this.log("Set color to", miredValue);
      let kelvinValue = Math.round(1000000 / miredValue);

      kelvinValue = Math.max(Math.min(kelvinValue, 6500), 2700);

      try {
        const device = await this.getLamp();
        await device.call("set_ct_abx", [kelvinValue, "smooth", 1000]);
        callback(null);
      } catch (e) {
        this.log.error("Error setting color", e);
        callback(e);
      }
    };

    getServices() {
      return [this.lamp];
    }
  }

  homebridge.registerAccessory(
    "homebridge-mi-led-desk-lamp",
    "mi-led-desk-lamp",
    MiLedDesklamp
  );
};
