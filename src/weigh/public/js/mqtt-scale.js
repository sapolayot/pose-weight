const MQTT_SCALE_CONFIG = {
  host: "phc.dyndns.biz",
  // ใส่ host เอง เช่น "phc.dyndns.biz"
  port: 443,
  // WebSocket port ของ broker
  path: "/mqtt/",
  topic: "PoseWeight",
  useTLS: false,
  username: "",
  password: "",
  cleanSession: true,
  reconnectDelayMs: 5e3,
  defaultMcId: "2",
  // topic สำหรับ publish คำสั่ง (default ใช้ topic เดียวกับ subscribe)
  publishTopic: "",
  // แมปรหัสเครื่องชั่ง (จาก QR) → McID ใน MQTT — ใส่เมื่อทราบค่าแล้ว
  scaleMcIdMap: {
    // "PB-BL03.3": 1,
    // "PB-BL04.3": 2,
  }
};
const MqttScale = (() => {
  let client = null;
  let connected = false;
  let connecting = false;
  let activeScaleId = null;
  let liveWeight = null;
  let liveMcId = null;
  let targetWeight = null;
  let detail = "";
  const listeners = /* @__PURE__ */ new Set();
  function notify() {
    listeners.forEach((fn) => {
      try {
        fn(getState());
      } catch (err) {
        console.error("[MqttScale] listener error:", err);
      }
    });
  }
  function getState() {
    return {
      connected,
      connecting,
      activeScaleId,
      liveWeight,
      liveMcId,
      targetWeight,
      detail
    };
  }
  function parseWeight(raw) {
    if (raw == null || raw === "") return null;
    let text = raw.toString();
    const dot = text.indexOf(".");
    if (dot >= 0) text = text.substring(0, dot + 4);
    const value = parseFloat(text);
    return Number.isFinite(value) ? value : null;
  }
  function resolveMcId(payload) {
    if (payload.McID != null) return payload.McID;
    if (payload.iMcID != null) return payload.iMcID;
    return null;
  }
  function getMappedMcId(scaleId) {
    var _a;
    if (!scaleId) return null;
    const map = MQTT_SCALE_CONFIG.scaleMcIdMap || {};
    return (_a = map[scaleId]) != null ? _a : null;
  }
  function matchesActiveScale(mcId) {
    if (mcId == null || mcId === "") return false;
    if (!activeScaleId) return true;
    const mapped = getMappedMcId(activeScaleId);
    if (mapped != null) {
      return String(mcId) === String(mapped);
    }
    return String(mcId) === String(activeScaleId) || String(activeScaleId).includes(String(mcId)) || String(mcId).includes(String(activeScaleId));
  }
  function getActiveMcId() {
    if (liveMcId != null && liveMcId !== "") return String(liveMcId);
    const mapped = getMappedMcId(activeScaleId);
    if (mapped != null) return String(mapped);
    if (MQTT_SCALE_CONFIG.defaultMcId) {
      return String(MQTT_SCALE_CONFIG.defaultMcId);
    }
    return "2";
  }
  function getPublishTopic() {
    return MQTT_SCALE_CONFIG.publishTopic || MQTT_SCALE_CONFIG.topic;
  }
  function publish(payload) {
    var _a;
    if (!((_a = client == null ? void 0 : client.isConnected) == null ? void 0 : _a.call(client))) {
      console.warn("[MqttScale] cannot publish \u2014 not connected");
      return false;
    }
    const message = new Paho.MQTT.Message(
      typeof payload === "string" ? payload : JSON.stringify(payload)
    );
    message.destinationName = getPublishTopic();
    client.send(message);
    console.log("[MqttScale] published:", message.payloadString);
    return true;
  }
  function publishTare() {
    const commandPayload = {
      McID: getActiveMcId(),
      Action: "Tare",
      Cmd: "T"
    };
    const weightPayload = {
      McID: "0",
      Rssi: "-51",
      Weight: "0"
    };
    const commandOk = publish(commandPayload);
    const weightOk = publish(weightPayload);
    liveWeight = 0;
    notify();
    return commandOk && weightOk;
  }
  function handlePayload(raw) {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      return;
    }
    const mcId = resolveMcId(payload);
    if (!matchesActiveScale(mcId)) return;
    if (mcId != null) liveMcId = mcId;
    if (payload.iDetail != null) detail = payload.iDetail;
    if (payload.iWeight != null) targetWeight = parseWeight(payload.iWeight);
    if (payload.Success === "OK") {
      liveWeight = 0;
      notify();
      return;
    }
    if (payload.Weight != null && payload.Weight !== "") {
      liveWeight = parseWeight(payload.Weight);
      notify();
    }
  }
  function onConnect() {
    connected = true;
    connecting = false;
    console.log("[MqttScale] connected, subscribing:", MQTT_SCALE_CONFIG.topic);
    client.subscribe(MQTT_SCALE_CONFIG.topic, { qos: 0 });
    notify();
  }
  function onConnectionLost(response) {
    connected = false;
    connecting = false;
    console.warn("[MqttScale] connection lost:", response == null ? void 0 : response.errorMessage);
    notify();
    if ((response == null ? void 0 : response.errorCode) !== 0) {
      setTimeout(connect, MQTT_SCALE_CONFIG.reconnectDelayMs);
    }
  }
  function onMessageArrived(message) {
    handlePayload(message.payloadString);
  }
  function canConnect() {
    var _a;
    if (typeof Paho === "undefined" || !((_a = Paho.MQTT) == null ? void 0 : _a.Client)) {
      console.warn("[MqttScale] Paho MQTT library not loaded");
      return false;
    }
    if (!MQTT_SCALE_CONFIG.host) {
      console.warn(
        "[MqttScale] host is empty \u2014 set MQTT_SCALE_CONFIG.host first"
      );
      return false;
    }
    return true;
  }
  function connect() {
    var _a;
    if (!canConnect() || connecting || connected) return;
    connecting = true;
    notify();
    try {
      if ((_a = client == null ? void 0 : client.isConnected) == null ? void 0 : _a.call(client)) {
        client.disconnect();
      }
      const clientId = `weigh_${parseInt(Math.random() * 1e5, 10)}`;
      client = new Paho.MQTT.Client(
        MQTT_SCALE_CONFIG.host,
        Number(MQTT_SCALE_CONFIG.port),
        MQTT_SCALE_CONFIG.path,
        clientId
      );
      client.onConnectionLost = onConnectionLost;
      client.onMessageArrived = onMessageArrived;
      const options = {
        timeout: 5,
        useSSL: Boolean(MQTT_SCALE_CONFIG.useTLS),
        cleanSession: MQTT_SCALE_CONFIG.cleanSession !== false,
        onSuccess: onConnect,
        onFailure: () => {
          connecting = false;
          notify();
          setTimeout(connect, MQTT_SCALE_CONFIG.reconnectDelayMs);
        }
      };
      if (MQTT_SCALE_CONFIG.username) {
        options.userName = MQTT_SCALE_CONFIG.username;
        options.password = MQTT_SCALE_CONFIG.password || "";
      }
      client.connect(options);
    } catch (err) {
      connecting = false;
      console.error("[MqttScale] connect error:", err);
      notify();
      setTimeout(connect, MQTT_SCALE_CONFIG.reconnectDelayMs);
    }
  }
  function disconnect() {
    var _a;
    connecting = false;
    connected = false;
    if ((_a = client == null ? void 0 : client.isConnected) == null ? void 0 : _a.call(client)) {
      client.disconnect();
    }
    notify();
  }
  function setActiveScale(scaleId) {
    activeScaleId = scaleId || null;
    liveWeight = null;
    liveMcId = null;
    notify();
  }
  function clearActiveScale() {
    activeScaleId = null;
    liveWeight = null;
    liveMcId = null;
    notify();
  }
  function getLiveWeight() {
    return liveWeight;
  }
  function isConnected() {
    return connected;
  }
  function onUpdate(callback) {
    if (typeof callback !== "function") return () => {
    };
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", connect);
  } else {
    connect();
  }
  return {
    config: MQTT_SCALE_CONFIG,
    connect,
    disconnect,
    isConnected,
    setActiveScale,
    clearActiveScale,
    getLiveWeight,
    getState,
    getActiveMcId,
    publish,
    publishTare,
    onUpdate
  };
})();
window.MqttScale = MqttScale;
