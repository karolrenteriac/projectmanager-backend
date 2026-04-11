/** @type {import("socket.io").Server | null} */
let ioInstance = null;

module.exports = {
  /**
   * @param {import("socket.io").Server} io
   */
  setIo(io) {
    ioInstance = io;
  },
  getIo() {
    return ioInstance;
  },
};
