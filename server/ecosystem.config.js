module.exports = {
  apps: [{
    name: "fileshare-server",
    script: "./index.js",
    env: {
      NODE_ENV: "production",
      PORT: 5001
    }
  }]
}
