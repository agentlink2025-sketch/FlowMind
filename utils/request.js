const { BASE_URL } = require('./config');


function request(path, { method = 'POST', data = {}, headers = {} } = {}) {
return new Promise((resolve, reject) => {
wx.request({
url: `${BASE_URL}${path}`,
method,
data,
header: Object.assign({ 'Content-Type': 'application/json' }, headers),
timeout: 60000,
success: (res) => {
if (res.statusCode >= 200 && res.statusCode < 300) {
resolve(res.data);
} else {
reject({ message: res.data?.message || `HTTP ${res.statusCode}`, status: res.statusCode });
}
},
fail: (err) => reject(err)
});
});
}


module.exports = { request };